/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Fields module
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * A copy of the GNU General Public License is found in the textfile GPL.txt
 * and important notices to the license from the author is found in LICENSE.txt
 * distributed with these scripts.
 */

(function (window, $) {
	'use strict';

	if (window.MW_Pinboard && window.MW_Pinboard.Fields) {
		throw 'Namespace MW_Pinboard.Fields already occupied!';
	}

	var Events = window.MW_Pinboard.Events,
		Timer = window.MW_Pinboard.Timer,
		MouseMove = window.MW_Pinboard.MouseMove;

	// static object
	var Fields = {
		// parent container
		$pinboard: null,

		// map from setup names to real css classnames (abstract setup/storage content from css)
		fieldCssClasses: {
			clear: 'fieldBgClear',
			light: 'fieldBgLight',
			dark: 'fieldBgDark'
		},

		// field setup from board/storage, gets updated as fields changes, gets returned to board/storage
		fieldsSetup: null,

		// default setup for newly created fields
		newFieldDefaults: { title: 'Enter name', cssClass: 'clear', sizeFactor: 1.0 },

		// default fields setup if empty array given from board/storage (which should not happen btw.)
		fieldsDefaultSetup: [
			{ title: 'Enter name', cssClass: 'light', sizeFactor: 0.5 },
			{ title: 'Enter name', cssClass: 'clear', sizeFactor: 0.5 }
		],

		// internal storage for all jQuery objects, field index corresponds to fieldsSetup index
		// use to destroy all objects later
		fieldsObjects: [],

		// field changed debounce timer
		onChangeTimer: null
	};

	// must be called on dom ready
	Fields.init = function ($pinboard, fieldsSetup) {
		var self = this;

		this.$pinboard = $pinboard;

		this.onChangeTimer = new Timer(
			1000,
			function () {
				self.onFieldsChangedDebounced();
			},
			{ mode: 'debounce' }
		);

		// initial fieldsSetup
		if (fieldsSetup.length === 0) {
			// empty array given, fresh board
			// create new array/objects, do not overwrite fieldsDefaultSetup
			var fieldsDefaultSetup = this.fieldsDefaultSetup,
				defaultSetup,
				i,
				l;

			defaultSetup = new Array(l);
			l = this.fieldsDefaultSetup.length;
			for (i = 0; i < l; i += 1) {
				defaultSetup[i] = {
					title: fieldsDefaultSetup[i].title,
					cssClass: fieldsDefaultSetup[i].cssClass,
					sizeFactor: fieldsDefaultSetup[i].sizeFactor
				};
			}
			this.fieldsSetup = defaultSetup;
		} else {
			// fields given
			this.fieldsSetup = fieldsSetup;
		}

		this.initFields();
	};

	Fields.initFields = function () {
		var self = this,
			$pinboard = this.$pinboard,
			pinboardWidth = $pinboard.width(),
			pinboardHeight = $pinboard.height(),
			fieldCount = this.fieldsSetup.length,
			indexLast = fieldCount - 1,
			currentLeftPos;

		var i,
			w,
			segmentWidths = new Array(fieldCount),
			segmentWidthSum = 0;

		for (i = 0; i < fieldCount; i += 1) {
			w = Math.round(pinboardWidth * this.fieldsSetup[i].sizeFactor);
			segmentWidths[i] = w;
			segmentWidthSum += w;
		}
		// correct last field because of rounding errors
		segmentWidths[indexLast] = segmentWidths[indexLast] - (segmentWidthSum - pinboardWidth);

		currentLeftPos = 0;
		$.each(this.fieldsSetup, function (index , fieldSetup) {
			var isFirstField = (index === 0),
				isLastField = (index === indexLast),
				isSingleField = (indexLast === 0),
				title = fieldSetup.title,
				cssClass = self.fieldCssClasses[fieldSetup.cssClass],
				width = segmentWidths[index],
				left = currentLeftPos,
				$field,
				$head,
				$title,
				$eye,
				$divider = null,
				$remove,
				$add;

			// add current fields width to left position
			currentLeftPos += width;

			$title = $('<input type="text" value="' + title + '" />');
			$head = $('<div class="fieldName"></div>')
				.append($title);

			$eye = $('<div class="fieldIcon fieldEye" title="Change background"></div>');
			$add = $('<div class="fieldIcon fieldAdd" title="Add new column"></div>');

			// extra classes for first/last field to set rounded corners
			if (isFirstField) {
				cssClass += ' first';
			}
			if (isLastField) {
				cssClass += ' last';
			}

			$field = $('<div class="field ' + cssClass + '"></div>')
				.width(width)
				.height(pinboardHeight)
				.css('left', left + 'px')
				.append($head)
				.append($eye)
				.append($add);

			// dont add remove button if only 1 field left
			if (!isSingleField) {
				$remove = $('<div class="fieldIcon fieldRemove" title="Remove column"></div>');
				$field.append($remove);
			}

			// dont add divider button if last field
			if (!isLastField) {
				$divider = $('<div class="fieldIcon fieldDivider" title="Resize column"></div>');
				$field.append($divider);
			}

			// always add fields before (underneath) notes
			$pinboard.prepend($field);

			// store jQuery objects
			self.fieldsObjects.push({
				$field: $field,
				$divider: $divider,
				mouseMove: null
			});

			// setup event handler

			// icons
			$eye.on('click.mw_field', function () {
				self.onBgChange(index);
			});
			$add.on('click.mw_field', function () {
				self.onAddField(index);
			});
			if ($remove) {
				$remove.on('click.mw_field', function () {
					self.onRemoveField(index);
				});
			}

			// input
			$title.on('change.mw_field', function () {
				fieldSetup.title = $title.val();
				self.onTitleChange(index);
			});
		}); // $.each

		this.initFieldsDivider();
	}; // Fields.initFields

	Fields.initFieldsDivider = function () {
		var self = this,
			fieldsObjects = this.fieldsObjects,
			indexLast = fieldsObjects.length - 1,
			minFieldWidth = 180;

		$.each(fieldsObjects, function (index, fieldObject) {
			var $divider = fieldObject.$divider,
				$leftField,
				$rightField,
				mouseOldX,
				leftFieldOldW,
				rightFieldOldW,
				leftFieldOldOffset,
				rightFieldOldOffset;

			if (!$divider || index === indexLast) {
				return;
			}

			$leftField = fieldObject.$field;
			$rightField = fieldsObjects[index + 1].$field;

			fieldObject.mouseMove = new MouseMove({
				containerJQuery: $divider,
				callbackMoveBegin: function (left, top) {
					mouseOldX = left;
					leftFieldOldW = $leftField.width();
					rightFieldOldW = $rightField.width();
					leftFieldOldOffset = $leftField.offset();
					rightFieldOldOffset = $rightField.offset();
					// set new limits, 8 = 1/2 divider icon which overlaps next field
					this.config.minLeft = leftFieldOldOffset.left + minFieldWidth - 8;
					this.config.maxLeft = leftFieldOldOffset.left + leftFieldOldW + rightFieldOldW - minFieldWidth - 8;
				},
				callbackMoveStep: function (left, top) {
					var mouseDiffX = left - mouseOldX;

					$leftField.width(leftFieldOldW + mouseDiffX);
					$rightField
						.offset({left: rightFieldOldOffset.left + mouseDiffX, top: rightFieldOldOffset.top})
						.width(rightFieldOldW - mouseDiffX);
				},
				callbackMoveDone: function (left, top) {
					// the resize icon is right aligned, we have to remove the inline style left/top
					$divider.removeAttr('style');
					self.calcSizeFactors();
					self.onFieldsChanged();
				},
				minLeft: 0,
				maxLeft: 1920,
				fixedY: true
			});
		}); // $.each
	};

	Fields.onBgChange = function (index) {
		var $field = this.fieldsObjects[index].$field,
			oldClass = this.fieldsSetup[index].cssClass,
			newClass;

		switch (this.fieldsSetup[index].cssClass) {
			case 'clear':
				newClass = 'light';
				break;
			case 'light':
				newClass = 'dark';
				break;
			case 'dark':
				newClass = 'clear';
				break;
		}
		// update setup
		this.fieldsSetup[index].cssClass = newClass;

		// update DOM
		$field
			.removeClass(this.fieldCssClasses[oldClass])
			.addClass(this.fieldCssClasses[newClass]);

		this.onFieldsChanged();
	};

	Fields.onTitleChange = function (index) {
		// console.log('Fields.onTitleChange(' + index + ')');
		this.onFieldsChanged();
	};

	Fields.calcSizeFactors = function () {
		var pinboardWidth = this.$pinboard.width(),
			fieldsSetup = this.fieldsSetup,
			fieldsObjects = this.fieldsObjects;

		for (var i = 0, l = fieldsSetup.length; i < l; i += 1) {
			fieldsSetup[i].sizeFactor = fieldsObjects[i].$field.width() / pinboardWidth;
		}
	};

	Fields.onAddField = function (index) {
		var pinboardWidth = this.$pinboard.width(),
			fieldsSetup = this.fieldsSetup,
			fieldsObjects = this.fieldsObjects,
			fieldCount = fieldsSetup.length,
			corrFactor  = fieldCount / (fieldCount + 1),
			sizeFactorsSum = 0,
			i;

		// re-calc size factors with correction factor
		for (i = 0; i < fieldCount; i += 1) {
			fieldsSetup[i].sizeFactor = fieldsSetup[i].sizeFactor * corrFactor;
			sizeFactorsSum += fieldsSetup[i].sizeFactor;
		}

		// insert new field into this.fieldsSetup array with defaults from this.newFieldDefaults
		var newFieldSetup = {
			title: this.newFieldDefaults.title,
			cssClass: this.newFieldDefaults.cssClass,
			sizeFactor: 1.0 - sizeFactorsSum
		};

		if (index === fieldsSetup.length - 1) {
			// simple add
			this.fieldsSetup.push(newFieldSetup);
		} else {
			// insert
			this.fieldsSetup = [].concat(this.fieldsSetup.slice(0, index + 1), newFieldSetup, this.fieldsSetup.slice(index + 1));
		}

		// destroy all fields
		this.destroy();

		// re-init fields
		this.initFields();

		this.onFieldsChanged();
	};

	Fields.onRemoveField = function (index) {
		var pinboardWidth = this.$pinboard.width(),
			fieldsSetup = this.fieldsSetup,
			fieldsObjects = this.fieldsObjects,
			fieldCount = fieldsSetup.length,
			corrFactor  = fieldCount / (fieldCount - 1),
			i;

		// re-calc size factors with correction factor
		for (i = 0; i < fieldCount; i += 1) {
			fieldsSetup[i].sizeFactor = fieldsSetup[i].sizeFactor * corrFactor;
		}

		// remove field from this.fieldsSetup
		this.fieldsSetup.splice(index, 1);

		// destroy all fields
		this.destroy();

		// re-init fields
		this.initFields();

		this.onFieldsChanged();
	};

	Fields.onFieldsChanged = function () {
		this.onChangeTimer.start();
	};

	Fields.onFieldsChangedDebounced = function () {
		// emit global MW_Event for board to update db, fields setup as paramter
		Events.trigger('fieldsChanged', this.fieldsSetup);
	};

	Fields.destroy = function () {
		// remove fields from dom (note: jQuery.remove() removes all data and event handler too!)
		var self = this,
			$pinboard = this.$pinboard;

		$.each(this.fieldsObjects, function (index, fieldObject) {
			if (fieldObject.mouseMove) {
				fieldObject.mouseMove.destroy();
				fieldObject.mouseMove = null;
			}
			fieldObject.$divider = null;
			fieldObject.$field.remove();
			fieldObject.$field = null;
		});

		this.fieldsObjects = [];
	};

	// checks if given dom node is one of our fields
	Fields.isFieldNode = function (node) {
		var fieldsObjects = this.fieldsObjects,
			fieldCount = fieldsObjects.length,
			i;

		for (i = 0; i < fieldCount; i += 1) {
			if (fieldsObjects[i].$field[0] === node) {
				return true;
			}
		}
		return false;
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Fields = Fields;
}(window, jQuery));

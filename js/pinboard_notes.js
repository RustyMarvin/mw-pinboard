/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Notes module
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

	if (window.MW_Pinboard && window.MW_Pinboard.Note) {
		throw 'Namespace MW_Pinboard.Note already occupied!';
	}

	var Events = window.MW_Pinboard.Events,
		Timer = window.MW_Pinboard.Timer,
		MouseMove = window.MW_Pinboard.MouseMove,
		MouseResize = window.MW_Pinboard.MouseResize;

	// constructor
	var Note = function ($pinboard, params) {
		var self = this;

		// params
		this.id = params.id; // PK note
		this.boardId = params.boardId; // FK board
		this.title = params.title;
		this.text = params.text;
		this.color = params.color;
		this.left = params.left;
		this.top = params.top;
		this.width = params.width;
		this.height = params.height;
		this.zIndex = params.zIndex;

		this.$pinboard = $pinboard;
		this.pinboardOffset = $pinboard.offset();

		this.mouseMove = undefined;
		this.mouseResize = undefined;

		// onChange event debounce timer
		this.onChangeTimer = new Timer(1000, function () {
			self.onNoteChangedDebounced();
		}, { mode: 'debounce' });

		// create note element
		this.$note = $('<div class="note" id="' + params.id + '">')
			.data('noteId', params.id)
			.css({
				'z-index': this.zIndex,
				'left': this.left,
				'top': this.top,
				'width': this.width,
				'height': this.height
			});
		this.$noteTitle = $('<input type="text" value="' + params.title + '">')
			.css('background-color', params.color)
			.width(this.width - 8);
		this.$noteText = $('<textarea>' + params.text + '</textarea>')
			.width(this.width - 8)
			.height(this.height - 34);
		this.$noteClose = $('<div class="noteClose" title="close"></div>');
		this.$noteResize = $('<div class="noteResize"></div>');
		this.$noteMove = $('<div class="notePin"></div>');

		this.$note.append(this.$noteTitle)
			.append(this.$noteText)
			.append(this.$noteClose)
			.append(this.$noteResize)
			.append(this.$noteMove);

		this.$pinboard.append(this.$note);

		// mouse move/resize --------------------------------------------------

		// state var to differentiate between begin move/begin edit
		var moveBegin = false;

		var moveOpts = {
			containerJQuery: this.$note,
			// moveTriggerJQuery: this.$noteTitle,
			moveTriggerJQuery: this.$noteMove,
			parentJQuery: this.$pinboard,
			// 'this' points to the instance
			// left/top are absolute coordinates!, we have to subtract container offset if necessary!
			callbackMoveStep: function (left, top) {
				// moving element should cancel 'edit' (focus)
				if (!moveBegin) {
					moveBegin = true;
					self.$noteTitle.blur();
					// self.$noteText.blur();
					// this.$container.addClass('moving');
				}
			},
			callbackMoveDone: function (left, top) {
				moveBegin = false;
				this.$container.removeClass('moving');
				if (this.posChanged) {
					self.left = left - self.pinboardOffset.left;
					self.top = top - self.pinboardOffset.top;
					self.onNoteChanged();
				}
			},
			dynamicParent: true
		};
		var resizeOpts = {
			containerJQuery: this.$note,
			resizeTriggerJQuery: this.$noteResize,
			parentJQuery: this.$pinboard,
			// 'this' points to the instance
			callbackResizeBegin: function (width, height) {
				// because of e.preventDefault() and e.stopPropagation() to avoid ugly behaviour
				// the note.mouseDown event never fires if click on resize icon,
				// therefore we have to signal 'note selected' here manually
				self.onMousedown();
			},
			callbackResizeStep: function (width, height) {
				// TODO: static padding, use .outerWidth() or sth. at init time
				self.$noteTitle.width(width - 8);
				self.$noteText.width(width - 8);
				self.$noteText.height(height - 34);
			},
			callbackResizeDone: function (width, height) {
				if (this.sizeChanged) {
					self.width = width;
					self.height = height;
					self.onNoteChanged();
				}
			},
			dynamicParent: true,
			minWidth: 170,
			minHeight: 90
		};

		// create instances
		this.mouseMove = new MouseMove(moveOpts);
		this.mouseResize = new MouseResize(resizeOpts);

		// register note select
		this.$note.on('mousedown.mw_note', function () {
			self.onMousedown();
		});

		// register title/text changed events
		// TODO: the form element has to loose focus for the change to be detected, keyup as alternative ???
		this.$noteTitle.on('change.mw_note', function () {
			self.title = self.$noteTitle.val();
			self.onNoteChanged();
		});
		this.$noteText.on('change.mw_note', function () {
			self.text = self.$noteText.val();
			self.onNoteChanged();
		});

		// register close
		this.$noteClose.on('click.mw_note', function () {
			self.onClose();
		});

	};

	Note.prototype.getParams = function () {
		return {
			id: this.id,
			boardId: this.boardId,
			title: this.title,
			text: this.text,
			color: this.color,
			left: this.left,
			top: this.top,
			width: this.width,
			height: this.height,
			zIndex: this.zIndex
		};
	};

	Note.prototype.setZIndex = function (zIndex, preventUpdateEvent) {
		this.zIndex = zIndex;
		this.$note.css('z-index', zIndex);
		if (preventUpdateEvent) {
			return;
		}
		this.onChangeTimer.start();
	};

	Note.prototype.setPos = function (left, top, preventUpdateEvent) {
		this.left = left;
		this.top = top;
		this.$note.css({ 'left': this.left,  'top': this.top });
		if (preventUpdateEvent) {
			return;
		}
		this.onChangeTimer.start();
	};

	Note.prototype.onMousedown = function () {
		Events.trigger('noteSelected', this);
	};

	Note.prototype.onNoteChanged = function () {
		this.onChangeTimer.start();
	};

	Note.prototype.onNoteChangedDebounced = function () {
		Events.trigger('noteChanged', this);
	};

	Note.prototype.onClose = function () {
		this.onChangeTimer.stop();
		this.destroy();
		Events.trigger('noteClosed', this);
	};

	Note.prototype.destroy = function () {
		// de-register all own handler (isnt really necessary, because jQuery.remove() removes data and event handler too)
		this.$note.off('.mw_note');
		this.$noteTitle.off('.mw_note');
		this.$noteText.off('.mw_note');
		this.$noteClose.off('.mw_note');

		// call destroy methods on move/resize objects
		this.mouseMove.destroy();
		this.mouseResize.destroy();

		// delete html from dom
		this.$note.remove();
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Note = Note;
}(window, jQuery));

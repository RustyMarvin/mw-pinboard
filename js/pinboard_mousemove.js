/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * MouseMove module
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

	if (window.MW_Pinboard && window.MW_Pinboard.MouseMove) {
		throw 'Namespace MW_Pinboard.MouseMove already occupied!';
	}

	// Constructor
	var MouseMove = function (options) {
		var self = this;

		this.config = {
			// mandatory, selector or jQuery object for the element that should be moveable
			containerSelector: '',
			containerJQuery: undefined,

			// optional, selector or jQuery object for the move handle, if omitted, the whole element is the handle
			moveTriggerSelector: '',
			moveTriggerJQuery: undefined,

			// optional, selector or jQuery object for a parent element that defines the boundaries to constrain the movement
			parentSelector: '',
			parentJQuery: undefined,

			// optional, class added to the moveable element on mouseover
			containerHoverClass: '',

			// optional
			callbackMoveBegin: undefined,
			callbackMoveStep: undefined,
			callbackMoveDone: undefined,

			// set this to true if parent containers size or position changes
			dynamicParent: false,

			// optional, modifications after initialization still respected
			fixedX: false,
			fixedY: false,
			gridX: 0,
			gridY: 0,
			minLeft: 0,
			minTop: 0,
			maxLeft: 1920,
			maxTop: 1920
		};

		$.extend(this.config, options || {});

		// config/options checks
		if (typeof this.config.containerSelector !== 'string') {
			throw 'MouseMove: No valid option "containerSelector" given!';
		}
		if (this.config.callbackMoveBegin && typeof this.config.callbackMoveBegin !== 'function') {
			throw 'MouseMove: Option "callbackMoveBegin" is not a function!';
		}
		if (this.config.callbackMoveStep && typeof this.config.callbackMoveStep !== 'function') {
			throw 'MouseMove: Option "callbackMoveStep" is not a function!';
		}
		if (this.config.callbackMoveDone && typeof this.config.callbackMoveDone !== 'function') {
			throw 'MouseMove: Option "callbackMoveDone" is not a function!';
		}

		this.$container = undefined;
		this.$moveTrigger = undefined;
		this.$parentContainer = undefined;
		this.parentDimensions = undefined;

		this.posChanged = false;

		$(window.document).ready(function () {
			self.initDomReady();
		});
	};

	MouseMove.prototype.initDomReady = function () {
		var $container,
			$moveTrigger,
			$parentContainer;

		// container
		if (this.config.containerJQuery && this.config.containerJQuery.jquery === $.fn.jquery) {
			// got a jquery matched set
			$container = this.config.containerJQuery;
			if ($container.length === 0) {
				throw 'MouseMove: Empty container jQuery object given!';
			}
		} else {
			$container = $(this.config.containerSelector).first();
			if ($container.length === 0) {
				throw 'MouseMove: No html element for selector "' + this.config.containerSelector + '" found!';
			}
		}

		// trigger
		if (this.config.moveTriggerJQuery && this.config.moveTriggerJQuery.jquery === $.fn.jquery) {
			// got a jquery matched set
			$moveTrigger = this.config.moveTriggerJQuery;
			if ($moveTrigger.length === 0) {
				throw 'MouseMove: Empty moveTrigger jQuery object given!';
			}
		} else if (this.config.moveTriggerSelector) {
			$moveTrigger = $(this.config.moveTriggerSelector, $container).first();
			if ($moveTrigger.length === 0) {
				throw 'MouseMove: No html element for move trigger selector "' + this.config.moveTriggerSelector + '" found!';
			}
		} else {
			// container is trigger
			$moveTrigger = $container;
		}

		// parent
		if (this.config.parentJQuery && this.config.parentJQuery.jquery === $.fn.jquery) {
			// got a jquery matched set
			$parentContainer = this.config.parentJQuery;
			if ($parentContainer.length === 0) {
				throw 'MouseMove: Empty parentContainer jQuery object given!';
			}
		} else if (this.config.parentSelector) {
			$parentContainer = $(this.config.parentSelector).first();
			if ($parentContainer.length === 0) {
				throw 'MouseMove: No html element for parent container selector "' + this.config.parentSelector + '" found!';
			}
		} else {
			$parentContainer = $(window.document);
		}

		// test if mouse move already attached
		if (this.hasEvent($moveTrigger, 'mousedown', 'mw_mousemove')) {
			throw 'MouseMove: Event handler already attached!';
		}

		// check css of moveable element
		if ($container.css('position') !== 'absolute') {
			$container.css('position', 'absolute');
		}

		this.$container = $container;
		this.$moveTrigger = $moveTrigger;
		this.$parentContainer = $parentContainer;
		// we have to create the dimensions object with $.extend, because
		// if we use window.document as $parentContainer, .offset() returns <null>
		this.parentDimensions = $.extend(
			{ left: 0, top: 0, width: $parentContainer.width(), height: $parentContainer.height() },
			$parentContainer.offset()
		);

		this._initHandler();
	};

	MouseMove.prototype._initHandler = function () {
		var self = this,
			$document = $(window.document),
			$parentContainer = this.$parentContainer,
			$container = this.$container,
			$moveTrigger = this.$moveTrigger,
			// throttle timer to reduce 'mousemove' event handler workload
			throttleTimerId = 0,
			throttleTimerFunc = function () {
				throttleTimerId = 0;
			},
			throttleTimerStart = function () {
				throttleTimerId = window.setTimeout(throttleTimerFunc, 17);
			},
			// move
			mousemoveHandler,
			mousedownHandler,
			mouseupHandler,
			startX = 0,
			startY = 0,
			containerOffset,
			newOffset = { left: 0, top: 0 },
			// scope chain shortcuts
			config = this.config,
			parentDimensions = this.parentDimensions;

		mousemoveHandler = function (e) {
			var deltaX,
				deltaY,
				newLeft,
				newTop;

			if (throttleTimerId) {
				return;
			}

			// fixed x
			if (config.fixedX) {
				newLeft = containerOffset.left;
			} else {
				deltaX = e.pageX - startX;
				newLeft = containerOffset.left + deltaX;
				if (config.gridX) {
					newLeft = Math.round(newLeft / config.gridX) * config.gridX;
				}
				newLeft = Math.min(config.maxLeft, Math.max(config.minLeft, newLeft));
			}

			// fixed y
			if (config.fixedY) {
				newTop = containerOffset.top;
			} else {
				deltaY = e.pageY - startY;
				newTop = containerOffset.top + deltaY;
				if (config.gridY) {
					newTop = Math.round(newTop / config.gridY) * config.gridY;
				}
				newTop = Math.min(config.maxTop, Math.max(config.minTop, newTop));
			}

			if (newOffset.left === newLeft && newOffset.top === newTop) {
				// throttle mousemove events even if dom untouched
				throttleTimerStart();
				return;
			}

			// .offset() gets integers as opposed to .css() which gets strings like '123px'
			newOffset.left = newLeft;
			newOffset.top = newTop;
			$container.offset(newOffset);

			if (config.callbackMoveStep) {
				config.callbackMoveStep.call(self, newOffset.left, newOffset.top);
			}

			throttleTimerStart();
		};

		mousedownHandler = function (e) {
			startX = e.pageX;
			startY = e.pageY;

			e.preventDefault();
			// e.stopPropagation();

			// measure parent dimensions again
			if (config.dynamicParent) {
				$.extend(
					parentDimensions, // extends this.parentDimensions!
					{ width: $parentContainer.width(), height: $parentContainer.height() },
					$parentContainer.offset()
				);
			}

			// initial offset is container offset (deltaX/Y = 0)
			containerOffset = $container.offset();
			newOffset.left = containerOffset.left;
			newOffset.top = containerOffset.top;

			// adjust constraints according to parent and own width/height
			config.minLeft = parentDimensions.left;
			config.minTop = parentDimensions.top;
			config.maxLeft = parentDimensions.left + parentDimensions.width - $container.outerWidth();
			config.maxTop = parentDimensions.top + parentDimensions.height - $container.outerHeight();

			if (config.callbackMoveBegin) {
				config.callbackMoveBegin.call(self, newOffset.left, newOffset.top);
			}

			$document.one('mouseup.mw_mousemove', mouseupHandler);
			$document.on('mousemove.mw_mousemove', mousemoveHandler);
		};

		mouseupHandler = function () {
			$document.off('mousemove.mw_mousemove');

			self.posChanged = (containerOffset.left !== newOffset.left || containerOffset.top !== newOffset.top);

			// copy last set position as new starting position
			/* OBSOLETE, offset gets calculated on every 'mouseDown' event
			containerOffset.left = newOffset.left;
			containerOffset.top = newOffset.top;
			*/

			if (config.callbackMoveDone) {
				config.callbackMoveDone.call(self, newOffset.left, newOffset.top);
			}
		};

		$moveTrigger.on('mousedown.mw_mousemove', mousedownHandler);

		if (config.containerHoverClass) {
			$container.on('mouseenter.mw_mousemove', function () {
				$container.addClass(config.containerHoverClass);
			});
			$container.on('mouseleave.mw_mousemove', function () {
				$container.removeClass(config.containerHoverClass);
			});
		}
	};

	MouseMove.prototype.destroy = function () {
		// remove all handler with own namespace
		this.$moveTrigger.off('.mw_mousemove');
		if (this.config.containerHoverClass) {
			this.$container.off('.mw_mousemove');
		}
	};

	// does not work with jQuery 1.8
	MouseMove.prototype.hasEvent = function (jqueryObj, event, namespace) {
		var events = jqueryObj.data('events'),
			hasEvent = false;

		if (events && events[event]) {
			if (!namespace) {
				// event found
				return true;
			}
			$.each(events[event], function (index, elem) {
				if (elem.namespace === namespace) {
					hasEvent = true;
					return false;
				}
			});
		}

		return hasEvent;
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.MouseMove = MouseMove;
}(window, jQuery));

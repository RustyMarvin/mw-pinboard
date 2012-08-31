/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * MouseResize module
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

	if (window.MW_Pinboard && window.MW_Pinboard.MouseResize) {
		throw 'Namespace MW_Pinboard.MouseResize already occupied!';
	}

	// Constructor
	var MouseResize = function (options) {
		var self = this;

		this.config = {
			// mandatory, selector or jQuery object for the element that should be resizeable
			containerSelector: '',
			containerJQuery: undefined,

			// mandatory, selector or jQuery object for the resize handle
			resizeTriggerSelector: '',
			resizeTriggerJQuery: undefined,

			// optional, selector  or jQuery objectfor a parent element that defines the boundaries to constrain the dimensions
			parentSelector: '',
			parentJQuery: undefined,

			// optional, class added to the resizeable element on mouseover
			containerHoverClass: undefined,

			// optional
			callbackResizeBegin: undefined,
			callbackResizeStep: undefined,
			callbackResizeDone: undefined,

			// set this to true if parent containers size or position changes
			dynamicParent: false,

			// optional, modifications after initialization still respected
			fixedW: false,
			fixedH: false,
			keepAspectRatio: false,
			minWidth: 32,
			minHeight: 32,
			maxWidth: 1920,
			maxHeight: 1920
		};

		$.extend(this.config, options || {});

		// config/options checks
		if (typeof this.config.containerSelector !== 'string') {
			throw 'MouseResize: No valid option "containerSelector" given!';
		}
		if (this.config.callbackResizeBegin && typeof this.config.callbackResizeBegin !== 'function') {
			throw 'MouseResize: Option "callbackResizeBegin" is not a function!';
		}
		if (this.config.callbackResizeStep && typeof this.config.callbackResizeStep !== 'function') {
			throw 'MouseResize: Option "callbackResizeStep" is not a function!';
		}
		if (this.config.callbackResizeDone && typeof this.config.callbackResizeDone !== 'function') {
			throw 'MouseResize: Option "callbackResizeDone" is not a function!';
		}

		this.$container = undefined;
		this.$resizeTrigger = undefined;
		this.$parentContainer = undefined;
		this.parentDimensions = undefined;

		this.sizeChanged = false;

		$(window.document).ready(function () {
			self.initDomReady();
		});
	};

	MouseResize.prototype.initDomReady = function () {
		var $container,
			$resizeTrigger,
			$parentContainer,
			parentDimensions;

		// container
		if (this.config.containerJQuery && this.config.containerJQuery.jquery === $.fn.jquery) {
			// got a jquery matched set
			$container = this.config.containerJQuery;
			if ($container.length === 0) {
				throw 'MouseResize: Empty container jQuery object given!';
			}
		} else {
			$container = $(this.config.containerSelector).first();
			if ($container.length === 0) {
				throw 'MouseResize: No html element for selector "' + this.config.containerSelector + '" found!';
			}
		}

		// trigger
		if (this.config.resizeTriggerJQuery && this.config.resizeTriggerJQuery.jquery === $.fn.jquery) {
			// got a jquery matched set
			$resizeTrigger = this.config.resizeTriggerJQuery;
			if ($resizeTrigger.length === 0) {
				throw 'MouseResize: Empty resizeTrigger jQuery object given!';
			}
		} else {
			$resizeTrigger = $(this.config.resizeTriggerSelector, $container).first();
			if ($resizeTrigger.length === 0) {
				throw 'MouseResize: No html element for resize trigger selector "' + this.config.moveTriggerSelector + '" found!';
			}
		}

		// parent
		if (this.config.parentJQuery && this.config.parentJQuery.jquery === $.fn.jquery) {
			// got a jquery matched set
			$parentContainer = this.config.parentJQuery;
			if ($parentContainer.length === 0) {
				throw 'MouseResize: Empty parentContainer jQuery object given!';
			}
		} else if (this.config.parentSelector) {
			$parentContainer = $(this.config.parentSelector).first();
			if ($parentContainer.length === 0) {
				throw 'MouseResize: No html element for parent container selector "' + this.config.parentSelector + '" found!';
			}
		} else {
			$parentContainer = $(window.document);
		}

		// test if mouse move already attached
		if (this.hasEvent($resizeTrigger, 'mousedown', 'mw_mouseresize')) {
			throw 'MouseResize: Event handler already attached!';
		}

		this.$container = $container;
		this.$resizeTrigger = $resizeTrigger;
		this.$parentContainer = $parentContainer;
		// we have to create the dimensions object with $.extend, because
		// if we use window.document as $parentContainer, .offset() returns <null>
		this.parentDimensions = $.extend(
			{ left: 0, top: 0, width: $parentContainer.width(), height: $parentContainer.height() },
			$parentContainer.offset()
		);

		this._initHandler();
	};

	MouseResize.prototype._initHandler = function () {
		var self = this,
			$document = $(window.document),
			$parentContainer = this.$parentContainer,
			$container = this.$container,
			$resizeTrigger = this.$resizeTrigger,
			// throttle timer to reduce 'mousemove' event handler workload
			throttleTimerId = 0,
			throttleTimerFunc = function () {
				throttleTimerId = 0;
			},
			throttleTimerStart = function () {
				throttleTimerId = window.setTimeout(throttleTimerFunc, 17);
			},
			// resize
			mousemoveHandler,
			mousedownHandler,
			mouseupHandler,
			startX = 0,
			startY = 0,
			containerWidth = 0,
			containerHeight = 0,
			newWidth = 0,
			newHeight = 0,
			aspectRatio = 0,
			// scope chain shortcuts
			config = this.config,
			parentDimensions = this.parentDimensions;

		mousemoveHandler = function (e) {
			var deltaX,
				deltaY;

			if (throttleTimerId) {
				return;
			}

			// fixed w
			if (config.fixedW) {
				newWidth = containerWidth;
			} else {
				deltaX = e.pageX - startX;
				newWidth = Math.min(config.maxWidth, Math.max(config.minWidth, containerWidth + deltaX));
			}

			// fixed h
			if (config.fixedH) {
				newHeight = containerHeight;
			} else {
				deltaY = (config.keepAspectRatio) ? Math.round(deltaX / aspectRatio) : e.pageY - startY;
				newHeight = Math.min(config.maxHeight, Math.max(config.minHeight, containerHeight + deltaY));
			}

			if (newWidth === containerWidth && newHeight === containerHeight) {
				// throttle mousemove events even if dom untouched
				throttleTimerStart();
				return;
			}

			$container.width(newWidth).height(newHeight);

			if (config.callbackResizeStep) {
				config.callbackResizeStep.call(self, newWidth, newHeight);
			}

			throttleTimerStart();
		};

		mousedownHandler = function (e) {
			var p,
				ex,
				ey;

			startX = e.pageX;
			startY = e.pageY;

			e.preventDefault();
			e.stopPropagation();

			// measure parent dimensions again
			if (config.dynamicParent) {
				$.extend(
					parentDimensions, // extends this.parentDimensions!
					{ width: $parentContainer.width(), height: $parentContainer.height() },
					$parentContainer.offset()
				);
			}

			// initial width/height is container width/height
			containerWidth = $container.width();
			containerHeight = $container.height();
			newWidth = containerWidth;
			newHeight = containerHeight;

			aspectRatio = containerWidth / containerHeight;

			// adjust constraints according to parent
			p = $container.position(); // rel to parent
			ex = $container.outerWidth() - newWidth; // extra adjustment for containers padding/border (bad container css)
			ey = $container.outerHeight() - newHeight;

			config.maxWidth = parentDimensions.width - p.left - ex;
			config.maxHeight = parentDimensions.height - p.top - ey;

			if (config.callbackResizeBegin) {
				config.callbackResizeBegin.call(self, newWidth, newHeight);
			}

			$document.one('mouseup', mouseupHandler);
			$document.on('mousemove', mousemoveHandler);
		};

		mouseupHandler = function () {
			$document.off('mousemove', mousemoveHandler);

			self.sizeChanged = (containerWidth !== newWidth || containerHeight !== newHeight);

			// copy current size as new starting size
			containerWidth = newWidth;
			containerHeight = newHeight;

			if (config.callbackResizeDone) {
				config.callbackResizeDone.call(self, newWidth, newHeight);
			}
		};

		$resizeTrigger.on('mousedown.mw_mouseresize', mousedownHandler);

		if (config.containerHoverClass) {
			$container.on('mouseenter.mw_mouseresize', function () {
				$container.addClass(config.containerHoverClass);
			});
			$container.on('mouseleave.mw_mouseresize', function () {
				$container.removeClass(config.containerHoverClass);
			});
		}
	};

	MouseResize.prototype.destroy = function () {
		// remove all handler with own namespace
		this.$resizeTrigger.off('.mw_mouseresize');
		if (this.config.containerHoverClass) {
			this.$container.off('.mw_mouseresize');
		}
	};

	MouseResize.prototype.hasEvent = function (jqueryObj, event, namespace) {
		// .data('events') removed in jQuery 1.8, instead use $._data(element, 'events') which works in 1.7 too
		var events = $._data(jqueryObj, 'events'),
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
	window.MW_Pinboard.MouseResize = MouseResize;
}(window, jQuery));

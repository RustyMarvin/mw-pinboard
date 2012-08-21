/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Timer module
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

(function (window) {
	'use strict';

	if (window.MW_Pinboard && window.MW_Pinboard.Timer) {
		throw 'Namespace MW_Pinboard.Timer already occupied!';
	}

	/**
	 * The timer class provides a more convenient interface to the standard js timer function
	 * The interval has the advantage of being implemented using the setTimeout() function to avoid stacking of events.
	 * @param {number}   timeout   The time after which the timer calls the callback function.
	 * @param {function} callback  The callback function that is called when the timer event occurs.
	 * @param {object}   [options] Options that define the timers type and behaviour.
	 *                             {type: 'timeout'(default) or 'interval', mode: 'throttle'(default) or 'debounce'}
	 * @constructor
	 */
	var Timer = function (timeout, callback, options) {
		this.callback = callback;
		this.timeout = timeout;

		this.type = (options && options.type) || 'timeout'; // 'timeout' or 'interval'
		this.mode = (options && options.mode) || 'throttle'; // 'throttle' or 'debounce'

		if (this.type !== 'timeout' && this.type !== 'interval') {
			throw 'Timer: unknown type option "' + this.type + '" given!';
		}
		if (this.mode !== 'throttle' && this.mode !== 'debounce') {
			throw 'Timer: unknown mode option "' + this.mode + '" given!';
		}

		this.timerId = 0;
		this.isActive = false;

		// A garbage collector friendly timer callback.
		// Instead of creating an anonymous function at every setTimeout(), we create an
		// instance tick function with a closure and re-use it on every setTimeout call.
		// s.a.: http://www.scirra.com/blog/76/how-to-write-low-garbage-real-time-javascript
		this.tickFunc = (function (self) {
			return function () {
				self.tick();
			};
		}(this));
	};

	Timer.prototype.start = function () {
		if (this.mode === 'debounce' && this.isActive) {
			this.stop();
		}

		if (!this.isActive) {
			this.timerId = window.setTimeout(this.tickFunc, this.timeout);
			this.isActive = true;
		}
	};

	Timer.prototype.tick = function () {
		this.timerId = 0;

		if (this.type === 'interval') {
			this.timerId = window.setTimeout(this.tickFunc, this.timeout);
		} else {
			this.isActive = false;
		}

		this.callback();
	};

	Timer.prototype.stop = function () {
		if (this.isActive) {
			window.clearTimeout(this.timerId);
			this.timerId = 0;
			this.isActive = false;
		}
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Timer = Timer;
}(window));

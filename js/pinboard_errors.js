/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Errors module
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

	if (window.MW_Pinboard && window.MW_Pinboard.Errors) {
		throw 'Namespace MW_Pinboard.Errors already occupied!';
	}

	var PinboardError = function (message, nr) {
		this.name = 'PinboardError';
		this.message = message || 'PinboardError';
		this.nr = nr || Errors.STATUS_UNKNOWN;
	};
	PinboardError.prototype = new Error();
	PinboardError.prototype.constructor = PinboardError;

	var Errors = {
		// error codes shared with the server
		STATUS_UNKNOWN: 0,
		STATUS_OK: 1,
		STATUS_NO_SESSION: 2,
		STATUS_INVALID_JSON: 3,
		STATUS_INVALID_ID: 4,
		STATUS_INVALID_VALUE: 5,
		STATUS_DB_ERROR: 6,
		STATUS_NO_UPDATE: 7,
		STATUS_VALUE_EMPTY: 8,
		STATUS_VALUE_EXISTS: 9,
		STATUS_AJAX_ERROR: 10,

		// own error object
		PinboardError: PinboardError
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Errors = Errors;
}(window));

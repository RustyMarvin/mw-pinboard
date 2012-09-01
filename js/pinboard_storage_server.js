/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Storage module / server storage
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

	if (window.MW_Pinboard && window.MW_Pinboard.StorageServer) {
		throw 'Namespace MW_Pinboard.StorageServer already occupied!';
	}

	var Errors = window.MW_Pinboard.Errors,
		PinboardError = Errors.PinboardError;

	// encryption
	var Crypt = window.GibberishAES,
		secret = '',
		decryptNote = function (noteObj) {
			if (!secret) {
				throw new PinboardError('Storage: decryptNote: No secret set!');
			}

			noteObj.title = Crypt.dec(noteObj.title, secret);
			noteObj.text = Crypt.dec(noteObj.text, secret);
		},
		encryptNote = function (noteObj) {
			if (!secret) {
				throw new PinboardError('Storage: encryptNote: No secret set!');
			}

			noteObj.title = Crypt.enc(noteObj.title, secret);
			noteObj.text = Crypt.enc(noteObj.text, secret);
		};

	// server stuff
	var serverRequest = function (url, data, callback) {
		console.log('>> serverRequest: ' + url);

		$.ajax({
			type: 'POST',
			url: url,
			cache: false,
			data: data,
			dataType: 'json',
			success: function (data, textStatus) {
				console.log('>> success: ', data);

				// textStatus: 'success' (always?)
				// data: { err: <null | error object>, data: <result data: null | number | object | array> }
				if (data.err) {
					callback(new PinboardError(data.err.message, data.err.nr), null);
				} else {
					callback(null, data.data);
				}
			},
			error: function (jqXHR, textStatus, errorThrown) {
				console.log('>> error: ', data);

				// textStatus: 'error', 'timeout', 'abort', 'parsererror'
				// errorThrown: on HTTP error the textual portion of the HTTP status, e.g. 'Not Found', 'Internal Server Error'
				// if server not responding, errorThrown is ''
				callback(new PinboardError(textStatus + ': ' + errorThrown, Errors.STATUS_AJAX_ERROR), null);
			}
		});
	};

	// static object
	var Storage = {
		userCached: null,
		boardCached: null
	};

	Storage.init = function (callback) {
		// test the server connection


	};

	// crypt ------------------------------------------------------------------

	Storage.setSecret = function (s) {
		secret = s || '';
	};

	// user -------------------------------------------------------------------

	// for local storage, this simply returns a default object with empty fields
	// for server version, this returnes the current user
	Storage.getCurrentUser = function (callback) {
		var url = '/pinboard/user/get-current',
			data = { id: '0' }; // unused yet

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	// board ------------------------------------------------------------------

	// for local storage, this simply returns the only board that is stored
	// for server version, this returnes the currently selected board
	Storage.getCurrentBoard = function (callback) {
		var url = '/pinboard/board/get-current',
			data = { id: '0' }; // unused yet

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	Storage.insertBoard = function (board, callback) {
		throw new PinboardError('Storage: insertBoard not implemented in server library!');
	};

	Storage.updateBoard = function (board, callback) {

	};

	Storage.updateBoardsTitle = function (board, callback) {

	};

	Storage.updateBoardsFields = function (board, callback) {

	};

	// local storage: simply delete all 'pinboard_' id keys
// server: we MUST not delete board with ajax, else we loose the session board data
//         and can not easily select another board
//         s.a. comments in app_routes_pinboard.js
	Storage.deleteBoard = function (id, callback) {
		throw new PinboardError('Storage: deleteBoard not implemented in server library!');
	};

	// notes ------------------------------------------------------------------

	// for local storage, this simply returns all notes ignoring the board id
	Storage.getNotesByBoardId = function (boardId, callback) {

	};

	Storage.insertNote = function (note, callback) {

	};

	Storage.updateNote = function (note, callback) {

	};

	Storage.deleteNote = function (id, callback) {

	};

	Storage.updateNotesList = function (notesList, callback) {

	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.StorageServer = Storage;
}(window, jQuery));

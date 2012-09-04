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

	// universal ajax request
	var serverRequest = function (url, data, callback) {
		$.ajax({
			type: 'POST',
			url: url,
			cache: false,
			data: data,
			dataType: 'json',
			success: function (data, textStatus) {
				// textStatus: 'success' (always?)
				// data: { err: <null | error object>, data: <result data: null | number | object | array> }
				if (data.err) {
					callback(new PinboardError(data.err.message, data.err.nr), null);
					return;
				}
				callback(null, data.data);
			},
			error: function (jqXHR, textStatus, errorThrown) {
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

	// As opposed to local storage lib, there is no 'init' needed.
	// We test the server connection by simply requesting the current user and board
	Storage.init = function (callback) {
		var self = this;

		self.getCurrentUser(function (err, user) {
			if (!err) {
				self.userCached = user;
			}

			self.getCurrentBoard(function (err, board) {
				if (!err) {
					self.boardCached = board;
				}

				callback(null);
			});
		});
	};

	// crypt ------------------------------------------------------------------

	Storage.setSecret = function (s) {
		secret = s || '';
	};

	// user -------------------------------------------------------------------

	Storage.getCurrentUser = function (callback) {
		var url = '/pinboard/user/get-current',
			data = { id: '0' }; // unused yet

		if (this.userCached) {
			callback(null, this.userCached);
			return;
		}

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	// board ------------------------------------------------------------------

	// This returnes the currently selected board from servers session
	Storage.getCurrentBoard = function (callback) {
		var url = '/pinboard/board/get-current',
			data = { id: '0' }; // unused yet

		if (this.boardCached) {
			callback(null, this.boardCached);
			return;
		}

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	// not needed for server mode
	// default board created before displaying pinboard page
	Storage.insertBoard = function (board, callback) {
		throw new PinboardError('Storage: insertBoard not implemented in server library!');
	};

	// updates: title, desc, fields, encryption, width, height
	Storage.updateBoard = function (board, callback) {
		var url = '/pinboard/board/update',
			data = { board: JSON.stringify(board) };

		this.boardCached = null;

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	// updates: title, desc
	Storage.updateBoardsTitle = function (board, callback) {
		var url = '/pinboard/board/update-title',
			data = { board: JSON.stringify(board) };

		this.boardCached = null;

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	// updates: fields
	Storage.updateBoardsFields = function (board, callback) {
		var url = '/pinboard/board/update-fields',
			data = { board: JSON.stringify(board) };

		this.boardCached = null;

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	// local storage: simply delete all 'pinboard_' id keys
// server: we MUST not delete board with ajax, else we loose the session board data
//         and can not easily select another board
//         s.a. comments in app_routes_pinboard.js
	Storage.deleteBoard = function (id, callback) {
		throw new PinboardError('Storage: deleteBoard not implemented in server library!');
	};

	// notes ------------------------------------------------------------------

	Storage.getNotesByBoardId = function (id, callback) {
		var url = '/pinboard/note/get-list',
			data = { id: id };

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	Storage.insertNote = function (note, callback) {
		var url = '/pinboard/note/create',
			data = { note: JSON.stringify(note) };

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	Storage.updateNote = function (note, callback) {
		var url = '/pinboard/note/update',
			data = { note: JSON.stringify(note) };

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	Storage.deleteNote = function (id, callback) {
		var url = '/pinboard/note/delete',
			data = { id: id };

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	Storage.updateNotesList = function (notesList, callback) {
		var url = '/pinboard/note/update-list',
			data = { note: JSON.stringify(notesList) };

		serverRequest(url, data, function (err, data) {
			callback(err, data);
		});
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.StorageServer = Storage;
}(window, jQuery));

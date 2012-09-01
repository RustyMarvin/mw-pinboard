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


	// static object
	var Storage = {};

	Storage.init = function (callback) {

	};

	// crypt ------------------------------------------------------------------

	Storage.setSecret = function (s) {
		secret = s || '';
	};

	// user -------------------------------------------------------------------

	// for local storage, this simply returns a default object with empty fields
	// for server version, this returnes the current user
	Storage.getCurrentUser = function (callback) {

	};

	// board ------------------------------------------------------------------

	// for local storage, this simply returns the only board that is stored
	// for server version, this returnes the currently selected board
	Storage.getCurrentBoard = function (callback) {

	};

	Storage.insertBoard = function (board, callback) {

	};

	Storage.updateBoard = function (board, callback) {

	};

	// for local storage this simply updates the whole board
	// for MongoDB this updates only the boards fields 'title'/'desc' ($set)
	Storage.updateBoardsTitle = function (board, callback) {

	};

	// for local storage this simply updates the whole board
	// for MongoDB this updates only the boards fields 'fields' ($set)
	Storage.updateBoardsFields = function (board, callback) {

	};

	// local storage: simply delete all 'pinboard_' id keys
	// db/server: delete board by id (implies delete notes by board id)
	Storage.deleteBoard = function (id, callback) {
		// must not be implemented for AJAX
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

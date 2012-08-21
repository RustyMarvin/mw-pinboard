/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Storage module / local storage
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

	if (window.MW_Pinboard && window.MW_Pinboard.Storage) {
		throw 'Namespace MW_Pinboard.Storage already occupied!';
	}

	// idCounters are used to generate db like unique id's to identify the stored items
	var noteIdCounter = 0,
		noteIdCounterKey = 'pinboard_noteIdCounter',
		noteKeyPrefix = 'pinboard_note_',
		boardIdCounter = 0,
		boardIdCounterKey = 'pinboard_boardIdCounter',
		boardKeyPrefix = 'pinboard_board_';

	// encryption
	var Crypt = window.GibberishAES,
		secret = '',
		decryptNote = function (noteObj) {
			if (!secret) {
				throw 'Storage: decryptNote: No secret set!';
			}

			noteObj.title = Crypt.dec(noteObj.title, secret);
			noteObj.text = Crypt.dec(noteObj.text, secret);
		},
		encryptNote = function (noteObj) {
			if (!secret) {
				throw 'Storage: encryptNote: No secret set!';
			}

			noteObj.title = Crypt.enc(noteObj.title, secret);
			noteObj.text = Crypt.enc(noteObj.text, secret);
		};

	// static object
	var Storage = {};

	Storage.init = function (callback) {
		window.setTimeout(function () {
			var localStorage = window.localStorage,
				JSON = window.JSON;

			// check if storage is available
			if (!localStorage || !JSON) {
				callback(new Error('Storage: No local storage available!'));
				return;
			}

			// get stored idCounters
			noteIdCounter = parseInt(localStorage.getItem(noteIdCounterKey), 10);
			if (isNaN(noteIdCounter)) {
				noteIdCounter = 99;
				localStorage.setItem(noteIdCounterKey, noteIdCounter);
			}

			boardIdCounter = parseInt(localStorage.getItem(boardIdCounterKey), 10);
			if (isNaN(boardIdCounter)) {
				boardIdCounter = 99;
				localStorage.setItem(boardIdCounterKey, boardIdCounter);
			}

			callback(null);
		}, 0);
	};

	// crypt ------------------------------------------------------------------

	Storage.setSecret = function (s) {
		secret = s || '';
	};

	// notes ------------------------------------------------------------------

	// for local storage, this simply returns all notes ignoring the board id
	Storage.getNotesByBoardId = function (boardId, callback) {
		window.setTimeout(function () {
			var localStorage = window.localStorage,
				JSON = window.JSON,
				noteKeyPrefixLength = noteKeyPrefix.length,
				notesList = [],
				keys = Object.keys(localStorage),
				key,
				i,
				l,
				noteJ,
				noteObj;

			// get all keys, filter notes keys
			for (i = 0, l = keys.length; i < l; i += 1) {
				key = keys[i];
				if (key.substring(0, noteKeyPrefixLength) === noteKeyPrefix) {
					noteJ = localStorage.getItem(key);
					// console.log('Storage: found note: ' + noteJ);
					if (noteJ !== null) {
						try {
							noteObj = JSON.parse(noteJ);
						} catch (e) {
							callback(new Error('Storage: Error while json parsing note \'' + key + '\' !'));
							return;
						}
						if (Crypt && secret) {
							decryptNote(noteObj);
						}
						notesList.push(noteObj);
					}
				}
			}

			callback(null, notesList);
		}, 0);
	};

	Storage.insertNote = function (note, callback) {
		window.setTimeout(function () {
			var id,
				key,
				noteDb,
				noteJ;

			// generate new id
			noteIdCounter += 1;
			window.localStorage.setItem(noteIdCounterKey, noteIdCounter);

			// insert note
			id = 'id' + noteIdCounter;
			key = noteKeyPrefix + id;
			noteDb = $.extend({}, note, {id: id});

			if (Crypt && secret) {
				encryptNote(noteDb);
			}
			noteJ = window.JSON.stringify(noteDb);

			window.localStorage.setItem(key, noteJ);

			callback(null, id);
		}, 0);
	};

	Storage.updateNote = function (note, callback) {
		window.setTimeout(function () {
			var key = noteKeyPrefix + note.id,
				noteJ;

			if (Crypt && secret) {
				encryptNote(note);
			}
			noteJ = window.JSON.stringify(note);

			if (!note.id) {
				callback(new Error('Storage: updateNote() No field id in given note!'));
				return;
			}

			window.localStorage.setItem(key, noteJ);

			callback(null);
		}, 0);
	};

	Storage.deleteNote = function (id, callback) {
		window.setTimeout(function () {
			var key = noteKeyPrefix + id;

			window.localStorage.removeItem(key);

			callback(null);
		}, 0);
	};

	Storage.updateNotesList = function (notesList, callback) {
		window.setTimeout(function () {
			var localStorage = window.localStorage,
				JSON = window.JSON,
				note,
				key,
				noteJ,
				i,
				l;

			for (i = 0, l = notesList.length; i < l; i += 1) {
				note = notesList[i];
				key = noteKeyPrefix + note.id;

				if (Crypt && secret) {
					encryptNote(note);
				}
				noteJ = JSON.stringify(note);

				if (!note.id) {
					callback(new Error('Storage: updateNote() No field id in given note!'));
					return;
				}

				localStorage.setItem(key, noteJ);
			}

			callback(null);
		}, 0);
	};

	// board -----------------------------------------------------------------

	// for local storage, this simply returns the only board that is stored
	// for server version, this returnes the currently selected board
	Storage.getCurrentBoard = function (callback) {
		window.setTimeout(function () {
			var id = 'id' + boardIdCounter,
				key = boardKeyPrefix + id,
				boardJ = window.localStorage.getItem(key),
				boardObj = null;

			// console.log('Storage: found board: ' + boardJ);
			if (boardJ !== null) {
				try {
					boardObj = window.JSON.parse(boardJ);
				} catch (e) {
					callback(new Error('Storage: Error while json parsing board \'' + key + '\' !'));
					return;
				}
			}
			callback(null, boardObj);
		}, 0);
	};

	Storage.insertBoard = function (board, callback) {
		window.setTimeout(function () {
			var id,
				key,
				boardDb,
				boardJ;

			// generate new id
			boardIdCounter += 1;
			window.localStorage.setItem(boardIdCounterKey, boardIdCounter);

			// insert board
			id = 'id' + boardIdCounter;
			key = boardKeyPrefix + id;
			boardDb = $.extend({}, board, {id: id});
			boardJ = window.JSON.stringify(boardDb);

			window.localStorage.setItem(key, boardJ);

			callback(null, id);
		}, 0);
	};

	Storage.updateBoard = function (board, callback) {
		window.setTimeout(function () {
			var key = boardKeyPrefix + board.id,
				boardJ = window.JSON.stringify(board);

			if (!board.id) {
				callback(new Error('Storage: updateBoard() No board id in given board!'));
				return;
			}

			window.localStorage.setItem(key, boardJ);

			callback(null);
		}, 0);
	};

	// for local storage this simply updates the whole board
	// for MongoDB this updates only the boards fields 'title'/'desc' ($set)
	Storage.updateBoardsTitle = function (board, callback) {
		window.setTimeout(function () {
			var key = boardKeyPrefix + board.id,
				boardJ = window.JSON.stringify(board);

//
// TODO: check if board title exists
//

			if (!board.id) {
				callback(new Error('Storage: updateBoardsFields() Invalid board id!'));
				return;
			}

			window.localStorage.setItem(key, boardJ);

			callback(null);
		}, 0);
	};

	// for local storage this simply updates the whole board
	// for MongoDB this updates only the boards fields 'fields' ($set)
	Storage.updateBoardsFields = function (board, callback) {
		window.setTimeout(function () {
			var key = boardKeyPrefix + board.id,
				boardJ = window.JSON.stringify(board);

			if (!board.id) {
				callback(new Error('Storage: updateBoardsFields() No board id in given board!'));
				return;
			}

			window.localStorage.setItem(key, boardJ);

			callback(null);
		}, 0);
	};

	// local storage: simply delete all 'pinboard_' id keys
	// db/server: delete board by id (implies delete notes by board id)
	Storage.deleteBoard = function (id, callback) {
		window.setTimeout(function () {
			Object.keys(localStorage).forEach(function(key, idx) {
				if (key.indexOf(boardKeyPrefix) !== 0 && key.indexOf(noteKeyPrefix) !== 0) {
					return;
				}
				console.log('removing: ' + key);
				localStorage.removeItem(key);
			});

			callback(null);
		}, 0);
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Storage = Storage;
}(window, jQuery));

/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Board module
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

	if (window.MW_Pinboard && window.MW_Pinboard.Board) {
		throw 'Namespace MW_Pinboard.Board already occupied!';
	}

	var Events = window.MW_Pinboard.Events,
		Fields = window.MW_Pinboard.Fields,
		Note = window.MW_Pinboard.Note,
		Storage = window.MW_Pinboard.Storage;

	var Board;

	// setup for the select menu
	var menuCommandsSetup = [
		// disabled options not needed for standalone client
		/*
		{
			label: 'User',
			options: [
				{ title: 'Edit account', cmd: function () { Board.visitLink('dummy_user-edit.html'); } },
				{ title: 'Delete account', cmd: function () { Board.visitLink('dummy_user-delete.html'); } },
				{ title: 'Logout', cmd: function () { Board.visitLink('dummy_user-logout.html'); } }
			]
		},
		*/
		{
			label: 'Pinboard',
			options: [
				{ title: 'Resize board', cmd: function () { Board.resizeBoard(); } },
				{ title: 'Rename board', cmd: function () { Board.dialogRenameOpen(); } },
				// { title: 'Rename board', cmd: function () { Board.visitLink('dummy_board-edit.html'); } },
				// { title: 'Select board', cmd: function () { Board.visitLink('dummy_board-select.html'); } },
				// { title: 'New board', cmd: function () { Board.visitLink('dummy_board-create.html'); } },
				{ title: 'Delete board', cmd: function () { Board.dialogDeleteOpen(); } }
			]
		},
		{
			label: 'Help',
			options: [
				{ title: 'About', cmd: function () { Board.dialogAboutOpen(); } }
				// { title: 'Help', cmd: function () { Board.visitLink('dummy_help.html'); } },
				// { title: 'Test', cmd: function () { Board.test(); } }
			]
		}
	];

	// default params for new notes
	var noteDefaultsVariants = [
		{ variantName: 'Red', noteParams: {title: 'Enter headline', text: 'Enter text', color: '#F0A0A0'} },
		{ variantName: 'Green', noteParams: {title: 'Enter headline', text: 'Enter text', color: '#A0F0A0'} },
		{ variantName: 'Blue', noteParams: {title: 'Enter headline', text: 'Enter text', color: '#C0C0F0'} },
		{ variantName: 'Yellow', noteParams: {title: 'Enter headline', text: 'Enter text', color: '#FFFF80'} }
	];
	var noteDefaultsCommon = {
		// id: '', // gets set after the note has been stored
		boardId: '',
		zIndex: 0,
		left: 24,
		top: 64,
		width: 170,
		height: 90
	};

	// default fields for new board
	var fieldsDefaults = [
		{ title: 'Left field', cssClass: 'light', sizeFactor: 0.5 },
		{ title: 'Right field', cssClass: 'clear', sizeFactor: 0.5 }
	];

	// defaults for new board
	var boardDefaults = {
		// id: '', // gets set after the board has been stored
		userId: '',
		title: '\u00b7 MW Pinboard \u00b7',
		desc: 'Default pinboard',
		encryption: false,
		width: 0,
		height: 0
		// fields: [] // items: { title: '', cssClass: '', sizeFactor: 0.0 },
	};

	// static board object ====================================================

	Board = {
		mode: 'local',
		$pinboard: null,
		userParams: null,
		boardParams: null,
		// list of notes, needed to update all notes at once
		notesList: [],
		// max z-index counter for new notes (and dialogs)
		zIndexMax: 0,
		menuCommands: [],
		$dialogDarkening: null,
		$aboutDialog: null,
		$deleteDialog: null,
		$renameDialog: null
	};

	// init methods ===========================================================

	// may be called BEFORE dom ready
	Board.init = function (options) {
		var self = this,
			mode;

		// get mode 'local' or 'server', default is 'local'
		mode = options && options.mode || 'local';
		if (mode !== 'local' && mode !== 'server') {
			throw new Error('Board: invalid option \'mode\' given!');
		}
		this.mode = mode;

		var initNext = function () {
			$(window.document).ready(function () {
				self.initBoard();
			});
		};

		// init the storage module which itself checks if storage is available (local storage or server)
		Storage.init(function (err) {
			if (err) {
				alert(err.message);
				throw err;
			}

			// get current user
			Storage.getCurrentUser(function (err, user) {
				if (err) {
					alert(err.message);
					throw err;
				}
				self.userParams = user;

				// get board from db, if no board then setup default params
				// with MongoDB we ALWAYS get a board, but fields array could be empty
				Storage.getCurrentBoard(function (err, board) {
					var boardDb;

					if (err) {
						alert(err.message);
						throw err;
					}

					if (!board) {
						boardDb = $.extend({}, boardDefaults, { fields: fieldsDefaults });
						// db insert board, update id
						Storage.insertBoard(boardDb, function (err, id) {
							if (err) {
								alert(err.message);
								throw err;
							}

							self.boardParams = $.extend(boardDb, { id: id });
							initNext();
						});
						return;
					}

					// got board, check for empty fields, create default fields
					if (!board.fields || !board.fields.length) {
						boardDb = $.extend({}, board, { fields: fieldsDefaults });
						// db update board
						Storage.updateBoard(boardDb, function (err) {
							if (err) {
								alert(err.message);
								throw err;
							}

							self.boardParams = $.extend({}, boardDb);
							initNext();
						});
						return;
					}

					// storage ok, init board
					self.boardParams = $.extend({}, board);
					initNext();
				});
			});
		});
	};

	// must be called AFTER dom ready
	Board.initBoard = function () {
		var self = this,
			userParams = this.userParams,
			boardParams = this.boardParams,
			saveBoard,
			headHeight,
			viewportWidth,
			viewportHeight;

		// setup header
		$('#userNick').text(userParams && userParams.nick || '');
		$('#boardTitle').text(boardParams.title);

		// setup board --------------------------------------------------------
		saveBoard = false;
		if (boardParams.width === 0 || boardParams.height === 0) {
			// fresh board, calc dimensions
			viewportWidth = $(window).width(); // viewport dimensions
			viewportHeight = $(window).height();

			headHeight = $('#header').outerHeight(); // use .outerHeight(true) to include margins
			boardParams.width = viewportWidth - 32; // subtract pinboards css margins
			boardParams.height = viewportHeight - headHeight - 16; // use .outerHeight(true) to include margins
			saveBoard = true;
		}

		this.$pinboard = $('#pinboard').width(boardParams.width).height(boardParams.height);

		if (saveBoard) {
			Storage.updateBoard(boardParams, function (err) {
				if (err) {
					alert(err.message);
					throw err;
				}
				self.setupEncryption();
			});
			return;
		}

		// dialog darkening layer ---------------------------------------------
		this.$dialogDarkening = $('#dialogDarkening').width(boardParams.width).height(boardParams.height);

		self.setupEncryption();
	};

	Board.setupEncryption = function () {
		// secret dialog ------------------------------------------------------
		var self = this,
			$secretDialog = $('#secretDialog');

		if (this.boardParams.encryption) {
			$secretDialog.show();
			$('#secret').focus();

			$secretDialog.one('submit', function () {
				var secret = $('#secret').val();
				Storage.setSecret(secret);
				// $secretDialog.hide();

				console.log('SET SECRET: ' + secret);

				window.setTimeout(function () {
					$secretDialog.remove();
					self.setupBoardContents();
				}, 0);

				return false;
			});
			return;
		}

		this.setupBoardContents();
	};

	Board.setupBoardContents = function () {
		var self = this,
			$pinboard = this.$pinboard,
			pinboardWidth = this.boardParams.width,
			pinboardHeight = this.boardParams.height;

		// setup menu ---------------------------------------------------------
		this.setupMenu();

		// add note dialog ----------------------------------------------------
		var $addDialog = $('#addDialog');
		var item,
			elem,
			i;
		for (i = 0; i < noteDefaultsVariants.length; i += 1) {
			item = noteDefaultsVariants[i];
			elem = $('<div class="addOption"> &bull; ' + item.variantName + '</div>')
				.css('background-color', item.noteParams.color)
				.data('index', i);
			$addDialog.append(elem);
		}
		$addDialog.on('click', 'div.addOption', function (e) {
			var index = $(this).data('index');

			$addDialog.hide();

			e.preventDefault();
			e.stopPropagation();

			self.onNoteAdd(index, e.pageX, e.pageY);
		});
		$addDialog.on('mouseleave', function (e) {
			$addDialog.hide();
		});

		var pinboardOffset = $pinboard.offset();
		var adOuterW = $addDialog.outerWidth(),
			adOuterH = $addDialog.outerHeight();

		$pinboard.on('click', function (e) {
			var x = e.pageX - pinboardOffset.left,
				y = e.pageY - pinboardOffset.top,
				dx,
				dy;

			// avoid clicking on sth. other than the blank field
			if (!Fields.isFieldNode(e.target)) {
				return;
			}
			// clamp x/y to pinboard area minus dialog size plus dialog display offset (20px left/top from mouse x/y)
			dx = Math.max(0 + 10, Math.min(pinboardWidth - adOuterW + 10, x)) - 10;
			dy = Math.max(40 + 10, Math.min(pinboardHeight - adOuterH + 10, y)) - 10;

			$addDialog.css({'z-index': self.zIndexMax + 1, 'left': dx + 'px', 'top': dy + 'px'}).show();
		});

		// about dialog -------------------------------------------------------
		this.$aboutDialog = $('#aboutDialog');

		$('#aboutClose', this.$aboutDialog).on('click', function () {
			self.onDialogAboutClose();
		});

		// delete dialog -------------------------------------------------------
		this.$deleteDialog = $('#deleteDialog');

		$('#deleteCancel', this.$deleteDialog).on('click', function () {
			self.onDialogDeleteCancel();
		});

		$('#deleteConfirm', this.$deleteDialog).on('click', function () {
			self.onDialogDeleteConfirm();
		});

		// rename dialog -------------------------------------------------------
		this.$renameDialog = $('#renameDialog');

		$('#renameCancel', this.$renameDialog).on('click', function () {
			self.onDialogRenameCancel();
		});

		$('#renameConfirm', this.$renameDialog).on('click', function () {
			self.onDialogRenameConfirm();
		});

		// next step
		this.setupFieldsNotes();
	}; // setupBoardContents

	Board.setupMenu = function () {
		var self = this,
			$menu = $('#pinboardMenu');

		// build select items
		var selectIndex = 1;
		$.each(menuCommandsSetup, function (index, optgroup) {
			var $optgroup = $('<optgroup label="' + optgroup.label + '"></optgroup>'),
				options = optgroup.options,
				$option;

			for (var i = 0, l = options.length; i < l; i += 1) {
				$option = $('<option value="' + selectIndex + '">' + options[i].title + '</option>');
				self.menuCommands[selectIndex] = options[i].cmd;
				selectIndex += 1;
				$optgroup.append($option);
			}

			$menu.append($optgroup);
		});

		$menu.on('change', function () {
			self.onMenuSelect(this.selectedIndex);
			this.selectedIndex = 0;
			this.blur();
		});
	};

	Board.setupFieldsNotes = function () {
		var self = this;

		// setup fields -------------------------------------------------------

		Fields.init(this.$pinboard, this.boardParams.fields);

		// setup note handler -------------------------------------------------

		// clicked
		Events.addListener('noteSelected', function (noteObj) {
			self.onNoteSelected(noteObj);
		});

		// closed
		Events.addListener('noteClosed', function (noteObj) {
			self.onNoteClosed(noteObj);
		});

		// changed
		Events.addListener('noteChanged', function (noteObj) {
			self.onNoteChanged(noteObj);
		});

		// changed
		Events.addListener('fieldsChanged', function (fieldsSetup) {
			self.onFieldsChanged(fieldsSetup);
		});

		// get/insert stored notes --------------------------------------------

		Storage.getNotesByBoardId(this.boardParams.id, function (err, noteList) {
			var i,
				l,
				noteParams,
				note,
				zIndexMax = 0;

			if (err) {
				alert(err.message);
				throw err;
			}

			for (i = 0, l = noteList.length; i < l; i += 1) {
				noteParams = noteList[i];
				zIndexMax = Math.max(zIndexMax, noteParams.zIndex);
				note = new Note(self.$pinboard, noteParams);
				self.notesList.push(note);
			}

			self.zIndexMax = zIndexMax;
		});
	};

	// methods ================================================================

	Board.onNoteAdd = function (index, mx, my) {
		var self = this,
			noteParams,
			zIndex;

		// create noteParams without 'id'
		noteParams = $.extend({}, noteDefaultsCommon, noteDefaultsVariants[index].noteParams, { boardId: this.boardParams.id });

		// TODO: max left/top == pinboard minus note dimensions
		if (mx && my) {
			noteParams.left = mx - 15;
			noteParams.top = my - 30;
		}

		// the note should be on top of all other notes
		noteParams.zIndex = this.getIncZIndexMax();

		Storage.insertNote(noteParams, function (err, id) {
			if (err) {
				alert(err.message);
				throw err;
			}
			noteParams.id = id;
			var note = new Note(self.$pinboard, noteParams);
			self.notesList.push(note);
		});
	};

	Board.onNoteSelected = function (noteObj) {
		if (noteObj.zIndex < this.zIndexMax) {
			noteObj.setZIndex(this.getIncZIndexMax());
		}
	};

	Board.onNoteChanged = function (noteObj) {
		var self = this,
			noteParams = noteObj.getParams();

		// prepare note params for db
		Storage.updateNote(noteParams, function (err) {
			if (err) {
				alert(err.message);
				throw err;
			}
		});

	};

	Board.onNoteClosed = function (noteObj) {
		var self = this,
			index = this.notesList.indexOf(noteObj);

		if (index === -1) {
			throw new Error('Board.onNoteClosed: note not found in note list!');
		}

		Storage.deleteNote(noteObj.id, function (err) {
			if (err) {
				alert(err.message);
				throw err;
			}

			self.notesList.splice(index, 1);
		});
	};

	Board.onFieldsChanged = function (fieldsSetup) {
		// update local fields setup
		this.boardParams.fields = fieldsSetup;

		Storage.updateBoardsFields(this.boardParams, function (err) {
			if (err) {
				alert(err.message);
				throw err;
			}
		});
	};

	Board.onMenuSelect = function (index) {
		if (index === 0) {
			// clicked on 'Menu' option itself
			return;
		}

		var cmd = this.menuCommands[index];
		if (typeof cmd !== 'function') {
			throw new Error('Board.onMenuSelect: command for menu item: \'' + index + '\' is not a function !');
		}

		cmd();
	};

	Board.visitLink = function (link) {
		console.log('Board: visitLink(' + link + ')');

		window.location.href = link;
	};

	Board.resizeBoard = function () {
		var self = this,
			$pinboard = this.$pinboard,
			boardParams = this.boardParams,
			headHeight,
			viewportWidth,
			viewportHeight,
			oldWidth,
			oldHeight,
			newWidth,
			newHeight,
			widthFactor,
			heightFactor;

		// 1.) resize board

		oldWidth = boardParams.width;
		oldHeight = boardParams.height;

		viewportWidth = $(window).width(); // viewport dimensions
		viewportHeight = $(window).height();

		headHeight = $('#header').outerHeight(); // use .outerHeight(true) to include margins
		newWidth = viewportWidth - 32; // subtract pinboards css margins
		newHeight = viewportHeight - headHeight - 16;

		// do nothing if the board size is unchanged
		if (newWidth === oldWidth && newHeight === oldHeight) {
			return;
		}

		// if the window is smaller than the viewport, we have to compensate the scrollbars, else the pinboard gets too small
		if (viewportWidth < oldWidth + 32 ||
			viewportHeight < oldHeight + 42 + 16) {

			// intentionally size the board too small to get rid of the scrollbars, then measure again
			$pinboard.width(newWidth).height(newHeight);

			viewportWidth = $(window).width(); // viewport dimensions
			viewportHeight = $(window).height();

			headHeight = $('#header').outerHeight(); // use .outerHeight(true) to include margins
			newWidth = viewportWidth - 32; // subtract pinboards css margins
			newHeight = viewportHeight - headHeight - 16;
		}

		boardParams.width = newWidth;
		boardParams.height = newHeight;

		$pinboard
			.width(boardParams.width)
			.height(boardParams.height);

		this.$dialogDarkening
			.width(boardParams.width)
			.height(boardParams.height);

		// 2.) re-position notes

		// resize factors to adjust left/top coordinates
		widthFactor = boardParams.width / oldWidth;
		heightFactor = boardParams.height / oldHeight;

		var notesList = this.notesList,
			notesCount = notesList.length,
			index,
			note,
			preventUpdateEvent = true,
			notesParamsList = new Array(notesCount);

		// rebuild position, prevent update event
		for (index = 0; index < notesCount; index += 1) {
			note = notesList[index];
			note.setPos(Math.round(note.left * widthFactor), Math.round(note.top * heightFactor), preventUpdateEvent);
			notesParamsList[index] = note.getParams();
		}

		// 3.) re-init fields

		Fields.destroy();
		Fields.init($pinboard, boardParams.fields);

		Storage.updateBoard(boardParams, function (err) {
			if (err) {
				alert(err.message);
				throw err;
			}
			Storage.updateNotesList(notesParamsList, function (err) {
				if (err) {
					alert(err.message);
					throw err;
				}
				// possible next step
			});
		});
	};

	Board.deleteBoard = function () {
		var self = this;

		console.log('Board: deleteBoard()');

		// delete all board contents from DOM, notes and fields
		// <note>.destroy()

		var notesList = this.notesList,
			notesCount = notesList.length,
			index;

		// delete notes
		for (index = 0; index < notesCount; index += 1) {
			notesList[index].destroy();
			notesList[index] = null;
		}
		this.notesList = [];

		// delete fields
		Fields.destroy();

		// delete all board contents from storage
		Storage.deleteBoard(this.boardParams.id, function (err) {
			var boardDb;

			if (err) {
				alert(err.message);
				throw err;
			}

			// re-init boards fields, save fresh board
			self.boardParams.fields = undefined;
			$.extend(self.boardParams, { fields: fieldsDefaults });

			Fields.init(self.$pinboard, self.boardParams.fields);

			// save fresh board, update id
			boardDb = $.extend({}, self.boardParams);
			Storage.insertBoard(boardDb, function (err, id) {
				if (err) {
					alert(err.message);
					throw err;
				}

				self.boardParams.id = id;
			});
		});
	};

	Board.getIncZIndexMax = function () {
		this.zIndexMax += 1;

		// limit max zIndex, else the number won't stop increasing
		if (this.zIndexMax > 1000) {
			this.rebuildNotesZIndexes();
		}

		return this.zIndexMax;
	};

	Board.rebuildNotesZIndexes = function () {
		// tell the note that it should not emit an update event to board,
		// else we would have to update all the notes ONE BY ONE, instead, we manually update all notes AT ONCE
		var notesList = this.notesList,
			notesCount = notesList.length,
			index,
			note,
			preventUpdateEvent = true,
			notesParamsList = new Array(notesCount);

		// skip if less than 2 notes
		if (this.notesList.length < 2) {
			return;
		}

		// sort notes list by z-index
		notesList.sort(function (noteA, noteB) {
			return (noteA.zIndex < noteB.zIndex) ? -1 : 1;
		});

		// rebuild z-indexes, collect notes params
		for (index = 0; index < notesCount; index += 1) {
			note = notesList[index];
			note.setZIndex(index + 1, preventUpdateEvent);
			notesParamsList[index] = note.getParams();
		}
		this.zIndexMax = index;

		Storage.updateNotesList(notesParamsList, function (err) {
			if (err) {
				alert(err.message);
				throw err;
			}
		});
	};

	// dialog handling --------------------------------------------------------

	Board.dialogDarkeningOn = function () {
		this.$dialogDarkening.show();
	};

	Board.dialogDarkeningOff = function () {
		this.$dialogDarkening.hide();
	};

	Board.dialogAboutOpen = function () {
		this.dialogDarkeningOn();
		this.$aboutDialog.show();
	};

	Board.onDialogAboutClose = function () {
		this.$aboutDialog.hide();
		this.dialogDarkeningOff();
	};

	Board.dialogDeleteOpen = function () {
		this.dialogDarkeningOn();
		this.$deleteDialog.show();
	};

	Board.onDialogDeleteConfirm = function () {
		this.$deleteDialog.hide();
		this.dialogDarkeningOff();
		this.deleteBoard();
	};

	Board.onDialogDeleteCancel = function () {
		this.$deleteDialog.hide();
		this.dialogDarkeningOff();
	};

	Board.dialogRenameOpen = function () {
		this.dialogDarkeningOn();
		this.$renameDialog.show();

		$('#renameError').hide();
		$('#renameTitle').val(this.boardParams.title);
		$('#renameDesc').val(this.boardParams.desc);
	};

	Board.onDialogRenameConfirm = function () {
		var self = this,
			title = $('#renameTitle').val().trim(),
			desc = $('#renameDesc').val().trim();

		console.log('#' + title + '#');
		console.log('#' + desc + '#');

		if (title !== '') {
			// dont update board if title unchanged
			if (title !== this.boardParams.title || desc !== this.boardParams.desc) {
				console.log('>> Storage update');
				this.boardParams.title = title;
				this.boardParams.desc = desc;
				$('#boardTitle').text(title);

				// update db
				Storage.updateBoardsTitle(this.boardParams, function (err) {
					if (err) {
						alert(err.message);
						throw err;
					}
					self.$renameDialog.hide();
					self.dialogDarkeningOff();
				});
			} else {
				console.log('>> Same title/desc, NO storage update');
				this.$renameDialog.hide();
				this.dialogDarkeningOff();
			}
		} else {
			$('#renameError').text('Error: Title must not be empty!').show();
		}
	};

	Board.onDialogRenameCancel = function () {
		this.dialogDarkeningOff();
		this.$renameDialog.hide();
	};

	Board.test = function () {
		console.log('------- TEST -------');

	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Board = Board;
}(window, jQuery));

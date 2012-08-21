/*jshint curly:true, immed:true, latedef:true, nonew:true, plusplus:true, regexp:true, undef:true, strict:true, trailing:true, noarg:true */
/*jshint browser:true, jquery:true, devel:true */

/*
 * MW Pinboard - (c)2012 Markus von der Wehd <mvdw@mwin.de>
 * Events module
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

	if (window.MW_Pinboard && window.MW_Pinboard.Events) {
		throw 'Namespace MW_Pinboard.Events already occupied!';
	}

	// eventListeners: stores an array of registered event listener objects in property event name
	// {
	//   'event name': [ eventListener, ... ],
	// }
	// eventListener: object stores a single event listener
	// {
	//   callback: {function}      the function to call if event is triggered
	//   context: {object || null) the callback function is called with this object as context
	// }                           (usually 'this' when registered inside an object instance)
	var eventListeners = {},
		// RegEx to check event names against, use: var {boolean} isValidEventName = validEventNameRE.test(eventName);
		validEventNameRE = /^[a-z]+[a-z0-9_]*$/i;

	/**
	 * The events object
	 * @static
	 */
	var Events = {};

	/**
	 * Add an event listener
	 * @param	{string} 	eventName			Name to identify the event
	 * @param	{function}	eventCallback		Function which is called when the event is triggered
	 * @param	{object} 	[callbackContext]	Optional object in which context the callback should be called
	 * @static
	 */
	Events.addListener = function (eventName, eventCallback, callbackContext) {
		if (!validEventNameRE.test(eventName)) {
			throw 'MW.Events.addListener(): invalid event name given!';
		}
		if (typeof eventCallback !== 'function') {
			throw 'MW.Events.addListener(): given callback is not a function!';
		}

		var newContext = callbackContext || null,
			newListener = {
				callback: eventCallback,
				context: newContext
			},
			eventListenerCount = (eventListeners[eventName] && eventListeners[eventName].length) || 0,
			index,
			eventListener,
			listenerExists = false;

		if (eventListenerCount === 0) {
			eventListeners[eventName] = [];
		} else {
			// at least one listener for this name is registered, check if listener exists
			eventListenerCount = eventListeners[eventName].length;
			for (index = 0; index < eventListenerCount; index += 1) {
				eventListener = eventListeners[eventName][index];
				if (eventListener.callback === eventCallback && eventListener.context === newContext) {
					throw 'MW.Events.addListener(): this listener is already registered!';
				}
			}
		}

		eventListeners[eventName].push(newListener);
	};

	/**
	 * Remove an event listener
	 * @param	{string} 	eventName			Name to identify the event
	 * @param	{function}	eventCallback		Function which is called when the event is triggered
	 * @param	{object} 	[callbackContext]	Optional object in which context the callback should be called
	 * @static
	 */
	Events.removeListener = function (eventName, eventCallback, callbackContext) {
		if (!eventListeners[eventName]) {
			throw 'MW.Events.removeListener(): Unknown event name: "' + eventName + '" given!';
		}
		if (typeof eventCallback !== 'function') {
			throw 'MW.Events.removeListener(): given callback is not a function!';
		}

		var newContext = callbackContext || null,
			eventListenerCount = eventListeners[eventName].length,
			index,
			eventListener,
			removeIndex;

		if (eventListenerCount === 1) {
			// single event listener registered, remove whole event
			eventListeners[eventName] = undefined;
		} else {
			// multiple event listeners registered, remove listener from list
			removeIndex = -1;
			for (index = 0; index < eventListenerCount; index += 1) {
				eventListener = eventListeners[eventName][index];
				if (eventListener.callback === eventCallback && eventListener.context === newContext) {
					removeIndex = index;
					break;
				}
			}
			if (removeIndex > -1) {
				eventListeners[eventName].splice(removeIndex, 1);
			}
		}
	};

	/**
	 * Triggers an event for the given object and the given event name.
	 * Additional parameters given are forwarded to the registered event listeners (callbacks)
	 * @param	{string} 	eventName	Name to identify the event
	 * @param	{mixed} 	[]			Optional arguments for the callback funtion
	 * @static
	 */
	Events.trigger = function (eventName) {
		if (!eventListeners[eventName]) {
			return;
		}

		var eventArgs = (arguments.length > 1)
				? Array.prototype.slice.call(arguments, 1)
				: null,
			index,
			eventListenerCount = eventListeners[eventName].length,
			eventListener;

		// call callbacks
		for (index = 0; index < eventListenerCount; index += 1) {
			eventListener = eventListeners[eventName][index];
			eventListener.callback.apply(eventListener.context, eventArgs); // null|undefined are valid as context/args (at least for Mozillas FF)
		}
	};

	window.MW_Pinboard = window.MW_Pinboard || {};
	window.MW_Pinboard.Events = Events;
}(window));

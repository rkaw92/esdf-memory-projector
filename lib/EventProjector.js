'use strict';

const when = require('when');
const sequence = require('when/sequence');
const Projection = require('./Projection');

class EventProjector {
	constructor(aggregateType, options) {
		this._aggregateType = aggregateType;
		this._options = options || {};
		
		this._handlers = new Map();
		this._projections = new Map();
	}
	
	addHandler(eventType, projectionFunction) {
		this._handlers.set(eventType, projectionFunction);
	}
	
	processCommit(commit) {
		var self = this;
		// Guard clause: if the entire commit does not match our aggregate type, exit early.
		if (commit.aggregateType !== self._aggregateType) {
			return Promise.resolve();
		}
		// Load the current state of the projection, or make one up if it does not exist.
		var projection = self._projections.get(commit.sequenceID) || new Projection();
		// Put a reference to the projection object in our internal map, so that handling of subsequent commits may find it.
		self._projections.set(commit.sequenceID, projection);
		// For each event that the commit contains, we invoke the relevant handler, if any.
		// To do this, we generate an array of functions (tasks) that need to be executed in a sequence.
		var tasks = commit.events.map(function(event) {
			return function() {
				// First, re-publish the event. This pushes it to subscribers and adds it to the internal list.
				projection.push(event);
				// Guard clause: if we have no handler for this type of event, do nothing with the state.
				var handler = self._handlers.get(event.eventType);
				if (!handler) {
					return Promise.resolve();
				}
				// Call the handler function, which should yield the new state of the projection based on the old state and the event.
				return when.try(handler, projection.state, event).then(function(changedState) {
					projection.state = changedState;
				});
			};
		});
		
		return sequence(tasks);
	}
	
	getProjection(sequenceID) {
		return this._projections.get(sequenceID);
	}
}

module.exports = EventProjector;

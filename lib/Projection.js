'use strict';

const EventEmitter = require('events').EventEmitter;

class Projection extends EventEmitter {
	constructor() {
		super();
		this.state = {};
		this.events = [];
	}
	
	push(event) {
		this.events.push(event);
		this.emit('event', event);
	}
}

module.exports = Projection;

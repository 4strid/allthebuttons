const rbush = require('rbush')

const db = require('./db')
const { X, Y } = require('./constants')

/**
 * The R-Tree that contains all the users. Determining which users to broadcast
 * presses to is an intersection problem: each user has an area, and we need only
 * determine which areas intersect the point of the press
 */
const tree = rbush()

/**
 * A representation of the websocket connection that includes its position in the grid
 */
function User (socket) {
	this.socket = socket
	this.history = []
	this.minX = 0
	this.minY = 0
	this.maxX = 0
	this.maxY = 0
	this.opsIn1m = 0
	tree.insert(this)
}

/** Removes a user from the tree */
User.delete = function (user) {
	tree.remove(user)
}

/** Recalculates the area the user occupies in the grid and updates the tree */
User.prototype.refreshBounds = function () {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const chunk of this.history) {
		minX = chunk[X] < minX ? chunk[X] : minX
		minY = chunk[Y] < minY ? chunk[Y] : minY
		maxX = chunk[X] > maxX ? chunk[X] : maxX
		maxY = chunk[Y] > maxY ? chunk[Y] : maxY
	}
	tree.remove(this)
	this.minX = minX
	this.minY = minY
	this.maxX = maxX
	this.maxY = maxY
	tree.insert(this)
}

/**
 * Respond to a load request
 * buffer - The data sent by the user
 */ 
User.prototype.load = function (buffer) {
	if (!(buffer instanceof Buffer) || buffer.byteLength !== 16) {
		return this.disconnect()
	}
	// get result from database
	db.load(buffer, (chunk, bufferOut) => {
		if (chunk === null || bufferOut === null) {
			return this.disconnect()
		}
		if (this.history.length >= 12) {
			// remove one file, add one file
			this.history.shift()
		}
		this.history.push(chunk)
		this.refreshBounds()
		this.socket.emit('d', bufferOut)
	})
}
/**
 * Respond to a button press
 * buffer - The data sent by the user
 */ 
User.prototype.press = function (buffer) {
	db.press(buffer, (chunk, buffer) => {
		if (chunk === null || buffer === null) {
			return this.disconnect()
		}
		const query = {
			minX: chunk[X],
			minY: chunk[Y],
			maxX: chunk[X],
			maxY: chunk[Y],
		}
		// get users in the vicinity
		const vicinity = tree.search(query)
		for (const user of vicinity) {
			// don't broadcast to self
			if (user !== this) {
				// emit press
				user.socket.emit('p', buffer)
			}
		}
	})
}

module.exports = User

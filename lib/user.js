const rbush = require('rbush')

const db = require('./db')
const { X, Y } = require('./constants')

// contains all the users
const tree = rbush()

function User (socket) {
	this.socket = socket
	this.history = []
	this.minX = 0
	this.minY = 0
	this.maxX = 0
	this.maxY = 0
	tree.insert(this)
}

User.delete = function (user) {
	tree.remove(user)
}

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
	// +/- 1 to account for the fact that we're only keeping one chunk of history
	this.minX = minX - 1
	this.minY = minY - 1
	this.maxX = maxX + 1
	this.maxY = maxY + 1
	tree.remove(this)
	tree.insert(this)
}

User.prototype.load = function (chunk) {
	const chunk_ = chunk.split(':').map(x => Number(x))
	db.load(chunk_, (chunk, buffer) => {
		// TESTING ONLY
		// ONLY KEEP 1 FILE WORTH OF HISTORY
		if (this.history.length >= 1) {
			// remove one file, add one file
			this.history.shift()
		}
		this.history.push(chunk)
		this.refreshBounds()
		this.socket.emit('d', buffer)
	})
}

User.prototype.press = function (press) {
	press.chunk = press.chunk.split(':').map(x => Number(x))
	press.i = Number(press.i)
	db.press(press, (chunk, buffer) => {
		const query = {
			minX: chunk[X],
			minY: chunk[Y],
			maxX: chunk[X],
			maxY: chunk[Y],
		}
		const result = tree.search(query)
		for (const user of result) {
			if (user !== this) {
				user.socket.emit('p', buffer)
			}
		}
	})
}

//User.prototype.resetLoads = function () {
	//this.loadOpsIn1s = 0
//}

//User.prototype.resetSecond = function () {
	//this.opsIn1s = 0
//}

//User.prototype.resetMinute = function () {
	//this.opsIn1m = 0
//}

module.exports = User

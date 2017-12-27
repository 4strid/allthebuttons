const rbush = require('rbush')

const db = require('./db')

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
	for (const file of this.history) {
		minX = file.x < minX ? file.x : minX
		minY = file.y < minY ? file.y : minY
		maxX = file.x > maxX ? file.x : maxX
		maxY = file.y > maxY ? file.y : maxY
	}
	if (minX === this.minX &&
	    minY === this.minY &&
	    maxX === this.maxX &&
		maxY === this.maxY) {
		return
	}
	this.minX = minX - 1
	this.minY = minY - 1
	this.maxX = maxX + 1
	this.maxY = maxY + 1
	tree.remove(this)
	tree.insert(this)
}

User.prototype.load = function (chunk) {
	const chunk_ = chunk.split(':').map(x => Number(x))
	db.load(chunk_, (file, buffer) => {
		// TESTING ONLY
		// ONLY KEEP 1 FILE WORTH OF HISTORY
		if (this.history.length >= 1) {
			// remove one file, add one file
			this.history.shift()
		}
		this.history.push(file)
		this.refreshBounds()
		this.socket.emit('d', buffer)
	})
}

User.prototype.press = function (press) {
	press.chunk = press.chunk.split(':').map(x => Number(x))
	press.i = Number(press.i)
	db.press(press, (file, buffer) => {
		const query = {
			minX: file.x,
			minY: file.y,
			maxX: file.x,
			maxY: file.y,
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

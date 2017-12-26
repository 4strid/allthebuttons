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
	console.log('moving')
	console.log(minX, minY, maxX, maxY)
	this.minX = minX
	this.minY = minY
	this.maxX = maxX
	this.maxY = maxY
	tree.remove(this)
	tree.insert(this)
}

User.prototype.load = function (buffer) {
	db.load(buffer, (file, buffer) => {
		if (this.history.length >= 12) {
			// remove one file, add one file
			this.history.shift()
		}
		this.history.push(file)
		this.refreshBounds()
		this.socket.emit('data', buffer)
	})
}

User.prototype.press = function (buffer) {
	db.press(buffer, (file, buffer) => {
		const query = {
			minX: file.x,
			minY: file.y,
			maxX: file.x,
			maxY: file.y,
		}
		const result = tree.search(query)
		console.log('hits')
		console.log(result)
		for (const user of result) {
			if (user !== this) {
				user.socket.emit('press', buffer)
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

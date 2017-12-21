function Socket (socket) {
	this.socket = socket
}

Socket.prototype.resetLoads = function () {
	this.loadOpsIn1s = 0
}

Socket.prototype.resetSecond = function () {
	this.opsIn1s = 0
}

Socket.prototype.resetMinute = function () {
	this.opsIn1m = 0
}

module.exports = Socket

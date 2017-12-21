const   compatible = require('diet-connect')
const       server = require('diet')
const          app = server()
app.listen('http://localhost:3000')
const           io = require('socket.io')(app.server)
const createStatic = require('connect-static')

const           db = require('./lib/db')
const       Socket = require('./lib/socket')

// static middleware
createStatic({
	dir: __dirname + '/' + 'static',
	aliases: [['/','/index.html']]
}, function (err, static) {
	if (err) {
		throw err
	}
	app.footer(compatible(static));
});


const sockets = new Map()

setInterval(function () {
	for (const socket of sockets) {
		socket[0].resetLoads()
		socket[0].resetSecond()
	}
}, 1000)

setInterval(function () {
	for (const socket of sockets) {
		socket[0].resetMinute()
	}
}, 60000)

/********** socket stuff ***************/
io.on('connection', function(sock) {
	const socket = new Socket(sock)
	sockets.set(socket)
	//io.to(socket.id).emit('load', database);
	socket.socket.on('request', function (chunk) {
		if (socket.loadOpsIn1s > 20) {
			return socket.disconnect()
		}
		db.load(chunk, function (data) {
			if (data !== null) {
				socket.socket.emit('data', {
					chunk: chunk,
					data: data
				})
			}
		})
		socket.loadOpsIn1s++
	})
	socket.socket.on('press', function (press) {
		if (socket.opsIn1s > 10) {
			return socket.disconnect()
		}
		if (socket.opsIn1m > 120) {
			return
		}
		db.press(press, function (err) {
			socket.socket.broadcast.emit('press', press);
		})
		socket.opsIn1s++
		socket.opsIn1m++
	});
	
	socket.socket.on('disconnect', function () {
		sockets.delete(socket)
	})
});

module.exports = app

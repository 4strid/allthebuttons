const   compatible = require('diet-connect')
const       server = require('diet')
const          app = server()
app.listen('http://localhost:3000')
const           io = require('socket.io')(app.server)
const createStatic = require('connect-static')

const         User = require('./lib/user')

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
io.on('connection', function(socket) {

	const user = new User(socket)

	user.socket.on('request', function (buffer) {
		user.load(buffer)
	})

	user.socket.on('press', function (buffer) {
		user.press(buffer)
	})


	//const socket = new Socket(sock)
	//sockets.set(socket)
	////io.to(socket.id).emit('load', database);
	//socket.socket.on('request', function (buffer) {
		//if (socket.loadOpsIn1s > 20) {
			////return socket.disconnect()
			//return console.log('load overload!')
		//}
		//db.load(chunk, function (buffer) {
			//socket.socket.emit('data', buffer)
		//})
		//socket.loadOpsIn1s++
	//})
	//socket.socket.on('press', function (press) {
		//if (socket.opsIn1s > 10) {
			////return socket.disconnect()
			//console.log('overload!')
			//return
		//}
		//if (socket.opsIn1m > 120) {
			//console.log('overload! (2)')
			//return
		//}
		//db.press(press, function (err) {
			//socket.socket.broadcast.emit('press', press);
		//})
		//socket.opsIn1s++
		//socket.opsIn1m++
	//});
	
	user.socket.on('disconnect', function () {
		User.delete(user)
	})
});

module.exports = app

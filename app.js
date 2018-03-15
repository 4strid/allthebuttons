const       server = require('diet')
const          app = server()

const     socketio = require('socket.io')
const createStatic = require('connect-static')
const   compatible = require('diet-connect')

const         User = require('./lib/user')
const        stats = require('./lib/statistics')

stats.load()

const hostname = process.env.ALLTHEBUTTONS_IO__HOSTNAME || 'http://localhost:3000'
app.listen(hostname)
const io = socketio(app.server)

// static middleware
createStatic({
	dir: __dirname + '/' + 'static',
	aliases: [['/','/index.html']],
}, function (err, staticMiddleware) {
	if (err) {
		throw err
	}
	app.footer(compatible(staticMiddleware))
})

io.on('connection', function (socket) {

	const user = new User(socket)

	// r - request
	socket.on('r', function (buffer) {
		user.load(buffer)
	})

	// p - press
	socket.on('p', function (buffer) {
		user.press(buffer)
	})

	// s - statistics
	socket.on('s', function () {
		socket.emit('s', stats.buttons)
	})

	socket.on('disconnect', function () {
		User.delete(user)
	})

})

// I think that just kills the server
//app.shutdown = function (done) {
	//io.close(done)
//}

module.exports = app

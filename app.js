const       server = require('diet')
const          app = server()

const     socketio = require('socket.io')
const createStatic = require('connect-static')
const   compatible = require('diet-connect')

const         User = require('./lib/user')
const        stats = require('./lib/statistics')

stats.load()

app.listen('http://localhost:3000')
const io = socketio(app.server)

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

io.on('connection', function(socket) {

	const user = new User(socket)

	// r - request
	user.socket.on('r', function (buffer) {
		user.load(buffer)
	})

	// p - press
	user.socket.on('p', function (buffer) {
		user.press(buffer)
	})

	// s - statistics
	user.socket.on('s', function () {
		user.socket.emit('s', stats.buttons)
	})

	user.socket.on('disconnect', function () {
		User.delete(user)
	})

});

module.exports = app

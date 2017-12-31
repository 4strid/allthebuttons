const       server = require('diet')
const          app = server()
app.listen('http://localhost:3000')

const           io = require('socket.io')(app.server)
const createStatic = require('connect-static')
const   compatible = require('diet-connect')

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

	user.socket.on('disconnect', function () {
		User.delete(user)
	})
});

module.exports = app

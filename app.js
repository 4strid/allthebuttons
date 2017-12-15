const fs = require('fs')

const   compatible = require('diet-connect')
const       server = require('diet')
const          app = server()
app.listen('http://ctrl-alt-create.net')
const           io = require('socket.io')(app.server)
const createStatic = require('connect-static')

const           db = require('./lib/db')

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


/********** socket stuff ***************/
io.on('connection', function(socket) {
	//io.to(socket.id).emit('load', database);
	socket.on('request', function (chunk) {
		db.load(chunk, function (data) {
			if (data !== null) {
				socket.emit('data', {
					chunk: chunk,
					data: data
				})
			}
		})
	})
	socket.on('press', function (press) {
		//if (press.long) {
			//database[press.id] = database[press.id] ^ 2;
		//} else {
			//database[press.id] = database[press.id] ^ 1;
		//}
		if (press.i > 400) {
			console.log('unusually high index', press.i)
		}
		db.press(press, function (err) {
			console.log(err)
			socket.broadcast.emit('press', press);
		})
	});
	socket.on('message', function (message) {
		console.log(message);
	});
});

module.exports = app

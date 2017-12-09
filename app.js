//var express = require('express');
//var app = express();
//var http = require('http').Server(app);
//var io = require('socket.io')(http);
//var fs = require('fs');


//[>********* persistence **************<]
//var database = loadDb('db');

//setInterval(function () {
	//saveDb(database, 'db');
//}, 5000);

//function saveDb (db, file) {
	//var serialized = '';
	//for (var i = 0; i < 1600; i++) {
		//serialized = serialized + db[i];
	//}
	//fs.writeFile('db', serialized, 'utf8');
//}

//function loadDb (file) {
	//var db = {};
	//var deserialized = fs.readFileSync(file, 'utf8').split('');
	//for (var i = 0; i < 1600; i++) {
		//db[i] = deserialized[i];
	//}
	//return db;
//}
//function resetDatabase() {
	//for (var i = 0; i < 1600; i++) {
		//database[i] = 0;
	//}
//}
const fs = require('fs')

const   compatible = require('diet-connect')
const       server = require('diet')
const          app = server()
app.listen('http://localhost:3000')
const           io = require('socket.io')(app.server)
const createStatic = require('connect-static')

const           db = require('./lib/db')

// static middleware
createStatic({
	dir: 'static',
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
		db.load(chunk, function (err, data) {
			console.log(err)
			socket.emit('data', {
				chunk: chunk,
				data: data
			})
		})
	})
	socket.on('press', function (press) {
		//if (press.long) {
			//database[press.id] = database[press.id] ^ 2;
		//} else {
			//database[press.id] = database[press.id] ^ 1;
		//}
		db.press(press, function (err) {
			console.log(err)
		})
		socket.broadcast.emit('press', press);
	});
	socket.on('message', function (message) {
		console.log(message);
	});
});


/********** web server stuff ***********/
//app.get('/', function(req, res) {
	//res.sendFile(__dirname + '/index.html');
//});

//app.use(express.static('public'));

//http.listen('8080', function () {
	//console.log('listening on port 8080');
//});


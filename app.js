const     socketio = require('socket.io')

const         User = require('./lib/user')
const        stats = require('./lib/statistics')
const       Static = require('./lib/static')

function setup (server) {
  
  function log (message) {
    if (process.env.VERBOSE) {
      console.log(message)
    }
  }
  //const { WebsocketServer } = ws
  //const wss = new WebsocketServer({noServer: true})

  const io = new socketio.Server(server)
  log('all the buttons... are online :>')

  io.on('connection', function (socket) {

    const user = new User(socket)
    log('user connected')

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
      log('user disconnected')
      User.delete(user)
    })
  })
}

stats.load()

// I think that just kills the server
//app.shutdown = function (done) {
	//io.close(done)
//}

const serveStatic =  Static({
  path: __dirname + '/static',
})

const app = process.env.VERBOSE ? (function (req, res) {
  console.log(req.method + ' ' + req.url)
  serveStatic(req, res)
}) : serveStatic


module.exports = {
  app,
  setup,
}

const fs = require('fs')
const http = require('http')
const https = require('https')

const AllTheButtons = require('./app')

http.createServer(function (req, res) {   
  res.writeHead(301, {Location: "https://" + req.headers['host'] + req.url});
  res.end();
}).listen(80);

const server = https.createServer({ 
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem'),
  ca: fs.readFileSync('chain.pem')
}, AllTheButtons.app)

AllTheButtons.setup(server)

server.listen(443);

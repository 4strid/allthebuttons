function randomCloseby (context, events, done) {
	context.vars.chunk = (Math.floor(Math.random() * 20) - 10) + ":" + (Math.floor(Math.random() * 20) - 10)
	return done()
}

function randomChunk (context, events, done) {
	context.vars.chunk = (Math.floor(Math.random() * 200) - 100) + ":" + (Math.floor(Math.random() * 200) - 100)
	return done()
}

module.exports = {
	randomCloseby: randomCloseby,
	randomChunk: randomChunk,
}

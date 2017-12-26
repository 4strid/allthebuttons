function randomChunk (context, events, done) {
	context.vars.chunk = (Math.floor(Math.random() * 200) - 100) + ":" + (Math.floor(Math.random() * 200) - 100)
	return done()
}

module.exports = {
	randomChunk: randomChunk,
}

function randomButton (context, events, done) {
	context.vars.button = Math.floor(Math.random() * 400)
	return done()
}

function randomChunk (context, events, done) {
	context.vars.chunkX = Math.floor(Math.random() * 1000) - 500
	context.vars.chunkY = Math.floor(Math.random() * 1000) - 500
	return done()
}

function randomHeading (context, events, done) {
	context.vars.headingX = Math.random() < 0.5 ? -1 : 1
	context.vars.headingY = Math.random() < 0.5 ? -1 : 1
	return done()
}

module.exports = {
	randomChunk: randomChunk,
	randomHeading: randomHeading
}

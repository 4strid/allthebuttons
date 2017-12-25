const fs = require ('fs')
const _path = require('path')
const File = require('./file')
const { X, Y, CHUNK_FILE_RATIO, MAX_CACHE_SIZE } = require('./constants')


const db = {
	files: {},
	cache: new Map(),
}

db.cacheIterator = db.cache[Symbol.iterator]()

// synchronous and instant in the optimistic case
db.load = function (buffer, cb) {
	this.getFile(buffer, file => {
		cb(file.load(buffer))
	})
}

// synchronous and instant in the optimistic case
db.press = function (buffer, cb) {
	this.getFile(buffer, file => {
		file.press(buffer)
		cb(null)
	})
}

db.getFile = function (buffer, cb) {
	const chunk = File.prototype.getChunk(buffer)
	const x = integerDivide(chunk[X], CHUNK_FILE_RATIO)
	const y = integerDivide(chunk[Y], CHUNK_FILE_RATIO)
	const path = `${x}_${y}`
	if (this.files[path]) {
		const file = this.files[path]
		if (file.isClosing) {
			return file.onClose(() => {
				this.getFile(chunk, cb)
			})
		}
		if (!file.isReady) {
			return file.onReady(cb)
		}
		this.requeue(file)
		return cb(file)
	}
	const file = new File(path)
	this.enqueue(file)
	fs.stat(_path.join(__dirname, '../db', path), (err, stats) => {
		if (err) {
			// couldn't open the file, just return an empty buffer
			return file.ready(cb)
		}
		file.open(stats.size, cb)
	})
}

db.enqueue = function (file) {
	this.files[file.path] = file
	this.cache.set(file)
	if (this.cache.size > MAX_CACHE_SIZE) {
		console.log('dequeuing')
		this.dequeue()
	}
}

db.requeue = function (file) {
	this.cache.delete(file)
	this.cache.set(file)
}

// this is only called if there are items in the cache, so iterator.next is always defined
db.dequeue = function () {
	const file = this.cacheIterator.next().value[0]
	file.close(() => {
		this.cache.delete(file)
		delete this.files[file.path]
	})
}

// a divided by b
// rounds up or down depending on if a is negative
function integerDivide (a, b) {
	return Math.floor(a / b)
}

module.exports = db

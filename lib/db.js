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
db.load = function (chunk, cb) {
	this.getFile(chunk, file => {
		cb(file.load(chunk))
	})
}

// synchronous and instant in the optimistic case
db.press = function (press, cb) {
	this.getFile(press.chunk, file => {
		file.press(press)
		cb(null)
	})
}

db.getFile = function (chunk, cb) {
	console.log('get file', chunk[X], chunk[Y])
	const x = integerDivide(chunk[X], CHUNK_FILE_RATIO)
	const y = integerDivide(chunk[Y], CHUNK_FILE_RATIO)
	const path = `${x}_${y}`
	console.log('path', path)
	if (this.files[path]) {
		const file = this.files[path]
		if (file.isClosing) {
			return file.onClose(() => {
				this.getFile(chunk, cb)
			})
		}
		if (!file.isReady) {
			console.log('file was not ready')
			return file.onReady(cb)
		}
		this.requeue(file)
		return cb(file)
	}
	const file = new File(path)
	this.enqueue(file)
	fs.stat(_path.join(__dirname, path), (err, stats) => {
		console.log(err, stats)
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
	console.log(this.cache.size)
	if (this.cache.size > MAX_CACHE_SIZE) {
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
	this.cache.delete(file)
	file.close()
	delete this.files[file.path]
}

// a divided by b
// rounds up or down depending on if a is negative
function integerDivide (a, b) {
	return Math.floor(a / b)
}

module.exports = db

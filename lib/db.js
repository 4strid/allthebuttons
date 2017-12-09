const fs = require ('fs')
const File = require('./file')
const { X, Y, CHUNK_FILE_RATIO } = require('./constants')


const db = {
	files: {},
	cacheQ: []
}

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
	const x = integerDivide(chunk[X], CHUNK_FILE_RATIO)
	const y = integerDivide(chunk[Y], CHUNK_FILE_RATIO)
	const path =  x + ' ' + y
	if (this.files[path]) {
		const file = this.files[path]
		if (file.isClosing) {
			return file.onClose(() => {
				this.getFile(chunk, file => cb(file))
			})
		}
		if (!file.isReady) {
			return file.onReady(file => cb(file))
		}
		this.requeue(file)
		return cb(file)
	}
	fs.stat(path, (err, stats) => {
		if (err) {
			const file = new File(path, 0)
			this.enqueue(file)
			return cb(file)
		}
		const file = new File(path, stats.size)
		this.enqueue(file)
		file.open(file => cb(file))
	})
}

db.findChunk = function (chunk, callback) {
	const x = integerDivide(chunk[X], CHUNK_FILE_RATIO)
	const y = integerDivide(chunk[Y], CHUNK_FILE_RATIO)
	return x + ' ' + y
	if (!this.files[path]) {
		this.files[path] = { opening: true }
		const file = db.files[path]
		fs.stat(path, (err, stats) => {
			console.log(err, stats)
			if (stats.isFile()) {
				return fs.open(this.path, 'r+', (err, fd) => {
					file.file = File(fd, stats.size, this, path)
					file.opening = false
					this.processQueue(path, () => {
						callback(null, file.file)
					})
				})
			}
			fs.open(this.path, 'w+', (err, fd) => {
				file.file = File(fd, 0, this)
				file.opening = false
				this.processQueue(path, () => {
					callback(null, file.file)
				})
			})
		})
	}
	const file = db.files[path]
	if (file.opening) {
		return this.onOpen(path, callback)
	}
	callback(null, this.files[path])
}

db.onOpen = function (path, op) {
	this.queue[path] = this.queue[path] || []
	this.queue[path].push(op)
}

db.processQueue = function (path, callback) {
	for (const op in this.queue[path]) {
		op(null, this.files[path])
	}
	callback()
}

// a divided by b
// rounds up or down depending on if a is negative
function integerDivide (a, b) {
	return a < 0 ? Math.ceil(a / b) : Math.floor(a / b)
}

module.exports = db

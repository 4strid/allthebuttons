const fs = require ('fs')
const _path = require('path')
const File = require('./file')
const { X, Y, CHUNK_FILE_RATIO, MAX_CACHE_SIZE } = require('./constants')


/**
 * The database consists of an object of File handles and a cache queue
 * that determines which Files to unload
 */
const db = {
	files: {},
	cache: new Map(),
}

db.cacheIterator = db.cache[Symbol.iterator]()

/**
 * Open the file and return the requested chunk
 * Synchronous in the optimistic case (file already cached)
 */ 
db.load = function (buffer, cb) {
	const chunk = File.prototype.getChunk(buffer)
	this.getFile(buffer, file => {
		cb(chunk, file.load(buffer))
	})
}

/**
 * Press a button within a file
 * Synchronous in the optimistic case (file already cached)
 */ 
db.press = function (buffer, cb) {
	const chunk = File.prototype.getChunk(buffer)
	this.getFile(buffer, file => {
		file.press(buffer)
		cb(chunk, buffer)
	})
}

/**
 * Get the file referred to by the incoming buffer and call the callback with
 * the obtained file.
 */
db.getFile = function (buffer, cb) {
	const chunk = File.prototype.getChunk(buffer)
	const x = Math.floor(chunk[X] / CHUNK_FILE_RATIO)
	const y = Math.floor(chunk[Y] / CHUNK_FILE_RATIO)
	const path = x + '_' + y
	if (this.files[path]) {
		const file = this.files[path]
		// if file is being opened, wait until it is open
		if (!file.isReady) {
			return file.onReady(cb)
		}
		this.requeue(file)
		// the file is ready, call cb immediately
		return cb(file)
	}
	const file = new File(path)
	this.enqueue(file)
	fs.stat(_path.join(__dirname, '../db', path), (err, stats) => {
		if (err) {
			// couldn't open the file: the file's initial empty buffer is correct
			// so the file is ready
			return file.ready(cb)
		}
		// otherwise we must open the file
		file.open(stats.size, cb)
	})
}

/**
 * Put a file in the files object and add it to the cache queue. If the cache is full,
 * remove the oldest file from the cache.
 */
db.enqueue = function (file) {
	this.files[file.path] = file
	this.cache.set(file)
	if (this.cache.size > MAX_CACHE_SIZE) {
		this.dequeue()
	}
}

/**
 * Move a file to the end of the queue, prolonging its life in the cache
 */
db.requeue = function (file) {
	this.cache.delete(file)
	this.cache.set(file)
}

/**
 * Remove the oldest file from the cache and cache queue
 */
db.dequeue = function () {
	// this is only called if there are items in the cache, so iterator.next is always defined
	const file = this.cacheIterator.next().value[0]
	this.cache.delete(file)
	delete this.files[file.path]
}

module.exports = db

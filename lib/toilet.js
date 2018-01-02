/**
 * The toilet schedules flushes: one at a time
 */ 
const toilet = {
	flushing: false,
	queue: new Map()
}

/**
 * Schedule a flush
 */
toilet.flush = function (file) {
	if (this.queue.has(file)) {
		return
	}
	this.queue.set(file)
	if (!this.flushing) {
		this.flushAll()
	}
}

/**
 * Flush the queue
 */
toilet.flushAll = function (iter) {
	this.flushing = true
	const iterator = iter || this.queue[Symbol.iterator]()
	const next = iterator.next()
	if (next.value === undefined) {
		this.flushing = false
		return
	}
	// iterator.next gives us a key/value pair. we just want the key at value[0]
	const file = next.value[0]

	file.flush((err) => {
		if (err) {
			console.error('file flush error')
			console.error(err)
		}
		this.flushAll(iterator)
		this.queue.delete(file)
	})
}

module.exports = toilet

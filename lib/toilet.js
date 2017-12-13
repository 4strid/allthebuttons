const toilet = {
	flushing: false,
	queue: new Map()
}

toilet.flush = function (file) {
	console.log('toilet flushing')
	if (this.queue.has(file)) {
		return
	}
	this.queue.set(file)
	if (!this.flushing) {
		this.flushAll()
	}
}

toilet.flushAll = function (iter) {
	this.flushing = true
	const iterator = iter || this.queue[Symbol.iterator]()
	const next = iterator.next()
	console.log(next.value)
	if (next.value === undefined) {
		this.flushing = false
		console.log('finished flushing')
		return
	}
	// iterator.next gives us a key/value pair. we just want the key at value[0]
	const file = next.value[0]
	console.log(file)

	file.flush((err) => {
		if (err) {
			console.log('file flush error')
			console.log(err)
		}
		this.flushAll(iterator)
		this.queue.delete(file)
	})
}

module.exports = toilet

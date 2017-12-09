const fs = require('fs')

const { X, Y, CHUNK_SIZE, CHUNK_FILE_RATIO, BUTTONS_PER_BYTE, CHUNK_SIZE_BYTES, FILE_SIZE } = require('constants')

// a divided by b
// rounds up or down depending on if a is negative
function integerDivide (a, b) {
	return a < 0 ? Math.ceil(a / b) : Math.floor(a / b)
}

function File (path, size) {
	this.path = path
	this.size = size
	this.buffer = Buffer.alloc(FILE_SIZE)
	this.readyQ = []
	this.closeQ = []
	this.isReady = false
	if (this.size === 0) {
		this.ready()
	}
}

File.prototype.onReady = function (fn) {
	this.readyQ.push(fn)
}

File.prototype.ready = function (cb) {
	this.isReady = true
	for (const q of this.readyQ) {
		q(this)
	}
	if (cb) {
		cb(this)
	}
}

File.prototype.open = function (cb) {
	fs.open(this.path, 'r+', (err, fd) => {
		this.fd = fd
		fs.read(this.fd, this.buffer, 0, this.size, 0, (err, bytesRead, buffer) => {
			this.ready(cb)
		})
	})
}

File.prototype.localChunk = function (chunk) {
	return [chunk[X] % CHUNK_FILE_RATIO, chunk[Y] % CHUNK_FILE_RATIO]
}

File.prototype.getOffset = function (chunk, i) {
	const local = this.localChunk(chunk)
	const chunkOffset = local[Y] * CHUNK_FILE_RATIO * CHUNK_SIZE +
					    local[X] * CHUNK_SIZE
	const offset = chunkOffset + i
	return integerDivide(offset, BUTTONS_PER_BYTE)
}

File.prototype.load = function (chunk) {
	const offset = this.getOffset(chunk, 0)
	const buttons = []
	for (let i = 0; i < CHUNK_SIZE_BYTES; i++) {
		const byte = this.buffer[offset + i]
		for (let j = 0; j < BUTTONS_PER_BYTE; j++) {
			const bits = (byte << (j * 2)) & (128 + 64)
			console.log('bits ', bits)
			buttons.push(bits)
		}
	}
	return buttons.join('')
}

File.prototype.load = function (chunk, callback) {
	const offset = this.getOffset(chunk, 0)
	const end = offset + CHUNK_SIZE_BYTES
	let length = CHUNK_SIZE_BYTES
	if (end > this.size) {
		length = this.size - offset
	}
	const buffer = Buffer.alloc(CHUNK_SIZE_BYTES)
	fs.read(this.fd, buffer, 0, length, offset, (err, bytesRead, buffer) => {
		console.log(err)
		console.log(buffer)
		const buttons = []
		for (let i = 0; i < CHUNK_SIZE_BYTES; i++) {
			const byte = buffer[i]
			for (let j = 0; j < BUTTONS_PER_BYTE; j++) {
				const bits = (byte << (j * 2)) & (128 + 64)
				console.log('bits ', bits)
				buttons.push(bits)
			}
		}
		callback(null, buttons.join(''))
	})
}

File.prototype.press = function (press) {
	const localChunk = this.localChunk(press.chunk)
	const offset = this.getOffset(press.chunk, press.i)
	const buffer = Buffer.alloc(1)
	if (offset < this.size) {
		return fs.read(this.fd, buffer, 0, 1, offset, (err, bytesRead, buffer) => {
			console.log(buffer)
			const newBuffer = Buffer.alloc(1, 255)
			fs.write(this.fd, newBuffer, 0, 1, offset, (err, bytesWritten, buffer) => {
				console.log(buffer)
			})
		})
	}
	const padding = Buffer.alloc(offset - this.size)
	padding[offset - this.size - 1] = 255
	fs.write(this.fd, padding, 0, offset - this.size, this.size, (err, bytesWritten, buffer) => {
		console.log(err)
		console.log(buffer)
	})
}

File.prototype.onClose = function (cb) {
	this.closeQ.push(cb)
}

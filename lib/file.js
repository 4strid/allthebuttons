const fs = require('fs')
const _path = require('path')

const toilet = require('./toilet')

const { X, Y, CHUNK_SIZE, CHUNK_FILE_RATIO, BUTTONS_PER_BYTE, CHUNK_SIZE_BYTES, FILE_SIZE } = require('./constants')

const { CompactEncoding, ArrayEncoding } = require('./encoding')

// a divided by b
function integerDivide (a, b) {
	return Math.floor(a / b)
}

function File (path) {
	this.path = path
	this.size = 0
	this.buffer = Buffer.alloc(FILE_SIZE)
	this.readyQ = []
	this.closeQ = []
	this.isReady = false
}

File.prototype.onReady = function (fn) {
	this.readyQ.push(fn)
}

File.prototype.ready = function (cb) {
	this.isReady = true
	if (cb) {
		cb(this)
	}
	for (const q of this.readyQ) {
		q(this)
	}
	this.readyQ = []
}

File.prototype.open = function (size, cb) {
	fs.open(_path.join(__dirname, '../db', this.path), 'r+', (err, fd) => {
		this.fd = fd
		const fileBuffer = Buffer.allocUnsafe(size)
		fs.read(this.fd, fileBuffer, 0, size, 0, (err, bytesRead, buffer) => {
			let encoding
			if (size % 2 === 0) {
				// if size is even, file is compact encoded
				encoding = CompactEncoding
			} else {
				// otherwise array encoded
				encoding = ArrayEncoding
			}
			this.size = encoding.decode(fileBuffer, size, this.buffer)
			this.ready(cb)
		})
	})
}

File.prototype.localChunk = function (chunk) {
	let localX = chunk[X] % CHUNK_FILE_RATIO
	if (localX <  0) {
		localX = localX + 5
	}
	let localY = chunk[Y] % CHUNK_FILE_RATIO
	if (localY <  0) {
		localY = localY + 5
	}

	return [localX, localY]
}

File.prototype.getOffset = function (buffer) {
	const chunk = new Float64Array(buffer)
	const rest = new Uint8Array(buffer)
	const i = rest[CHUNK_SIZE_BYTES]
	const local = this.localChunk(chunk)
	const chunkOffset = local[Y] * CHUNK_FILE_RATIO * CHUNK_SIZE +
					    local[X] * CHUNK_SIZE
	const offset = integerDivide(chunkOffset + i, BUTTONS_PER_BYTE)
	return offset
}

File.prototype.isLongPress = function (buffer) {
	const data = new Uint8Array(buffer)
	return !!data[16]
}

File.prototype.load = function (buffer) {
	// if there is no file descriptor, the file is empty
	if (!this.fd) {
		return null
	}
	const offset = this.getOffset(buffer)

	// return 
	const buttons = Buffer.allocUnsafe(16 + CHUNK_SIZE_BYTES)
	Buffer.from(buffer).copy(buttons, 0, 0, 16)
	this.buffer.copy(buttons, 16, offset, offset + CHUNK_SIZE_BYTES)
	return buttons
}


// within each byte, buttons are stored from right to left

// 255 is all 1s, subtract out the powers of 2 to make them zeroes
// result is 0 is 11111100, 1 is 11110011, 2 is 11001111, 3 is 00111111
const button_masks = [255 - (1 + 2), 255 - (4 + 8), 255 - (16 + 32), 255 - (64 + 128)]

File.prototype.press = function (buffer) {
	const offset = this.getOffset(buffer)
	const longPress = this.isLongPress(buffer)
	
	// the byte that contains the button in question
	const byte = this.buffer[offset]
	// the position in the byte where the button is
	const button = press.i % BUTTONS_PER_BYTE

	// shift to correct position and & mask all but rightmost 2 bits
	const bits = (byte >> (button * 2)) & (1 + 2)
	// calculate resulting value of button
	const result = longPress ? bits ^ 2 : bits ^ 1
	// mask position of button in byte to 0s
	const zero_masked_byte = byte & button_masks[button]
	// shift value of button to correct position, copy it into the byte
	const new_byte = zero_masked_byte | (result << (button * 2))
	// copy new byte into buffer
	this.buffer[offset] = new_byte

	if (offset + 1 > this.size) {
		this.size = offset + 1
	}

	// schedule a flush to disk
	toilet.flush(this)
}

File.prototype.flush = function (cb) {
	if (this.fd) {
		this.writeFile(cb)
	} else {
		fs.open(_path.join(__dirname, '../db', this.path), 'w+', (err, fd) => {
			if (err) {
				console.log(err)
				cb(err)
			}
			this.fd = fd
			this.writeFile(cb)
		})
	}
}

File.prototype.writeFile = function (cb) {
	let src
	const arrayEncoded = ArrayEncoding.encode(this.buffer, this.size)
	const compactEncoded = CompactEncoding.encode(this.buffer, this.size)
	if (compactEncoded.size < arrayEncoded.size) {
		src = compactEncoded
	} else {
		src = arrayEncoded
	}
	fs.ftruncate(this.fd, err => {
		fs.write(this.fd, src.buffer, 0, src.size, 0, (err, bytesRead, buffer) => {
			cb(err)
			if (this.isClosing) {
				this.closeFile()
			}
		})
	})
}

File.prototype.close = function (cb) {
	this.isClosing = true
	this.onClose(cb)
}

File.prototype.closeFile = function () {
	fs.close(this.fd, err => {
		if (err) {
			console.log(err)
		}
		for (const q of this.closeQ) {
			q()
		}
		this.closeQ = []
	})
}

File.prototype.onClose = function (cb) {
	this.closeQ.push(cb)
}

module.exports = File


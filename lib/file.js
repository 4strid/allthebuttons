const fs = require('fs')

const toilet = require('./toilet')

const { X, Y, CHUNK_SIZE, CHUNK_FILE_RATIO, BUTTONS_PER_BYTE, CHUNK_SIZE_BYTES, FILE_SIZE } = require('./constants')

// a divided by b
// rounds up or down depending on if a is negative
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
		console.log('file is ready', this.path)
		q(this)
	}
	this.readyQ = []
}

File.prototype.open = function (size, cb) {
	this.size = size
	fs.open(__dirname + '/' + this.path, 'r+', (err, fd) => {
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
	const offset = chunkOffset + integerDivide(i, BUTTONS_PER_BYTE)
	return offset
}

File.prototype.load = function (chunk) {
	const offset = this.getOffset(chunk, 0)
	const buttons = []
	for (let i = 0; i < CHUNK_SIZE_BYTES; i++) {
		const byte = this.buffer[offset + i]
		for (let j = 0; j < BUTTONS_PER_BYTE; j++) {
			const bits = (byte >> (j * 2)) & (1 + 2)
			buttons.push(bits)
		}
	}
	return buttons.join('')
}


// within each byte, buttons are stored from right to left

// 255 is all 1s, subtract out the powers of 2 to make them zeroes
// result is 0 is 11111100, 1 is 11110011, 2 is 11001111, 3 is 00111111
const button_masks = [255 - (1 + 2), 255 - (4 + 8), 255 - (16 + 32), 255 - (64 + 128)]

File.prototype.press = function (press) {
	console.log('press is happening')
	const offset = this.getOffset(press.chunk, press.i)
	// the byte that contains the button in question
	const byte = this.buffer[offset]
	// the position in the byte where the button is
	const button = press.i % BUTTONS_PER_BYTE

	// shift to correct position and & mask all but rightmost 2 bits
	const bits = (byte >> (button * 2)) & (1 + 2)
	// calculate resulting value of button
	const result = press.long ? bits ^ 2 : bits ^ 1
	// mask position of button in byte to 0s
	const zero_masked_byte = byte & button_masks[button]
	// shift value of button to correct position, copy it into the byte
	const new_byte = zero_masked_byte | (result << (button * 2))
	// copy new byte into buffer
	this.buffer[offset] = new_byte

	if (offset > this.size) {
		this.size = offset
	}

	// schedule a flush to disk
	toilet.flush(this)
}

File.prototype.flush = function (cb) {
	if (this.fd) {
		this.writeFile(cb)
	} else {
		console.log('file flush')
		fs.open(__dirname + '/' + this.path, 'w+', (err, fd) => {
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
	fs.write(this.fd, this.buffer, 0, this.size, 0, (err, bytesRead, buffer) => {
		cb(err)
		if (this.isClosing) {
			this.closeFile()
		}
	})
}

File.prototype.close = function () {
	this.isClosing = true
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

const fs = require('fs')
const path = require('path')

const toilet = require('./toilet')
const stats = require('./statistics')

const { X, Y, CHUNK_SIZE, CHUNK_FILE_RATIO, BUTTONS_PER_BYTE, CHUNK_SIZE_BYTES, FILE_SIZE } = require('./constants')

function File (path) {
	// file path
	this.path = path
	// actual file size
	this.size = 0
	// contains all the buttons, all 0s by default
	this.buffer = Buffer.alloc(FILE_SIZE)
	// queue of operations to run once the file is ready
	this.readyQ = []
	// not ready yet
	this.isReady = false
}

 /*
  * Open the file for reading or writing
  */
File.prototype.fopen = function (mode, cb) {
	fs.open(path.join(__dirname, '../db', this.path), mode, cb)
}

 /*
  * Close the file after reading or writing
  */
File.prototype.fclose = function (fd, cb) {
	fs.close(fd, err => {
		// this should not fail
		console.error(err)
	})
}

 /*
  *Add an operation to the queue
  */
File.prototype.onReady = function (fn) {
	this.readyQ.push(fn)
}

 /*
  *Run the callback and all the operations in the queue
  */
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

 /*
  * Read in a file. Tries again if it fails
  */
File.prototype.open = function (size, cb) {
	this.fopen('r', (err, fd) => {
		if (err) {
			console.error(err)
			return setTimeout(() => {
				this.open(size, cb)
			}, 5)
		}
		fs.read(fd, this.buffer, 0, size, 0, (err, bytesRead, buffer) => {
			this.fclose(fd)
			if (err) {
				console.error(err)
				return setTimeout(() => {
					this.open(size, cb)
				}, 5)
			}
			this.size = size
			this.ready(cb)
		})
	})
}

 /*
  * Read in chunk coordinates from the first 16 bytes of the buffer
  */
File.prototype.getChunk = function (buffer) {
	const chunk = [buffer.readDoubleLE(0), buffer.readDoubleLE(8)]
	if (Number.isSafeInteger(chunk[X]) && Number.isSafeInteger(chunk[Y])) {
		return chunk
	}
	return null
}

 /*
  * Get the offset from the buffer by reading the chunk and the value of i
  */
File.prototype.getOffset = function (buffer) {
	const chunk = this.getChunk(buffer)
	let i = 0
	if (buffer.byteLength === 18) {
		const rest = buffer.readInt16LE(16)
		// 32767 is 0111 1111 1111 1111
		// we mask away the top bit
		i = rest & 32767
	}
	// ensure valid value of i
	if (!Number.isSafeInteger(i) || i < 0 || i >= 400) {
		return null
	}
	const local = this.localChunk(chunk)
	const chunkOffset = local[Y] * CHUNK_FILE_RATIO * CHUNK_SIZE +
					    local[X] * CHUNK_SIZE
	const offset = Math.floor((chunkOffset + i) / BUTTONS_PER_BYTE)
	return offset
}

 /*
  * The chunk coordinates within the file (from [0,0] to [4,4])
  */
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


 /*
  * Perform a load request on the file buffer
  */
File.prototype.load = function (buffer) {
	const offset = this.getOffset(buffer)
	// invalid offset
	if (offset === null) {
		return null
	}
	// rest of the buffer is all 0s
	if (this.size < offset) {
		const returnBuffer = new ArrayBuffer(16)
		const view = new Uint8Array(returnBuffer)
		for (let i = 0; i < 16; i++) {
			view[i] = buffer[i]
		}
		// return only the chunk coordinates
		return returnBuffer
	}

	// buffer containing the response
	const buttons = Buffer.allocUnsafe(16 + CHUNK_SIZE_BYTES)
	// copy chunk coordinates
	Buffer.from(buffer).copy(buttons, 0, 0, 16)
	// copy button data from file buffer
	this.buffer.copy(buttons, 16, offset, offset + CHUNK_SIZE_BYTES)


	// transform Buffer into native ArrayBuffer for transfer
	const returnBuffer = new ArrayBuffer(16 + CHUNK_SIZE_BYTES)
	const view = new Uint8Array(returnBuffer)
	for (let i = 0; i < 16 + CHUNK_SIZE_BYTES; i++) {
		view[i] = buttons[i]
	}

	return returnBuffer
}

// within each byte, buttons are stored from right to left

// 255 is all 1s, subtract out the powers of 2 to make them zeroes
// result is 0 is 11111100, 1 is 11110011, 2 is 11001111, 3 is 00111111
const button_masks = [255 - (1 + 2), 255 - (4 + 8), 255 - (16 + 32), 255 - (64 + 128)]

 /*
  * Perform a press operation on the file buffer, doing some bitwise tomfoolery
  */
File.prototype.press = function (buffer) {
	const offset = this.getOffset(buffer)
	if (offset === null) {
		return null
	}
	const data = buffer.readInt16LE(16)
	// 32767 is 0111 1111 1111 1111
	const i = data & 32767
	// longPress is stored in the highest bit
	const longPress = data >> 15
	
	// the byte that contains the button in question
	const byte = this.buffer[offset]
	// the position in the byte where the button is
	const button = i % BUTTONS_PER_BYTE

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

	// update statistics
	stats.update(bits, result)

	// return the buffer to be broadcast
	return buffer
}

 /*
  * Write the file to the disc
  */
File.prototype.flush = function (cb) {
	this.fopen('w', (err, fd) => {
		if (err) {
			return cb(err)
		}
		fs.write(fd, this.buffer, 0, this.size, 0, (err, bytesRead, buffer) => {
			if (err) {
				cb(err)
			}
			this.fclose(fd)
		})
	})
}

module.exports = File

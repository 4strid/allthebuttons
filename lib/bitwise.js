const { FILE_SIZE, BUTTONS_PER_BYTE } = require('./constants')

const ArrayEncoding = {
	encode: function (buffer, size) {
		let encodedSize = size
		// let encoded size always be odd
		if (size % 2 === 0) {
			encodedSize++
		}
		return {
			buffer: buffer,
			size: encodedSize
		}
	},
	decode: function (buffer, size, targetBuffer) {
		buffer.copy(targetBuffer, 0, 0, size)
	}
}

const CompactEncoding = {
	encode: function (buffer, size) {
		const encodedBuffer = Buffer.alloc(FILE_SIZE)
		let offset = 0
		unpack(buffer, size, (bits, i) => {
			if (bits === 0) {
				return
			}
			const addr1 = i >> 8
			const addr2 = i & 255
			const byte1 = addr1 | (bits << 6)
			const byte2 = addr2
			encodedBuffer[offset] = byte1
			encodedBuffer[offset + 1] = byte2
			offset += 2
		})

		return {
			buffer: encodedBuffer,
			size: offset
		}
	},
	decode: function (buffer, size, targetBuffer) {
		for (let i = 0; i < size; i += 2) {
			const byte1 = buffer[i]
			const byte2 = buffer[i + 1]
			const val = byte1 >> 6
			const addr1 = byte1 & (255 - (64 + 128))
			const addr2 = byte2
			const addr = (addr1 << 8) | addr2
			setBits(targetBuffer, addr, val)
		}
	}
}

function unpack (buffer, size, eachFn) {
	for (let i = 0; i < size; i++) {
		const byte = buffer[i]
		for (let j = 0; j < BUTTONS_PER_BYTE; j++) {
			const bits = (byte >> (j * 2)) & (1 + 2)
			eachFn(bits, i * BUTTONS_PER_BYTE + j)
		}
	}

}

function setBits (buffer, i, val) {
	const offset = integerDivide(i, BUTTONS_PER_BYTE)
	const btn = i % BUTTONS_PER_BYTE
	const byte = buffer[offset]
	const zero_masked_byte = byte & zero_masks[btn]
	const new_byte = zero_masked_byte | (val << (btn * 2))
	buffer[offset] = new_byte
}

module.exports = {
	ArrayEncoding,
	CompactEncoding
}

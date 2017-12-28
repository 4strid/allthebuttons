//const { FILE_SIZE, BUTTONS_PER_BYTE } = require('./constants')

//// buttons are stored as they are in memory

//const ArrayEncoding = {
	//encode: function (buffer, size) {
		//let encodedSize = size
		//// let encoded size always be odd
		//if (size % 2 === 0) {
			//encodedSize++
		//}
		//return {
			//buffer: buffer,
			//size: encodedSize
		//}
	//},
	//decode: function (buffer, size, targetBuffer) {
		//buffer.copy(targetBuffer, 0, 0, size)
		//return size
	//}
//}

//// buttons are stored as two bytes
//// 14 bit address and 2 bit color
//// bits labeled 'x' are the address, labeled 'y' are the color value
//// yyxxxxxx xxxxxxxx 
////   dcba98 76543210 

//const CompactEncoding = {
	//encode: function (buffer, size) {
		//const encodedBuffer = Buffer.allocUnsafe(FILE_SIZE)
		//let offset = 0
		//unpack(buffer, size, (bits, i) => {
			//if (bits === 0) {
				//return
			//}
			//// hi bits of address
			//const addr1 = i >> 8
			//// lo bits of address
			//const addr2 = i & 255
			//// hi bits with color |'d in at highest bits
			//const byte1 = addr1 | (bits << 6)
			//// lo bits
			//const byte2 = addr2
			//// store hi bits
			//encodedBuffer[offset] = byte1
			//// store lo bits
			//encodedBuffer[offset + 1] = byte2
			//offset += 2
		//})

		//return {
			//buffer: encodedBuffer,
			//size: offset
		//}
	//},
	//decode: function (buffer, size, targetBuffer) {
		//let offset = 0
		//for (let i = 0; i < size; i += 2) {
			//const byte1 = buffer[i]
			//const byte2 = buffer[i + 1]
			//const val = byte1 >> 6
			//const addr1 = byte1 & (255 - (64 + 128))
			//const addr2 = byte2
			//const addr = (addr1 << 8) | addr2
			//setBits(targetBuffer, addr, val)
			//offset = integerDivide(addr, BUTTONS_PER_BYTE)
		//}
		//return offset
	//}
//}

//function unpack (buffer, size, eachFn) {
	//for (let i = 0; i < size; i++) {
		//const byte = buffer[i]
		//for (let j = 0; j < BUTTONS_PER_BYTE; j++) {
			//const bits = (byte >> (j * 2)) & (1 + 2)
			//eachFn(bits, i * BUTTONS_PER_BYTE + j)
		//}
	//}

//}

//const zero_masks = [255 - (1 + 2), 255 - (4 + 8), 255 - (16 + 32), 255 - (64 + 128)]

//function setBits (buffer, i, val) {
	//const offset = integerDivide(i, BUTTONS_PER_BYTE)
	//const btn = i % BUTTONS_PER_BYTE
	//const byte = buffer[offset]
	//const zero_masked_byte = byte & zero_masks[btn]
	//const new_byte = zero_masked_byte | (val << (btn * 2))
	//buffer[offset] = new_byte
//}

//module.exports = {
	//ArrayEncoding,
	//CompactEncoding
//}

//// a divided by b
//function integerDivide (a, b) {
	//return Math.floor(a / b)
//}

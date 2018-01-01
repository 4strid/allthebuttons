// chunks are stored as arrays [X, Y]
const X = 0
const Y = 1
// 20 by 20 buttons
const CHUNK_SIZE = 20 * 20
// File is 100 to a side, chunk is 20
const CHUNK_FILE_RATIO = 100 / 20
// Each button is 2 bits
const BUTTONS_PER_BYTE = 4
// Number of bytes in a chunk
const CHUNK_SIZE_BYTES = CHUNK_SIZE / BUTTONS_PER_BYTE
// Number of bytes in a file
const FILE_SIZE = 100 * 100 / BUTTONS_PER_BYTE
// Number of files to keep in the cache
const MAX_CACHE_SIZE = 10000

module.exports = {
	X, Y, CHUNK_SIZE, CHUNK_FILE_RATIO, BUTTONS_PER_BYTE, CHUNK_SIZE_BYTES, FILE_SIZE, MAX_CACHE_SIZE
}

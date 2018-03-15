const fs = require('fs')
const path = require('path')

const filepath = path.join(__dirname, '../db', 'statsitics.db')

/**
 * The statistics object: just keeps track of how many buttons of each color have been pressed
 */
const statistics = {
	buttons: {
		green: 0,
		blue: 0,
		red: 0
	}
}

/**
 * Attempt to load the file.
 */
statistics.load = function () {
	try {
		const stats = fs.readFileSync(filepath, 'utf8')
		this.buttons = JSON.parse(stats)
	} catch (e) {
		// if the statistics file has not been written yet, that is ok
	}
}

// convert between button color code and color name
const key = {
	1: 'green',
	2: 'blue',
	3: 'red'
}

/**
 * Every button press goes through this function. If the old or new color is anything but white
 * decrement the old color, and increment the new color.
 */
statistics.update = function (old, _new) {
	// 0 is white, which we are not concerned with
	if (old > 0) {
		this.buttons[key[old]] -= 1
	}
	if (_new > 0) {
		this.buttons[key[_new]] += 1
	}
}

/**
 * Periodically save the statistics file to the disk.
 */
statistics.save = function () {
	const stats = JSON.stringify(this.buttons)
	fs.writeFile(filepath, stats, function (err) {
		if (err) {
			console.err(err)
		}
	})
}

setInterval(function () {
	statistics.save()
}, 10000)

module.exports = statistics

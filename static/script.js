(function () {

	const CENTER = 800000
	const PANEL = 1300

	const X = 0
	const Y = 1

	if ('scrollRestoration' in history) {
		history.scrollRestoration = 'manual'
	}

	document.body.style.width = 2 * CENTER + 'px'
	document.body.style.height = 2 * CENTER + 'px'

	window.scroll(CENTER, CENTER)

	const escroll = new EdgeScroll(100, 750)

	var socket = io();

	const colors = ['zero', 'green', 'blue', 'red']

	function Button (parent, index) {
		this.color = 0;
		this.el = document.createElement('button');
		this.el.className = 'i' + index
		this.parent = parent
		this.i = index
		this.updateColor()
	}
	Button.prototype = {
		press: function () {
			this.color = this.color ^ 1;
			this.updateColor();
		},
		longpress: function () {
			this.color = this.color ^ 2;
			this.updateColor();
		},
		updateColor: function () {
			colors.forEach(color => this.el.classList.remove(color))
			this.el.classList.add(colors[this.color])
		},
		setColor: function (color) {
			this.color = Number(color);
			this.updateColor();
		},
		mousedown: function (event) {
			this.pressed = true;
			this.timeout = setTimeout(() => {
				this.longpress();
				socket.emit('p', {chunk: this.parent.chunk[X] + ':' + this.parent.chunk[Y], i: this.i, long: true});
				this.pressed = false;
			}, 400);
		},
		mouseup: function () {
			if (this.pressed) {
				clearTimeout(this.timeout);
				this.press();
				socket.emit('p', {chunk: this.parent.chunk[X] + ':' + this.parent.chunk[Y], i: this.i});
				this.pressed = false;
			}
		},
	};

	// 20x20
	// chunk is the serverside chunk to send data to/from
	// x, y are the panel's position on the page
	function Panel (chunk, x, y) {
		this.buttons = [];
		this.el = document.createElement('div');

		this.chunk = chunk

		this.x = CENTER + x * PANEL + 0.5
		this.y = CENTER + y * PANEL + 0.5 

		this.el.style.left = this.x + 'px'
		this.el.style.top = this.y + 'px'

		this.emitRequest()

		for (var i = 0; i < 400; i++) {
			var button = new Button(this, i);
			this.buttons[i] = button;
			this.el.appendChild(button.el);
		}
		this.el.addEventListener('mousedown', event => {
			if (event.target.type) {
				this.findButton(event.target).mousedown()
			}
		})

		this.el.addEventListener('mouseup', event => {
			if (event.target.type) {
				this.findButton(event.target).mouseup()
			}
		})

		this.el.addEventListener('touchstart', event => {
			if (event.target.type) {
				this.findButton(event.target).mousedown()
			}
		})

		this.el.addEventListener('touchend', event => {
			event.preventDefault();
			if (event.target.type) {
				this.findButton(event.target).mouseup()
			}
		})

		document.getElementsByTagName('main')[0].appendChild(this.el);
	}

	Panel.prototype.findButton = function (target) {
		const i = target.className
						.split(' ')
						.filter(cls => cls[0] === 'i')[0]
						.replace('i','')
		return this.buttons[i]
	}

	Panel.prototype.recycle = function (chunk, x, y) {
		this.chunk = chunk

		this.x = CENTER + x * PANEL + 0.5
		this.y = CENTER + y * PANEL + 0.5 

		this.el.style.left = this.x + 'px'
		this.el.style.top = this.y + 'px'

		this.emitRequest()

		return this
	}

	Panel.prototype.emitRequest = function () {
		//const buffer = new ArrayBuffer(16)
		//const data = new DataView(buffer)
		//data.setFloat64(0, this.chunk[X], true)
		//data.setFloat64(8, this.chunk[Y], true)
		socket.emit('r', this.chunk[X] + ':' + this.chunk[Y])
	}

	Panel.prototype.hide = function () {
		if (this.hidden) {
			return
		}
		this.hidden = true
		this.el.style.display = 'none'
	}
	Panel.prototype.show = function () {
		if (!this.hidden) {
			return
		}
		this.hidden = false
		this.el.style.display = 'block'
	}

	function View (xpos, ypos) {
		this.position = [xpos, ypos]
		this.origin = [xpos, ypos]
		this.live = {}
		this.pool = []
		this.surroundingChunks = function (position) {
			var chunks = []
			for (let x = position[X] - 1; x <= position[X] + 2; x++) {
				for (let y = position[Y] - 1; y <= position[Y] + 1; y++) {
					chunks.push([x, y])
				}
			}
			return chunks
		}
		// adds all chunks to self. skips chunks that are already defined
		this.addChunks = function (chunks) {
			chunks.forEach(chunk => {
				const x = this.live[chunk[X]] = this.live[chunk[X]] || {}
				if (x[chunk[Y]]) {
					return
				}
				const pageX = chunk[X] - this.origin[X]
				const pageY = chunk[Y] - this.origin[Y]
				if (this.pool.length > 0) {
					const panel = this.pool.pop()
					x[chunk[Y]] = panel.recycle(chunk, pageX, pageY)
					return
				}
				x[chunk[Y]] = new Panel(chunk, pageX, pageY)
			})
		}
		// removes all chunks not in savedChunks
		this.removeChunks = function (savedChunks) {
			for (const x in this.live) {
				for (const y in this.live[x]) {
					if (!find(x, y)) {
						//document.getElementsByTagName('main')[0].removeChild(this.live[x][y].el)
						this.pool.push(this.live[x][y])
						delete this.live[x][y]
					}
				}
				if (Object.keys(this.live[x]).length === 0) {
					delete this.live[x]
				}
			}
			function find (x, y) {
				return savedChunks.filter(chunk => x == chunk[X] && y == chunk[Y] ).length
			}
		}
		this.loadSurroundings = function () {
			const chunks = this.surroundingChunks(this.position)
			this.removeChunks(chunks)
			this.addChunks(chunks)
		}
		this.scroll = function (scrollX, scrollY, innerWidth, innerHeight) {
			if (scrollX < 200 || scrollX > CENTER * 2 - 200 ||
				scrollY < 200 || scrollY > CENTER * 2 - 200) {
				// teleport takes button coordinates
				const xBtn = this.origin[X] * 20 + Math.round((scrollX - CENTER) / 65)
				const yBtn = this.origin[Y] * 20 + Math.round((scrollY - CENTER) / 65)
				return this.teleport(xBtn, yBtn)
			}
			// panel coordinates
			const x = Math.round((scrollX - CENTER) / 1300)
			const y = Math.round((scrollY - CENTER) / 1300)

			if (this.origin[X] + x !== this.position[X] || this.origin[Y] + y !== this.position[Y]) {
				this.position = [this.origin[X] + x, this.origin[Y] + y]
				this.loadSurroundings()
			}

			this.determineViewportIntersections(scrollX, scrollY, innerWidth, innerHeight)
		}
		this.getPanel = function (chunk) {
			if (!this.live[chunk[X]]) {
				return null
			}
			if (!this.live[chunk[X]][chunk[Y]]) {
				return null
			}
			return this.live[chunk[X]][chunk[Y]]
		}
		this.getBounds = function (x, y, w, h) {
			return {
				top: y,
				right: x + w,
				bottom: y + h,
				left: x
			}
		}
		this.determineViewportIntersections = function (scrollX, scrollY, innerWidth, innerHeight) {
			const windowBounds = this.getBounds(scrollX, scrollY, innerWidth, innerHeight)
			for (const x in this.live) {
				for (const y in this.live[x]) {
					const panel = this.live[x][y]
					const panelBounds = this.getBounds(panel.x, panel.y, PANEL, PANEL)
					if (windowBounds.top > panelBounds.bottom ||
					    windowBounds.right < panelBounds.left ||
						windowBounds.bottom < panelBounds.top ||
						windowBounds.left > panelBounds.right) {
						// invisible
						panel.hide()
					} else {
						panel.show()
					}
				}
			}
		}
		this.teleport = function (x, y) {
			if (x > Number.MAX_SAFE_INTEGER ||
				x < Number.MIN_SAFE_INTEGER ||
				y > Number.MAX_SAFE_INTEGER ||
				y < Number.MIN_SAFE_INTEGER) {
				return 'ok, you got me. the grid isn\'t really infinite, or at least your client can only address it up to the maximum or minimum integer values of Javascript'
			}
			this.origin = [Math.floor(x / 20), Math.floor(y / 20)]
			escroll.scroll(CENTER + (x % 20) * 65, CENTER + (y % 20) * 65)
			this.scroll()
			return `ok. teleporting to ${x} ${y}`
		}
		window.teleport = this.teleport.bind(this)

		this.loadSurroundings()
	}


	const view = new View(0, 0)


	escroll.onScroll(function (scrollX, scrollY, innerWidth, innerHeight) {
		view.scroll(scrollX, scrollY, innerWidth, innerHeight)
	})

	socket.on('d', function (buffer) {
		const chunk = getChunk(buffer)
		const panel = view.getPanel(chunk)
		if (panel !== null) {
			if (buffer.byteLength === 16) {
				return panel.buttons.forEach(function (button) {
					button.setColor(0)
				})
			}

			const chunk = getChunk(buffer)
			const buttons = new Uint8Array(buffer, 16, 100)

			// unpack the bits from the bytes
			for (let i = 0; i < 100; i++) {
				const byte = buttons[i]
				for (let j = 0; j < 4; j++) {
					// right shift to align the position of the button in the byte to the lowest 2 bits
					// & (1 + 2) masks all but the lowest two bits, yielding a two bit number value
					const bits = (byte >> (j * 2)) & (1 + 2)
					panel.buttons[i * 4 + j].setColor(bits)
				}
			}
		}
	});

	socket.on('p', function (buffer) {
		const data = new DataView(buffer)
		const chunk = getChunk(buffer)
		const rest = data.getUint16(16, true)
		// 32767 is 0111 1111 1111 1111
		const i = rest & 32767
		const long = rest >> 15
		const panel = view.getPanel(chunk)
		if (panel !== null) {
			var button = panel.buttons[i];
			if (long) {
				return button.longpress()
			}
			button.press()
		}
	});

	function getChunk (buffer) {
		const data = new DataView(buffer)
		return [data.getFloat64(0, true), data.getFloat64(8, true)]
	}

	function serializePress (chunk, i, long) {
		let longBit = 0
		if (long) {
			longBit = 1
		}
		const buffer = new ArrayBuffer(16 + 2)
		const data = new DataView(buffer)

		data.setFloat64(0, chunk[X], true)
		data.setFloat64(8, chunk[Y], true)

		const bytes = i | (longBit << 15)
		console.log(bytes.toString(2))
		data.setUint16(16, bytes, true)

		return buffer
	}
})();

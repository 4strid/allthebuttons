(function () {

	const CENTER = 800000
	const PANEL = 1300

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
				socket.emit('press', {chunk: this.parent.chunk, i: this.i, long:true});
				this.pressed = false;
			}, 400);
		},
		mouseup: function () {
			if (this.pressed) {
				clearTimeout(this.timeout);
				this.press();
				socket.emit('press', {chunk: this.parent.chunk, i: this.i});
				this.pressed = false;
			}
		}
	};

	// 20x20
	// chunk is the serverside chunk to send data to/from
	// x, y are the panel's position on the page
	function Panel (chunk, x, y) {
		this.buttons = [];
		this.el = document.createElement('div');

		this.update(chunk, x, y)

		socket.emit('request', chunk)
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

	Panel.prototype.update = function (chunk, x, y) {
		this.chunk = chunk

		this.x = CENTER + x * PANEL + 0.5
		this.y = CENTER + y * PANEL + 0.5 

		this.el.style.left = this.x + 'px'
		this.el.style.top = this.y + 'px'
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
		const X = 0
		const Y = 1

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
			console.log(this.pool.length)
			chunks.forEach(chunk => {
				const x = this.live[chunk[X]] = this.live[chunk[X]] || {}
				if (x[chunk[Y]]) {
					return
				}
				if (this.pool.length > 0) {
					const panel = this.pool.pop()
					panel.update(chunk, chunk[X] - this.origin[X], chunk[Y] - this.origin[Y])
					return x[chunk[Y]] = panel
				}
				x[chunk[Y]] = new Panel(chunk, chunk[X] - this.origin[X], chunk[Y] - this.origin[Y])
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
				return savedChunks.filter(chunk => {
					const result = x == chunk[X] && y == chunk[Y] 
					return result
				}).length
			}
		}
		this.loadSurroundings = function () {
			const chunks = this.surroundingChunks(this.position)
			this.removeChunks(chunks)
			this.addChunks(chunks)
		}
		this.scroll = function () {
			const scrollX = escroll.scrollX
			const scrollY = escroll.scrollY
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

			this.determineViewportIntersections()
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
		this.determineViewportIntersections = function () {
			const windowBounds = this.getBounds(escroll.scrollX, escroll.scrollY, escroll.innerWidth, escroll.innerHeight)
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


	window.addEventListener('scroll', function (evt) {
		view.scroll()
	})

	socket.on('data', function (res) {
		//if ()
		const panel = view.getPanel(res.chunk)
		if (panel !== null) {
			const buttons = res.data.split('')
			for (var i in buttons) {
				panel.buttons[i].setColor(buttons[i]);
			}
		}
	});

	socket.on('press', function (press) {
		const panel = view.getPanel(press.chunk)
		if (panel !== null) {
			var button = panel.buttons[press.i];
			if (press.long) {
				return button.longpress()
			}
			button.press()
		}
	});


})();

(function () {

	const CENTER = 800000

	if ('scrollRestoration' in history) {
		history.scrollRestoration = 'manual'
	}

	document.body.style.width = 2 * CENTER + 'px'
	document.body.style.height = 2 * CENTER + 'px'

	var socket = io();

	const colors = ['zero', 'green', 'blue', 'red']

	function Button (chunk, index) {
		this.color = 0;
		this.el = document.createElement('button');
		this.el.className = 'i' + index
		this.chunk = chunk
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
				socket.emit('press', {chunk: this.chunk, i: this.i, long:true});
				this.pressed = false;
			}, 400);
		},
		mouseup: function () {
			if (this.pressed) {
				clearTimeout(this.timeout);
				this.press();
				socket.emit('press', {chunk: this.chunk, i: this.i});
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
		socket.emit('request', chunk)
		for (var i = 0; i < 400; i++) {
			var button = new Button(chunk, i);
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

		this.el.style.top = CENTER + y * 1300 + 0.5 + 'px'
		this.el.style.left = CENTER + x * 1300 + 0.5 + 'px'
		document.getElementsByTagName('main')[0].appendChild(this.el);
	}

	Panel.prototype.findButton = function (target) {
		const i = target.className
						.split(' ')
						.filter(cls => cls[0] === 'i')[0]
						.replace('i','')
		return this.buttons[i]
	}

	function View (xpos, ypos) {
		const X = 0
		const Y = 1

		this.position = [xpos, ypos]
		this.origin = [xpos, ypos]
		this.live = {}
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
				x[chunk[Y]] = new Panel(chunk, chunk[X] - this.origin[X], chunk[Y] - this.origin[Y])
			})
		}
		// removes all chunks not in savedChunks
		this.removeChunks = function (savedChunks) {
			for (const x in this.live) {
				for (const y in this.live[x]) {
					if (!find(x, y)) {
						document.getElementsByTagName('main')[0].removeChild(this.live[x][y].el)
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
			this.addChunks(chunks)
			this.removeChunks(chunks)
		}
		this.scroll = function () {
			// panel coordinates
			const x = Math.round((window.scrollX - CENTER) / 1300)
			const y = Math.round((window.scrollY - CENTER) / 1300)

			this.position = [this.origin[X] + x, this.origin[Y] + y]

			if (window.scrollX < 200 || window.scrollX > CENTER * 2 - 200 ||
				window.scrollY < 200 || window.scrollY > CENTER * 2 - 200) {
				// teleport takes button coordinates
				const xBtn = this.origin[X] * 20 + Math.round((window.scrollX - CENTER) / 65)
				const yBtn = this.origin[Y] * 20 + Math.round((window.scrollY - CENTER) / 65)
				return this.teleport(xBtn, yBtn)
			}
			this.loadSurroundings()
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
		this.teleport = function (x, y) {
			if (x > Number.MAX_SAFE_INTEGER ||
				x < Number.MIN_SAFE_INTEGER ||
				y > Number.MAX_SAFE_INTEGER ||
				y < Number.MIN_SAFE_INTEGER) {
				return 'ok, you got me. the grid isn\'t really infinite, or at least your client can only address it up to the maximum or minimum integer values of Javascript'
			}
			this.origin = [Math.floor(x / 20), Math.floor(y / 20)]
			window.scroll(CENTER + (x % 20) * 65, CENTER + (y % 20) * 65)
			this.scroll()
			return `ok. teleporting to ${x} ${y}`
		}
		window.teleport = this.teleport.bind(this)

		this.loadSurroundings()
	}


	const view = new View(0, 0)

	window.scroll(CENTER, CENTER)

	//window.addEventListener('scroll', function (evt) {
		//view.scroll()
	//})

	const RADIUS = 100
	const PPX = 750 // pixels per second
	let proximity
	let scrolling = false
	let lastTime
	let clientX
	let clientY

	// a nice curve from 0 to 1
	// v = (-p + 1) ** N
	function clamped_velocity (proximity) {
		const N = 6
		const p = proximity / RADIUS
		return (p * -1/2 + 1) ** N
	}

	function scrollTick (time) {
		const elapsed = lastTime ? time - lastTime : 0
		//console.log('lt', lastTime)
		//console.log('t', time)
		//console.log('e', elapsed)
		lastTime = time

		if (scrolling === false) {
			return lastTime = 0
		}

		const centerX = window.innerWidth / 2
		const centerY = window.innerHeight / 2
		const heading = {
			x: clientX - centerX,
			y: clientY - centerY
		}
		const magnitude = Math.sqrt(heading.x ** 2 + heading.y ** 2)
		const normalized_heading = {
			x: heading.x / magnitude,
			y: heading.y / magnitude
		}
		const velocity = {
			x: normalized_heading.x * PPX * clamped_velocity(proximity),
			y: normalized_heading.y * PPX * clamped_velocity(proximity),
		}
		window.scrollBy(velocity.x * elapsed / 1000, velocity.y * elapsed / 1000)

		view.scroll()

		window.requestAnimationFrame(scrollTick)
	}

	document.addEventListener('mouseout', function (evt) {
		console.log(evt.relatedTarget)
		if (evt.relatedTarget === null) {
			scrolling = false
		}
	})

	window.addEventListener('mousemove', function (evt) {
		clientX = evt.clientX
		clientY = evt.clientY
		const px1 = evt.clientX - 0
		const px2 = window.innerWidth - evt.clientX
		const px3 = evt.clientY - 0
		const px4 = window.innerHeight - evt.clientY
		proximity = Math.min(px1, px2, px3, px4)
		if (proximity < RADIUS) {
			if (!scrolling) {
				scrolling = true
				window.requestAnimationFrame(scrollTick)
			}
		} else {
			scrolling = false
			lastTime = 0
		}
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

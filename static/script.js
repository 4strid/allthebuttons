(function () {

	const CENTER = 8000000

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
	function Panel (x, y) {
		this.buttons = [];
		this.location = [x, y]
		this.el = document.createElement('div');
		socket.emit('request', this.location)
		for (var i = 0; i < 400; i++) {
			var button = new Button(this.location, i);
			this.buttons[i] = button;
			this.el.appendChild(button.el);
		}
		this.el.addEventListener('mousedown', event => {
			console.log('mousedown')
			console.log(event.target)
			this.findButton(event.target).mousedown()
		})

		this.el.addEventListener('mouseup', event => {
			this.findButton(event.target).mouseup()
		})

		this.el.addEventListener('touchstart', event => {
			this.findButton(event.target).mousedown()
		})

		this.el.addEventListener('touchend', event => {
			event.preventDefault();
			this.findButton(event.target).mouseup()
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
		console.log(i, this.buttons[i])
		return this.buttons[i]
	}

	function View (xpos, ypos) {
		const X = 0
		const Y = 1
		this.position = [xpos, ypos]
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
				x[chunk[Y]] = new Panel(chunk[X], chunk[Y])
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
			const x = Math.round((window.scrollX - CENTER) / 1300)
			const y = Math.round((window.scrollY - CENTER) / 1300)
			this.position = [x, y]
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

		this.loadSurroundings()
	}


	const view = new View(0, 0)

	window.scroll(CENTER, CENTER)

	window.addEventListener('scroll', function (e) {
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
			press.long ? button.longpress() : button.press();
		}
	});


})();

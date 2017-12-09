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
			this.color = color;
			this.updateColor();
		},
		mousedown: function (event) {
			this.pressed = true;
			this.timeout = setTimeout(() => {
				this.longpress();
				socket.emit('press', {chunk: this.chunk, i: this.index, long:true});
				this.pressed = false;
			}, 400);
		},
		mouseup: function () {
			if (this.pressed) {
				clearTimeout(this.timeout);
				this.press();
				socket.emit('press', {chunk: this.chunk, id: this.id});
				this.pressed = false;
			}
		}
	};

	// 20x20
	function Panel (x, y) {
		this.buttons = [];
		this.location = [x, y]
		this.el = document.createElement('div');
		for (var i = 0; i < 400; i++) {
			var button = new Button(this.location, i);
			this.buttons[i] = button;
			this.el.appendChild(button.el);
		}
		this.el.addEventListener('mousedown', event => {
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

		this.loadSurroundings()
	}


	const view = new View(0, 0)

	window.scroll(CENTER, CENTER)

	window.addEventListener('scroll', function (e) {
		view.scroll()
	})

	socket.on('load', function (data) {
		for (var i in data) {
			panel.buttons[i].setColor(data[i]);
		}
	});

	socket.on('press', function (press) {

		var button = panel.buttons[press.id];
		press.long ? button.longpress() : button.press();
	});


})();

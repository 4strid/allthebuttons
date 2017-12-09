(function () {

	var socket = io();

	var colors = ['#eee', '#5f5', '#55f', '#f55'];

	function Button (panel, id) {
		this.color = 0;
		this.id = id;
		var el = document.createElement('button');
		this.el = el;
		el.addEventListener('touchstart', (function (event) {
			this.mousedown();
		}).bind(this));
		el.addEventListener('touchend', (function (event) {
			event.preventDefault();
			this.mouseup();
		}).bind(this));
		el.addEventListener('mousedown', this.mousedown.bind(this));
		el.addEventListener('mouseup', this.mouseup.bind(this));
		//el.onmousedown = this.onmousedown.bind(this);
		//el.onmouseup = this.onmouseup.bind(this);
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
			this.el.style.backgroundColor = colors[this.color];
		},
		setColor: function (color) {
			this.color = color;
			this.updateColor();
		},
		mousedown: function (event) {
			var self = this;
			self.pressed = true;
			self.timeout = setTimeout(function() {
				self.longpress();
				socket.emit('press', {id: self.id, long:true});
				self.pressed = false;
			}, 400);
		},
		mouseup: function () {
			if (this.pressed) {
				clearTimeout(this.timeout);
				this.press();
				socket.emit('press', {id: this.id});
				this.pressed = false;
			}
		}
	};

	function Panel (x, y) {
		this.buttons = [];
		var el = document.createElement('div');
		for (var i = 0; i < 100; i++) {
			var button = new Button(this, i);
			this.buttons[i] = button;
			el.appendChild(button.el);
			if (i % 10 === 9) {
				br = document.createElement('br');
				el.appendChild(br);
			}
		}
		document.body.appendChild(el);
	}

	function Panel40 () {
		this.buttons = [];
		var el = document.createElement('div');
		for (var i = 0; i < 1600; i++) {
			var button = new Button(this, i);
			this.buttons[i] = button;
			el.appendChild(button.el);
			if (i % 40 === 39) {
				br = document.createElement('br');
				el.appendChild(br);
			}
		}
		document.body.appendChild(el);
	}

	function Fuckton () {
		for (var i = 0; i < 1000; i++) {
			var button = new Button(null, i);
			document.body.appendChild(button.el);
		}
	}

	panel = new Panel40();


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

(function () {

	function EdgeScroll (radius, speed) {
		this.radius = radius //distance from the edge to start scrolling
		this.speed = speed // pixels per second
		this.scrolling = false
		this.proximity = null
		this.clientX = null
		this.clientY = null
		this.scrollX = window.scrollX
		this.scrollY = window.scrollY
		this.innerWidth = window.innerWidth
		this.innerHeight = window.innerHeight
		
		this.clampedVelocity = function () {
			const N = 6
			const p = this.proximity / this.radius
			return (p * -1/2 + 1) ** N
		}

		this.scrollTick = (function (time) {
			const elapsed = this.lastTime ? time - this.lastTime : 0
			this.lastTime = time
			
			if (elapsed > 20) {
				console.log('slowed down!', elapsed)
			}

			if (this.scrolling === false) {
				return this.lastTime = 0
			}

			const centerX = this.innerWidth / 2
			const centerY = this.innerHeight / 2

			const headingX = this.clientX - centerX
			const headingY = this.clientY - centerY

			const magnitude = Math.sqrt(headingX ** 2 + headingY ** 2)
			const normalizedX = headingX / magnitude
			const normalizedY = headingY / magnitude

			const velocityX = normalizedX * this.speed * this.clampedVelocity()
			const velocityY = normalizedY * this.speed * this.clampedVelocity()
			window.scrollBy(Math.round(velocityX * elapsed / 1000), Math.round(velocityY * elapsed / 1000))
			this.scrollX = window.scrollX
			this.scrollY = window.scrollY
			this.innerWidth = window.innerWidth
			this.innerHeight = window.innerHeight

			window.requestAnimationFrame(this.scrollTick)
		}).bind(this)

		this.scroll = function (x, y) {
			window.scroll(x, y)
			this.scrollX = window.scrollX
			this.scrollY = window.scrollY
			this.innerWidth = window.innerWidth
			this.innerHeight = window.innerHeight
		}

		const scroll = this

		document.addEventListener('mouseout', function (evt) {
			if (evt.relatedTarget === null) {
				scroll.scrolling = false
			}
		})

		document.addEventListener('mousemove', function (evt) {
			scroll.clientX = evt.clientX
			scroll.clientY = evt.clientY
			const px1 = evt.clientX - 0
			const px2 = scroll.innerWidth - evt.clientX
			const px3 = evt.clientY - 0
			const px4 = scroll.innerHeight - evt.clientY
			scroll.proximity = Math.min(px1, px2, px3, px4)
			if (scroll.proximity < scroll.radius) {
				if (!scroll.scrolling) {
					scroll.scrolling = true
					window.requestAnimationFrame(scroll.scrollTick)
				}
			} else {
				scroll.scrolling = false
			}
		})
	}
	window.EdgeScroll = EdgeScroll
})()

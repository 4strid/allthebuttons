# AllTheButtons.io

All The Buttons is a web app / art project which consists of an infinite grid of buttons that users can press to change colors, broadcasting their presses immediately to anyone else connected to the app. Pressing a white button turns it green, and long pressing turns it blue. Red is obtained by both pressing and long pressing a button. The buttons are stored in a custom built database that stores 4 buttons per byte to minimize file size.

History
-------
All The Buttons began when I was first getting into web development many years ago, as a 20 by 20 grid of buttons that changed colors when you pushed them that I made in notepad during training at a dead-end call center job. It was inspired by my APC20 MIDI controller which has buttons which light up when you press them (well, it does music stuff too, but that's not the point). In the app, by pressing or long pressing the buttons, you could change them between 4 color states: white, green, blue, and red. Training finished, and I started having to actually do work at my job. The project sat in a folder on my computer for many years.

Later, I was invited to an art meetup where you could showcase a piece of original art. Since my main talent is web development, I thought it would be cool to bring an interactive demo that people could play on their phones and I resurrected the buttons project as a socket.io application of an 80 by 80 grid that broadcast presses live to everyone connected to the app. At the time, I thought it would be cool to make it much larger: the original goal was a 100,000 by 100,000 grid of buttons totalling 100 million buttons. It sat in the folder for a while longer.

When I came back to it, I observed that each button has only 4 possible color states, meaning it could be stored on disk using only 2 bits. 100 million buttons could be stored in a single database file that was less than 200 MB in size. Writing such a database would be no challenge at all, so I upped the ante: why not try and make an *infinite* panel of buttons.

Basics
------
A button's color is a 2 bit number, 00 for white, 01 for green, 10 for blue, and 11 for red. To switch between the two, a short press XORs the value by 1, and a long press XORs the value by 2. The net result is a 2 by 2 grid where short presses move you horizontally and long presses move you vertically.

![button presses diagram](https://raw.githubusercontent.com/cutejs/allthebuttons.io/master/readme/button-presses.png)

Bitwise shenanigans are at the heart of the project.

Front End
---------
The front end came first: I split up the grid into 20 by 20 button panels positioned absolutely on a massive web page (over 1 million by 1 million pixels big). As the user scrolls around, new panels are loaded into view and old panels no longer in view are removed. This leads to a very large grid, but to go truly infinite, we need to be able to scroll well past the edge of 1 million pixels.

To accomplish this, I added the ability to teleport to any point in the grid, centering the view on that point. When the user reaches the end, they're teleported to their current position, centering the page about that point, and allowing them to continue to scroll as what used to be the edge is now the center.

I wrote a module to make scrolling in any direction easier by implementing edge scrolling. If you've ever played The Sims, it's like how the camera behaves in that game, scrolling the view when the mouse is near the edges of the screen. It will be available on NPM as soon as I figure out why they won't let me publish a module named "edge-scroll". In the meanwhile, you can find it on [GitHub](https://github.com/cutejs/edgescroll).

Back End
--------
The back end is a Node web server using the Diet.js framework, which I chose over Express for its native support of virtual hosting, so I can serve a bunch of websites from one server without bothering with something like a reverse proxy. More specifically, I'm able to serve it alongside other websites in my [diet-vhost](https://github.com/cutejs/diet-vhost) platform.

Socket.io is used to transfer button data and button presses to and from the server.

The database handles files which contain 10,000 buttons each (100 by 100 buttons), and sends the data to and from the frontend in 20 by 20 button chunks. When a press comes in, first it is determined which file the chunk belongs to, the file is loaded and cached, and then the bitwise chicanery is done to update the individual button state. Subsequent reads/writes to that file don't need to hit the disk, until the file is untouched for long enough for it to fall out of the cache. Changes are flushed to the disk using what I call a toilet, which flushes one file at a time, queuing up flushes to ensure each file gets flushed only as often as it needs to be.

Optimizations
-------------

### Frontend

The frontend underwent three major optimizations to improve FPS, first I rewrote the edge scrolling module to cache `window.scrollX`, `window.scrollY`, `window.innerWidth`, and `window.innerHeight` to prevent layout thrashing as even just accessing those properties is incredibly expensive. This helped a little bit.

The View model determines which panels are actually visible on the screen, and sets the display property of any which are completely off the screen to hidden. This might have helped a little bit.

The real breakthrough was recycling panels. Rather than creating and destroying new Panels as the user scrolls around, panels that have gone out of view go into a pool, and are then refilled with new button data, and moved to the appropriate position.

### Backend
Originally, every button press was broadcast to every user regardless of where in the grid they were. The performance was very poor, with the CPU maxing out with only a few hundred simulated users. Though I dreaded having to determine which button presses to send to which user, thinking it would be massively complicated to implement, it turned out to be one of the simplest parts of the application.

The trick was to think of determining which users to send presses to as an intersection problem: the press takes place in a single chunk (a point, or a 1 by 1 rectangle), and each user is in some rectangular region of the grid. We just determine which user-rectangles intersect the point of the press, and away we go: that's the users we must send the press to.

To accomplish this, I used the lovely [rbush](https://www.npmjs.com/package/rbush) module from NPM which implements an R-Tree in JavaScript. The user's chunk loading history (they load 12 chunks at a time, always) is stored in an array, and minimum and maximum bounds are calculated using that history. As the user scrolls around, their position in the R-Tree is updated.

Every time a button is pressed, we perform `find` in the R-Tree (an easy, breezy O(log(n)) operation) and broadcast to the appropriate users.

With the R-Tree in place, using all my computers, and recruiting some friends to help as well, we were unable to bring the server to even 50% CPU use in testing.

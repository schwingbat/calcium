# Calcium.js

Calcium, or Ca for short, is a super simple micro-framework for quickly setting up basic single page web apps with the ease and speed of writing plain HTML. I made it because I feel like web development has become too bloated and burdensome. React and Angular are great for monolithic apps like Facebook, YouTube and whatnot, but I don't particularly want to deal with setting up a toolchain and build system just to make something that should be simple and fun. Instead, Calcium handles only the basics.

At present, it offers:

- Routing (hashbang)
- Pages
- Links
- Basic one-way data binding

It does NOT offer:

- Virtual DOM (or any kind of direct DOM manipulation besides navigation)
- Dependencies
- A steep learning curve

## Project Goals

- Require **no build step or tooling** (the whole point)
- Have no dependencies
- Be fewer than 500 lines of code (excluding comments)

## How It Works

There are a few basic classes and data attributes that get added to your HTML to make things work.

Here's what a basic site structure looks like:

```html
<div class="ca-container">

	<!-- data-ca-route defines a route, showing the element when the URL points to / -->
	<div class="ca-page" data-ca-route="/">

		<!-- data-ca-link tells Ca to intercept the click event and use the internal router -->
		<ul class="nav">
			<li><a href="/photos" data-ca-link>Photos</a></li>
			<li><a href="/music" data-ca-link>Music</a></li>
		</ul>

		<!-- data-ca-if takes a boolean value, showing the div if true, and hiding if false -->
		<div data-ca-if="data.loggedIn">
			<p>Hello, <span data-ca-bind="textContent: data.user.name"></span>!</p>
			Not you? <button data-ca-bind="click: methods.logout">Log Out</button>
		</div>

	</div>

	<!-- Router uses hashbang to avoid server config, so this would point to www.example.com/#!/photos -->
	<div class="ca-page" data-ca-route="/photos">
		...
	</div>

	<!-- And this one to www.example.com/#!/music -->
	<div class="ca-page" data-ca-route="/music">
		...
	</div>
</div>

<script>
	// Models are defined on Ca.models as a normal JS object.
	// They then become bindable from anywhere in your app,
	// e.g. data-ca-if="data.loggedIn" or data-ca-bind="textContent: data.user.username">
	Ca.models.data = {
		loggedIn: true,
		user: {
			username: 'Tom',
			email: 'tom@example.com',
		}
	}

	// You can also bind events in exactly the same way.
	// They don't need to be in their own object;
	// you can mix and match methods and data if you feel like it.
	Ca.models.methods = {
		logout: function() {
			var data = Ca.models.data

			data.loggedIn = false;
			data.user = null;
		}
	}
</script>
```

In an effort to reduce complexity and make the API as friendly as possible, models use dirty checking à la Angular. That means you don't need to worry about getters and setters; just change your data and your bindings will worry about the rest. There are probably performance implications of doing this, but I fully intend to switch to some kind of triggered watcher system when whatever's going on with `Object.observe()` and the new ES6 `Proxy` object stabilize. This switch will be seamless and require no changes to the API for the added efficiency. But, in case you want to make something monstrously complex with Calcium right now, you've been warned.

## Up Next

Partially to keep myself focused, and because it's nice to know for you, here's a list of upcoming features:
- `data-ca-each`: Duplicate an element for each item in an array or object and make the item's data available under some kind of special namespace for use in child elements.

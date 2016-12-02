# Calcium.js

Calcium, or Ca for short, is just a super simple micro-framework for quickly setting up basic single page web apps with the ease and speed of writing plain HTML. I made it because I feel like web development has become too bloated and burdensome. React and Angular are great for monolithic apps like Facebook, YouTube and whatnot, but I don't particularly want to deal with setting up a toolchain and build system just to make something that should be simple and fun. Instead, Calcium handles just the basics.

At present, it offers:

- Routing (hashbang)
- Pages
- Links

It does NOT offer:

- Data handling or models
- Virtual DOM (or any kind of DOM manipulation besides navigation)
- Dependencies
- A learning curve

Things like models, DOM manipulation and data binding are covered already by an insane assortment of options, and everyone has their favorite. I will most likely release similar micro libraries for a couple of these things in the future, as I need them.

## How It Works

You write HTML, Ca does the rest. There are a few basic classes and data attributes that get added to your HTML to make things work.

Here's what a basic site structure looks like:

```html
<div class="ca-container">
	<div class="ca-page" data-ca-route="/">
		<ul class="nav">
			<li><a href="/photos" data-ca-link>Photos</a></li>
			<li><a href="/music" data-ca-link>Music</a></li>
		</ul>
	</div>
	<div class="ca-page" data-ca-route="/photos">
		...
	</div>
	<div class="ca-page" data-ca-route="/music">
		...
	</div>
</div>
```

`data-ca-route` works just like you would expect. When your browser is pointing to that URL, Calcium hides all but that page.

`data-ca-link` intercepts links and routes them using Ca's internal router. If you wanted to link out to another site, you would simply omit the attribute.

Check out the demo.html page to see it in action.
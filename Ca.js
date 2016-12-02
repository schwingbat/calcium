(function() {
	'use strict';

	/************************************
	 * 			   ROUTING              *
	 ************************************/

	// Routing uses hashbang only at the moment. Config options are coming later.

	var router = {
		routes: {},
		config: {},
		go: function(path) {
			window.location.hash = this.buildURL(path);
		},
		match: function(route) {
			if (route[0] === '!') route = route.slice(1);
			if (this.routes[route]) {
				return this.routes[route];
			} else if (this.routes['*']) {
				return this.routes['*'];
			}
		},
		current: function() {
			var hash = window.location.hash;
			if (hash[0] === '#')
				hash = hash.slice(1);

			return hash;
		},
		activate: function(path) {
			for (var key in this.routes) {
				this.routes[key].classList.remove('ca-visible');
			}

			this.match(path).classList.add('ca-visible');
		},
		buildURL: function(path) {
			var str = '!';

			console.log(path);
			if (path[0] === '!' && path[1] === '/') {
				return path;
			}

			if (path[0] !== '/') {
				str += '/';
			}

			str += path;
			return str;
		}
	}

	// Use hashchange to trigger the router events.

	window.addEventListener('hashchange', function(e) {
		var path = e.newURL.split('#').pop();

		var exists = !!router.match(path);
		console.log(exists, path);

		if (exists) {
			router.activate(path);
		}
	});


	/************************************
	 * 		   COMPONENT SETUP          *
	 ************************************/

	// 1. Determine our page elements (ones that have routes anyway. Others are ignored.)

	document.querySelectorAll('.ca-page').forEach(function(page) {
		var route = page.getAttribute('data-ca-route');
		if (!route) {
			console.warn('Page has no route, and therefore has no way to be shown.', page);
			return false;
		}

		if (router.routes[route]) {
			console.warn('A route by the name of "'+ route +'" already exists. Keeping the first and ignoring subsequent duplicates.');
		} else {
			router.routes[route] = page;
		}
	});


	/************************************
	 * 			  NAVIGATION            *
	 ************************************/

	// 2. Set up event handlers for links to avoid redirects.

	function linkHandler(e) {
		if (e.target.getAttribute('data-ca-link') != null) {
			e.preventDefault();
			e.stopPropagation();

			var href = e.target.getAttribute('href');

			console.log(e, href);
			router.go(href);
		}
	}

	document.addEventListener('click', linkHandler);



	// Initialize route on load.

	(function() {
		var path = router.current() || '/';
		var exists = !!router.match(path);

		if (exists) {
			router.activate(path);
		}
	})();
})();




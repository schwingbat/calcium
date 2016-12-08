(function() {
  'use strict';

  var bindings = {};
  var models = {};

  /************************************
   *              UTILS               *
   ************************************/

  function _deepCloneObject(obj) {
    var newObj = {};

    for (var key in obj) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        newObj[key] = _deepCloneObject(obj[key]);
      } else {
        newObj[key] = obj[key];
      }
    }

    return newObj;
  }

  function _arrayIncludes(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) return true;
    }
    return false;
  }

  function _parseObjectPath(path) {
    return path.split(/[.|\[\]]/ig);
  }

  // Dive deep into a nested object
  function _delve(obj, path) {
    var target = obj;

    for (var i = 0; i < path.length; i++) {
      var key = path[i];

      if (target[key])
        target = target[key];
      else
        return target[key];
    }

    return target;
  }

  function _deepCompare(obj1, obj2) {
    // Determines if two objects are equal by value.

    var oneType = typeof obj1;
    var twoType = typeof obj2;

    if (oneType !== twoType) {
      return false;
    }

    // Catch if either are nonexistent
    if (oneType === 'undefined') {
      if (twoType === 'undefined') {
        return true;
      }
      return false;
    }

    // Check equality of each value.
    for (var key in obj1) {
      if (typeof obj1[key] === 'object') {

        // Deep check each nested object, because two objects don't equal each other by JS spec.
        if (!_deepCompare(obj1[key], obj2[key])) {
          return false;
        }
      } else {
        if (obj1[key] !== obj2[key]) {
          return false;
        }
      }

    }

    // If no other check failed, these are probably equal.
    return true;
  }

  function _refreshBindings(model) {
    if (bindings[model]) {
      var model = bindings[model];
      for (var i = 0; i < model.length; i++) {
        if (typeof model[i] === 'function') {
          console.log(model[i]());
        }
      }
    }
  }

  /************************************
   *             ROUTING              *
   ************************************/

  // Routing uses hashbang only at the moment. Config options are coming later.

  var router = {
    routes: {},
    config: {},
    go: function(path) {
      var loc = null;
      if (path === '/' || path === '') {
        loc = '/'
      } else {
        loc = this.buildURL(path)
      }
      window.location.hash = loc;
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
   *         COMPONENT SETUP          *
   ************************************/

  // 1. Determine our page elements (ones that have routes anyway. Others are ignored.)

  document.querySelectorAll('.ca-page').forEach(function(page) {
    var route = page.getAttribute('data-ca-route');
    if (!route) {
      console.warn('Page has no route, and therefore has no way to be shown.', page);
      return false;
    }

    if (router.routes[route]) {
      console.warn('A route by the name of "' + route + '" already exists. Replacing the old route with the new one.');
    }
    router.routes[route] = page;
  });

  // Record all bindings.

  // Register these val names as event handlers
  var eventTypes = [
    'click', 'mousedown', 'mouseup', 'mouseover', 'mouseenter', 'mouseleave',
    'submit',
  ];

  // Attributes which are set through JS directly (vs. with setAttribute())
  var directSetters = [
    'textContent'
  ];

  // Looks up a value each time so an event handler can be changed through the model at runtime.
  function _dynamicHandler(path) {
    return function() {
      var method = _delve(models, _parseObjectPath(path));

      if (typeof method === 'function') {
        return method();
      } else {
        throw new Error('That method does not exist!');
      }
    }
  }

  document.querySelectorAll('[data-ca-bind]').forEach(function(el) {
    var bindVal = el.getAttribute('data-ca-bind');
    var binds = bindVal.split(',').map(function(val) {
      // Split at commas, then at colons. Trim white space.
      return val.split(':').map(function(v) {
        return v.trim();
      });
    });

    binds.forEach(function(b) {
      var attr = b[0];
      var val = b[1];

      // Check if the bound value is an event type.
      if (_arrayIncludes(eventTypes, attr)) {
        el.addEventListener(attr, _dynamicHandler(val));
        console.log('Added event listener: ' + attr + ' bound to ' + val);
      } else {
        var path = _parseObjectPath(val);
        var modelName = path[0];

        if (!bindings[modelName]) {
          bindings[modelName] = [];
        }

        var bindFunc = null;

        if (_arrayIncludes(directSetters, attr)) {
          bindFunc = function() {
            el[attr] = _delve(models, path);
            return _delve(models, path);
          }
        } else {
          bindFunc = function() {
            el.setAttribute(attr, _delve(models, path));
          }
        }

        bindings[modelName].push(bindFunc);
      }
    });
  });

  document.querySelectorAll('[data-ca-if]').forEach(function(el) {
    var ifStr = el.getAttribute('data-ca-if');
    var negate = ifStr[0] === '!';
    var path = _parseObjectPath(negate ? ifStr.slice(1) : ifStr);
    var modelName = path[0];

    bindings[modelName].push(function() {
      var val = _delve(models, path);

      if (val)
        el.classList[negate ? 'add' : 'remove']('ca-hidden');
      else
        el.classList[negate ? 'remove' : 'add']('ca-hidden');
    });

    console.log({
      ifStr,
      negate,
      path
    });
  });


  /************************************
   *            NAVIGATION            *
   ************************************/

  // 2. Set up event handlers for links to avoid redirects.

  function linkHandler(e) {
    if (e.target.getAttribute('data-ca-link') != null) {
      e.preventDefault();

      var href = e.target.getAttribute('href');
      router.go(href);
    }
  }

  document.addEventListener('click', linkHandler);

  /************************************
   *            PUBLIC API            *
   ************************************/

  var Ca = {};
  Ca.models = models;
  Ca.router = {
    go: router.go
  }

  window.Ca = Ca;


  // Start model digest cycle.

  (function() {
    var previous = {};

    setInterval(function() {
      for (var model in Ca.models) {
        if (!_deepCompare(Ca.models[model], previous[model])) {
          _refreshBindings(model);
        }
      }
      previous = _deepCloneObject(Ca.models);
    }, 50);
  })();

  // Initialize route on load.

  (function() {
    var path = router.current() || '/';
    var exists = !!router.match(path);

    if (exists) {
      router.activate(path);
    }
  })();
})();

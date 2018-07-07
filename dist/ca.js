(function() {
  'use strict';

  var bindings = {};
  var models = {};
  var config = {
    digestInterval: 50,
    hashbang: true,
  };

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

  function _parseElementBindings(el) {
    console.log()
  }

  // Dive deep into a nested object
  function _delve(obj, pathArr) {
    var target = obj;

    for (var i = 0; i < pathArr.length; i++) {
      var key = pathArr[i];

      if (target[key])
        target = target[key];
      else
        return target[key];
    }

    return target;
  }

  function _deepCompare(obj1, obj2) {
    // Determines if two objects are equal by value.

    var oneType = Array.isArray(obj1) ? 'array' : typeof obj1;
    var twoType = Array.isArray(obj2) ? 'array' : typeof obj2;

    if (oneType !== twoType) {
      return false;
    }

    // Both are arrays, but with different lengths.
    if (oneType === 'array' && obj1.length !== obj2.length) {
      return false;
    }

    // Catch if either are nonexistent.
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

  function _refreshBindings(model, newVal, oldVal) {
    if (bindings[model]) {
      var model = bindings[model];
      for (var i = 0; i < model.length; i++) {
        if (typeof model[i] === 'function') {
          model[i](newVal, oldVal);
        }
      }
    }
  }

  /************************************
   *             ROUTING              *
   ************************************/

  // Routing uses hashbang only at the moment. Config options are coming later.
  var stopHashEvent = false;

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

      // Triggers the event which updates the route.
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
    
    var match = router.match(path);
    if (!!match) {
      router.activate(path);
    }
  });


  /************************************
   *         COMPONENT SETUP          *
   ************************************/

  // 1. Determine our page elements (ones that have routes anyway. Others are ignored.)

  document.querySelectorAll('.ca-page').forEach(function(page) {
    var route = page.getAttribute('data-ca-route') || page.getAttribute('route');
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

  document.querySelectorAll('[data-ca-bind], [bind]').forEach(function(el) {
    var bindVal = el.getAttribute('data-ca-bind') || el.getAttribute('bind');

    // Multiple bindings can be given if separated by commas.
    bindVal.split(',').forEach(function(b) {
      var attr;
      var val;

      /* binds can be in the format 'attribute: value' or 'value to attribute'.
         This is where we figure out which one it is. */

      if (b.indexOf(' to ') !== -1) {
        var s = b.split(' to ');
        attr = s[1].trim();
        val = s[0].trim();
      } else {
        var s = b.split(':');
        attr = s[0].trim();
        val = s[1].trim();
      }

      /* Check if the bound value is an event type.
         If it is, add an event handler, and if it's not,
         add a model handler. */

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

  document.querySelectorAll('[data-ca-visible-if], [visible-if]').forEach(function(el) {
    var ifStr = el.getAttribute('data-ca-visible-if') || el.getAttribute('visible-if');
    var negate = ifStr[0] === '!';
    var path = _parseObjectPath(negate ? ifStr.slice(1) : ifStr);
    var modelName = path[0];

    bindings[modelName].push(function() {
      var val = _delve(models, path);

      if (val)
        el.classList[negate ? 'remove' : 'add']('ca-visible');
      else
        el.classList[negate ? 'add' : 'remove']('ca-visible');
    });

    console.log({
      ifStr,
      negate,
      path
    });
  });

  document.querySelectorAll('[data-ca-for-each], [for-each]').forEach(function(el) {
    var eachStr = el.getAttribute('data-ca-for-each') || el.getAttribute('for-each');
        
    var s = eachStr.split(' in ');
    var itemName = s[0].trim();
    var bindPath = _parseObjectPath(s[1]);

  /*******************************************************************
   *                     FOREACH & LIST BINDINGS                     *
   *                  -----------------------------                  *
   *    PLEASE DISREGARD THE LOW QUALITY OF THE FOLLOWING SECTION    *
   * I'M SURE THERE IS A BETTER WAY TO DO THIS. IT'S BASICALLY VDOM. *
   *******************************************************************/

  function _getLocalDOM(el) {
    //console.warn('RUNNING')
    var item = {};

    switch(el.nodeType) {

    case 1: {// Regular element
      item.type = 'element';
      // Get the information needed to recreate an element.
      item.tag = el.tagName.toLowerCase();

      // Store attributes as an array of attr objects.
      item.caAttrs = [];
      item.attrs = [];
      item.bindings = {};

      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];

        if (a.name.slice(0, 7) === 'data-ca') {

          // If it's a binding, get the bindings.
          if (a.name === 'data-ca-bind') {
            var bindAttr = el.getAttribute('data-ca-bind');
            if (bindAttr) {
              bindAttr.split(',').forEach(function(line) {
                var bind = line.split(':');

                // Add the path under the attribute name in the bindObj.
                item.bindings[ bind[0].trim() ] = _parseObjectPath( bind[1].trim() );
              });
            }
          } else {

            // If it's not, just add it to the caAttrs array.
            item.caAttrs.push({
              attr: a.name,
              val: a.nodeValue,
            });
          }
        } else {

          // If it doesn't start with data-ca, just add it to the normal one.
          item.attrs.push({
            attr: a.name,
            val: a.nodeValue,
          })
        }
      }

      // Split the path for each attribute into an array.
      for (var key in item.caAttrs) {
        var attr = item.caAttrs[key];
        attr.val = _parseObjectPath(attr.val);
      }

      item.children = [];

      if ('childNodes' in el) {
        el.childNodes.forEach(function(node) {
          item.children.push(_getLocalDOM(node));
        });
      }

      break;
    }
    case 3: { // Text node
      item.type = 'text';
      item.value = el.nodeValue;
      break;
    }
    default:
      break;
    }

    console.log(item);
    return item;
  }

  // Take the parsed pattern and remake it.
  function _createElement(pattern) {
    //console.warn(pattern);
    var el;

    switch(pattern.type) {

    case 'text': {
      el = document.createTextNode(pattern.value);
      break;
    }

    case 'element': {
      el = document.createElement(pattern.tag);

      pattern.attrs.forEach(function(a) {
        el.setAttribute(a.attr, a.val);
      });

      pattern.caAttrs.forEach(function(a) {
        el.setAttribute(a.attr, a.val);
      });

      if (!el.__caItemScope__) {
        el.__caItemScope__ = {};
      }

      if (!el.__caItemScope__.bindings) {
        el.__caItemScope__.bindings = [];
      }

      el.__caItemScope__.bindings = pattern.bindings;

      pattern.children.forEach(function(child) {
        el.appendChild(_createElement(child));
      });

      break;
    }

    default:
      break;

    }

    return el;
  }

  function _updateElement(el, data, index) {
    var oldData = el.__caItemScope__;

    if (!oldData || !_deepCompare(oldData, data)) {

    }

    oldData = data;
  }

  document.querySelectorAll('[data-ca-foreach]').forEach(function(el) {
    var eachStr = el.getAttribute('data-ca-foreach');
    var parent = el.parentNode;

    // Make the index (or key if object) available to repeated elements and their children.
    var indexName = el.getAttribute('data-ca-indexname');

    var path = _parseObjectPath(eachStr);
    var modelName = path[0];

    function _getItemBindings(el) {
      var binds = {};
      var b = el.getAttribute('data-ca-bind');
      if (b) {
        binds = _parseElementBindings(b);
      }
    }

    //return false;

    var childBindings = _getItemBindings(el);

    // Remove the element. It's only the prototype for the others. We won't be using it.
    el.parentNode.removeChild(el);

    var eachScope = {
      protoEl: el,
      path: path,
      elements: [],
      itemPattern: _getLocalDOM(el),
    }

    if (!bindings[modelName]) {
      bindings[modelName] = [];
    }

    // This is the function that will be run on each item.
    var itemBindFunc = function(item, scopeData, itemData, index) {
      var itemScope = item.__caItemScope__;
      if (itemScope) {

        // TODO: This whole thing probably can be refactored.
        if (itemScope.bindings) {
          //console.log(itemScope.bindings);
          for (var attr in itemScope.bindings) {
            //console.log(attr);
            var val = itemScope.bindings[attr];
            //console.log(val);

            // For each binding, if the path starts with 'this' or the specified index name,
            // take the appropriate action. Otherwise proceed normally.
            if (val[0] === 'this') {
              if (_arrayIncludes(directSetters, attr)) {
                item[attr] = _delve(itemData, val.slice(1));
              } else {
                item.setAttribute(attr, _delve(itemData, val.slice(1)));
              }
            } else if (val[0] === indexName) {
              if (_arrayIncludes(directSetters, attr)) {
                item[attr] = index;
              } else {
                item.setAttribute(attr, index);
              }
            } else {
              item[attr] = _delve(models, val);
            }
          }
        }

        //console.log(item);

        if (item.childNodes) {
          for (var i in item.childNodes) {
            itemBindFunc(item.childNodes[i], scopeData, itemData, index);
          }
        }

        //console.log(itemScope, item, scopeData, itemData, index);
      }

    }

    // The master function to be run when the model updates.
    var eachBindFunc = function() {

      // Grab the data.
      var scope = eachScope;
      var eachData = _delve(models, scope.path);
      console.warn(eachData, scope);

      if (typeof eachData !== 'object') {
        throw new Error('data-ca-foreach can only be used with an object or array! Type is '+(typeof eachData));
      }

      if (Array.isArray(eachData)) {
        // Iterate through each item.
        for (var i = 0; i < eachData.length; i++) {

          // If an item doesn't exist for the index, create and attach it.
          if (!scope.elements[i]) {
            scope.elements[i] = _createElement(scope.itemPattern);
            //scope.elements[i] = scope.protoEl.cloneNode();
            console.log(scope.elements[i], scope.elements[i].__caItemScope__)
            parent.appendChild(scope.elements[i]);
          }

          // Update item bindings.
          itemBindFunc(scope.elements[i], eachData, eachData[i], i);
        }

        // Cut off the remaining elements.
        if (scope.elements.length > eachData.length) {
          scope.elements.slice(0, eachData.length);
        }
      } else {
        // If it's an object.
      }
    }

    bindings[modelName].push(eachBindFunc);
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
  Ca.config = config;

  window.Ca = Ca;

  // Start model digest cycle.

  (function() {
    var previous = {};

    setInterval(function() {
      for (var model in Ca.models) {
        if (!_deepCompare(Ca.models[model], previous[model])) {
          console.log('changed!');
          _refreshBindings(model);
        }
      }
      previous = _deepCloneObject(Ca.models);
    }, config.digestInterval);
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

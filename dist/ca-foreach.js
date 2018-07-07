/* This is likely going to be convoluted and stupid,
   so it's going in its own script. Ca.js must be loaded
   first, since this depends on a global reference to Ca. */

(function(Ca) {
    if (!Ca) throw new Error('ca-foreach requires ca.js to be loaded first.');

    var bindings = [];

    document.querySelectorAll('[data-ca-for-each], [for-each]').forEach(function(el) {
        var eachStr = el.getAttribute('data-ca-for-each') || el.getAttribute('for-each');
        
        var s = eachStr.split(' in ');
        var itemName = s[0].trim();
        var bindPath = s[1].trim().split('.');

        console.log({ eachStr, itemName, bindPath });
    });
})(window.Ca);
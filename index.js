var fs = require('fs')
  , path = require('path')
  , once = require('once')
  , localStorage
  ;

if (typeof window === 'undefined' || window.localStorage === 'undefined') {
  localStorage = false
} else {
  localStorage = window.localStorage
}

// From es5-shim https://raw.github.com/kriskowal/es5-shim
if (!Object.keys) {
  // http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
  var hasDontEnumBug = true,
    dontEnums = [
      "toString",
      "toLocaleString",
      "valueOf",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "constructor"
    ],
    dontEnumsLength = dontEnums.length;

  for (var key in {"toString": null}) {
    hasDontEnumBug = false;
  }

  Object.keys = function keys(object) {

    if (
      (typeof object != "object" && typeof object != "function") ||
      object === null
    ) {
      throw new TypeError("Object.keys called on a non-object");
    }

    var keys = [];
    for (var name in object) {
      if (owns(object, name)) {
        keys.push(name);
      }
    }

    if (hasDontEnumBug) {
      for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
        var dontEnum = dontEnums[i];
        if (owns(object, dontEnum)) {
          keys.push(dontEnum);
        }
      }
    }
    return keys;
  };
}
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function forEach(fun /*, thisp*/) {
    var object = toObject(this),
      self = splitString && _toString(this) == "[object String]" ?
        this.split("") :
        object,
      thisp = arguments[1],
      i = -1,
      length = self.length >>> 0;

    // If no callback function or if callback is not a callable function
    if (_toString(fun) != "[object Function]") {
      throw new TypeError(); // TODO message
    }

    while (++i < length) {
      if (i in self) {
        // Invoke the callback function with call, passing arguments:
        // context, property value, property key, thisArg object
        // context
        fun.call(thisp, self[i], i, object);
      }
    }
  };
}
// end es5-shim


function trycatch (fn) {
  var x
  try {
    x = fn()
  } catch(e) {
    x = e
  }
  return x
}

function Couchie (name) {
  if (name.indexOf('__') !== -1) throw new Error('Cannot have double underscores in name')
  this.name = name
  this.n = '_couchie__'+name+'__'

  if (!localStorage) {
    var e = trycatch(function () { return fs.mkdirSync(name) })
    if (e && e.errno !== 47) throw e

    var f = trycatch(function () { return fs.readFileSync(path.join(name, '_revs')) })
    if (f && f.errno && f.errno !== 34) throw f
    if (f && f.errno) fs.writeFileSync(path.join(name, '_revs'), '{}')
  }
}

Couchie.prototype._setItem = function (obj, id, cb) {
  if (!cb) {
    cb = id
    id = obj._id
  }
  if (!cb) {
    cb = function () {}
  }
  var self = this
  if (localStorage) {
    localStorage.setItem(this.n+id, JSON.stringify(obj))
    if (id !== '_revs') self._setrev(obj._id, obj._rev, cb)
    else cb(null)
  } else {
    fs.writeFile(path.join(this.name, id), JSON.stringify(obj), function (e, i) {
      if (e) return cb(e)
      if (id !== '_revs') self._setrev(obj._id, obj._rev, cb)
      else cb(null)
    })
  }
}
Couchie.prototype._removeItem = function (obj, cb) {
  var self = this
  if (obj._id) var id = obj._id
  else id = obj
  if (localStorage) {
    localStorage.removeItem(this.n+id)
    cb(null, true)
  } else {
    fs.unlink(path.join(this.name, id), function (e, i) {
      if (e) return cb(e)
      cb(null, i)
    })
  }
}

Couchie.prototype._revs = function (cb) {
  this._getItem('_revs', cb)
}
Couchie.prototype._getItem = function (id, cb) {
  if (localStorage) {
    var doc = localStorage.getItem(this.n+id)
    if (!doc) return cb(new Error('No such doc.'))
    cb(null, JSON.parse(doc))
  } else {
    fs.readFile(path.join(this.name, id), function (e, buffer) {
      if (e) return cb(e)
      cb(null, JSON.parse(buffer.toString()))
    })
  }
}
Couchie.prototype._setrev = function (id, rev, cb) {
  var self = this
  if (localStorage) {
    self.revs(function (e, revs) {
      revs[id] = rev
      self._setItem(revs, '_revs', cb)
    })
  } else {
    // Use sync IO to avoid overwrites.
    var f = trycatch(function () { return fs.readFileSync(path.join(self.name, '_revs')) })
    if (f.errno) return cb(e)
    var revs = JSON.parse(f.toString())
    revs[id] = rev
    var w = trycatch(function () { return fs.writeFileSync(path.join(self.name, '_revs'), JSON.stringify(revs)) })
    if (w && w.errno) return cb(w)
    cb(null, w)
  }
}

Couchie.prototype.clear = function (cb) {
  var self = this
  cb = once(cb)
  self.revs(function (e, revs) {
    if (e) return cb(e)
    var i = 0
      , keys = Object.keys(revs)
      ;

    if (!keys.length) return cb(null, [])
    keys.forEach(function (id) {
      i += 1
      self._removeItem(id, function (e, doc) {
        if (e && e.errno !== 34) return cb(e)
        i = i - 1
        if (i === 0) cb(null)
      })
    })
  })
}
Couchie.prototype.post = function (obj, cb) {
  if (!obj._id || !obj._rev) return cb(new Error('Document does not have _id or _rev.'))
  if (obj._id[0] === '_') return cb(new Error('Cannot set documents ids that begin in _'))
  this._setItem(obj, cb)
}
Couchie.prototype.bulk = function (docs, cb) {
  var self = this
  cb = once(cb)
  if (localStorage) {
    self.revs(function (e, revs) {
      if (e) return cb(e)
      for (var i=0;i<docs.length;i++) {
        var obj = docs[i]
        if (!obj._id || !obj._rev) return cb(new Error('Document does not have _id or _rev.'))
        localStorage.setItem(this.n+obj._id, JSON.stringify(obj))
        revs[obj._id] = obj._rev
      }
      this._setItem('_revs', revs)
      cb(null)
    })
  } else {
    var i = 0
    docs.forEach(function (d) {
      i += 1
      var results = []
      self.post(d, function (e, info) {
        if (e) return cb(e)
        i = i - 1
        results.push(info)
        if (i === 0) cb(null, results)
      })
    })
    if (!docs.length) cb(null, [])
  }
}
Couchie.prototype.get = function (id, cb) {
  this._getItem(id, cb)
}
Couchie.prototype.all = function (cb) {
  var self = this
  cb = once(cb)
  self.revs(function (e, revs) {
    var i = 0
      , results = []
      , keys = Object.keys(revs)
      ;

    if (!keys.length) return cb(null, [])
    keys.forEach(function (id) {
      i += 1
      self.get(id, function (e, doc) {
        if (e) return cb(e)
        results.push(doc)
        i = i - 1
        if (i === 0) cb(null, results)
      })
    })
  })
}

Couchie.prototype.revs = function (cb) {
  this._revs(function (e, r) {
    if (e) r = {}
    cb(null, r)
  })
}


module.exports = function (name) { return new Couchie(name) }

if (typeof window !== 'undefined') window.couchie = module.exports

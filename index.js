var once = require('once')
  , _ = require('underscore')
  , localStorage
  , setImmediate
  ;

function keys () {
  if (localStorage._db) return _.keys(localStorage._db)
  return _.keys(localStorage)
}

if (typeof setImmediate === 'undefined') {
  setImmediate = function (cb) {return setTimeout(cb, 0)}
} else {
  setImmediate = setImmediate
}

function defer () {
  var args = Array.prototype.slice.call(arguments)
  setImmediate(function () {
    args[0].apply(args[0], args.slice(1))
  })
}

if (typeof window === 'undefined' || window.localStorage === 'undefined') {
  localStorage = {_db:{}}
  localStorage.setItem = function (id, value) {
    localStorage._db[id] = value
  }
  localStorage.getItem = function (id) {
    return localStorage._db[id]
  }
  localStorage.removeItem = function (id) {
    delete localStorage._db[id]
  }
} else {
  localStorage = window.localStorage
}

function Couchie (name) {
  if (name.indexOf('__') !== -1) throw new Error('Cannot have double underscores in name')
  this.name = name
  this.n = '_couchie__'+name+'__'
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

  localStorage.setItem(this.n+id, JSON.stringify(obj))
  defer(cb, null)
}
Couchie.prototype.delete = function (obj, cb) {
  var self = this
  if (obj._id) var id = obj._id
  else id = obj

  localStorage.removeItem(this.n+id)
  defer(cb, null, true)
}

Couchie.prototype.clear = function (cb) {
  var self = this
  cb = once(cb)

  var i = 0
  function _del (id) {
    i += 1
    self.delete(id, function (e, d) {
      if (e) return defer(cb, e)
      i = i - 1
      if (i === 0) defer(cb, null, true)
    })
  }

  var _keys = self.keys()
  if (!_keys.length) return defer(cb, null, [])
  _.each(_keys, _del)
}
Couchie.prototype.post = function (obj, cb) {
  if (!obj._id || !obj._rev) return defer(cb, new Error('Document does not have _id or _rev.'))
  if (obj._id[0] === '_') return defer(cb, new Error('Cannot set documents ids that begin in _'))
  this._setItem(obj, cb)
}
Couchie.prototype.bulk = function (docs, cb) {
  var self = this
  cb = once(cb)

  var i = 0
  function write (obj) {
    i++
    self.post(obj, function (e, i) {
      if (e) return defer(cb, e)
      i = i - 1
      if (i === 0) defer(cb, null, i)
    })
  }

  if (docs.length) return defer(cb, null, [])
  _.each(docs, write)
}
Couchie.prototype.get = function (id, cb) {
  var doc = localStorage.getItem(this.n+id)
  if (!doc) return defer(cb, new Error('No such doc.'))
  defer(cb, null, JSON.parse(doc))
}
Couchie.prototype.keys = function () {
  var self = this
  return _.map(_.filter(keys(), function (k) {return k.slice(0, self.n.length) === self.n}), function (k) {return k.slice(self.n.length)})
}
Couchie.prototype.all = function (cb) {
  var self = this
  cb = once(cb)

  var results = []
  var i = 0
  function _get (id) {
    i++
    self.get(id, function (e, d) {
      if (e) return defer(cb, e)
      i = i - 1
      results.push(d)
      if (i === 0) defer(cb, null, results)
    })
  }

  var _keys = self.keys()
  if (!_keys.length) return defer(cb, null, [])
  _.each(_keys, _get)
}
Couchie.prototype.revs = function (cb) {
  var self = this
  cb = once(cb)

  self.all(function (e, all) {
    if (e) return defer(cb, e)
    defer(cb, null, _.object(_.pluck(all, '_id'), _.pluck(all, '_rev')))
  })
}

module.exports = function (name) { return new Couchie(name) }

if (typeof window !== 'undefined') window.couchie = module.exports

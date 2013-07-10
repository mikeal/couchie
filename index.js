var once = require('once')
  , _ = require('lodash')
  , events = require('events')
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

var memoryStore  = {_db:{}}
memoryStore.setItem = function (id, value) {
  memoryStore._db[id] = value
}
memoryStore.getItem = function (id) {
  return memoryStore._db[id]
}
memoryStore.removeItem = function (id) {
  delete memoryStore_db[id]
}

if (typeof window === 'undefined' || window.localStorage === 'undefined') {
  localStorage = memoryStore
} else {
  localStorage = window.localStorage
}

function Couchie (name, store) {
  if (name.indexOf('__') !== -1) throw new Error('Cannot have double underscores in name')
  this.name = name
  this.n = '_couchie__'+name+'__'
  this.localStorage = store || localStorage
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

  this.localStorage.setItem(this.n+id, JSON.stringify(obj))
  defer(cb, null)
}
Couchie.prototype.delete = function (obj, cb) {
  var self = this
  if (obj._id) var id = obj._id
  else id = obj

  this.localStorage.removeItem(this.n+id)
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
  var doc = this.localStorage.getItem(this.n+id)
  if (!doc) return defer(cb, new Error('No such doc.'))
  defer(cb, null, JSON.parse(doc))
}
Couchie.prototype.keys = function () {
  var self = this
  return _.map(_.filter(keys(), function (k) {return k.slice(0, self.n.length) === self.n}), function (k) {return k.slice(self.n.length)})
}
Couchie.prototype.all = function (cb) {
  var self = this
  cb = once(cb || function () {})

  var ee = new events.EventEmitter()
    , results = []
    ;
  ee.on('doc', results.push.bind(results))
  ee.on('end', function () {
    defer(cb, null, results)
  })
  ee.on('error', cb)

  var i = 0
  function _get (id) {
    i++
    self.get(id, function (e, d) {
      if (e) return ee.emit('error')
      i = i - 1
      ee.emit('doc', d)
      if (i === 0) ee.emit('end')
    })
  }

  var _keys = self.keys()
  _.each(_keys, _get)
  if (!_keys.length) defer(function (){ ee.emit('end') })
  return ee
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

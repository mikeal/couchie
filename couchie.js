(function (window) {

  function Couchie (name) {
    if (name.indexOf('__') !== -1) throw new Error('Cannot have double underscores in name')
    this.name = name
    this.n = '_couchie__'+name+'__'
  }
  Couchie.prototype.clear = function (cb) {
    if (localStorage[this.n+'_revs']) {
      for (var i in this.revs()) {
        localStorage.removeItem(this.n+i)
      }
      localStorage.removeItem(this.n+'_revs')
    }
    setTimeout(cb, 0)
  }
  Couchie.prototype.post = function (obj, cb) {
    if (!obj._id || !obj._rev) {
      return setTimeout(function() {
        cb(new Error('Document does not have _id or _rev.'))
      }, 0)
    }
    var revs = this.revs()
    localStorage.setItem(this.n+obj._id, JSON.stringify(obj))
    revs[obj._id] = obj._rev
    this.setrevs(revs)
    setTimeout(cb, 0)
  }
  Couchie.prototype.bulk = function (docs, cb) {
    var revs = this.revs()
    for (var i=0;i<docs.length;i++) {
      var obj = docs[i]
      if (!obj._id || !obj._rev) {
        return setTimeout(function() {
          cb(new Error('Document ' + i + ' does not have _id or _rev.'))
        }, 0)
      }
      localStorage.setItem(this.n+obj._id, JSON.stringify(obj))
      revs[obj._id] = obj._rev
    }
    this.setrevs(revs)
    setTimeout(cb, 0)
  }
  Couchie.prototype.get = function (id, cb) {
    var doc = localStorage.getItem(this.n+id)
    if (!doc) {
      return setTimeout(function() {
        cb(new Error('No such doc.'))
      })
    }
    setTimeout(function() {
      cb(null, JSON.parse(doc))
    }, 0)
  }
  Couchie.prototype.all = function (cb) {
    var self = this
    var revs = self.revs()
    revs = Object.keys(revs).map(function (id) {return JSON.parse(localStorage.getItem(self.n+id))})
    setTimeout(function() {
      cb(null, revs)
    }, 0)
  }
  
  Couchie.prototype.revs = function () {
    return JSON.parse(localStorage.getItem(this.n+'_revs') || '{}')
  }
  Couchie.prototype.setrevs = function (obj) {
    localStorage.setItem(this.n+'_revs', JSON.stringify(obj))
  }
  
  window.couchie = function (name) { return new Couchie(name) }
}(window));

var test = require('testling')
  , couchie = require('./')
  , db = couchie('testdb')
  ;

test('clear', function (t) {

  db.clear(function (e) {
    if (e) t.fail(e)
    t.end()
  })
})

test('setFail', function (t) {

  db.post({data:'asdf'}, function (e, info) {
    t.ok(e)
    t.end()
  })
})

test("set", function (t) {
  db.post({_id:'test1', data:'asdf', _rev:'1-fake'}, function (e, info) {
    if (e) t.fail(e)
    t.end()
  })
})

test("revs", function (t) {
  db.revs(function (e, r) {
    if (e) t.fail(e)
    t.equal(r['test1'], '1-fake')
    t.end()
  })
})

test("get", function (t) {
  db.get('test1', function (e, doc) {
    if (e) t.fail(e)
    t.equal(doc._id, 'test1')
    t.equal(doc._rev, '1-fake')
    t.end()
  })
})

test("getnone", function (t) {
  db.get('testasdfa1', function (e, doc) {
    t.ok(e)
    t.end()
  })
})

test("all", function (t) {
  db.all(function (e, docs) {
    if (e) t.fail(e)
    t.equal(docs.length, 1)
    t.equal(docs[0]._id, 'test1')
    t.equal(docs[0]._rev, '1-fake')
    t.end()
  })
})

test('clear', function (t) {

  db.clear(function () {
    t.end()
  })
})
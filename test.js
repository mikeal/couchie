var couchie = require('./')
  , db = couchie('testdb')
  , assert = require('assert')
  , ok = require('okdone')
  ;

db.clear(function (e) {
  if (e) console.log('wtf')
  if (e) throw e
  ok('clear')
  db.post({data:'asdf'}, function (e, info) {
    assert.ok(e)
    ok('post w/o id')
    db.post({_id:'test1', data:'asdf', _rev:'1-fake'}, function (e, info) {
      if (e) throw e
      ok('post w/ id')
      db.revs(function (e, r) {
        if (e) throw e
        assert.equal(r['test1'], '1-fake')
        ok('revs')
        db.get('test1', function (e, doc) {
          if (e) throw e
          assert.equal(doc._id, 'test1')
          assert.equal(doc._rev, '1-fake')
          ok('get')
          db.get('testasdfa1', function (e, doc) {
            assert.ok(e)
            ok('getFail')
            db.all(function (e, docs) {
              if (e) throw e
              assert.equal(docs.length, 1)
              assert.equal(docs[0]._id, 'test1')
              assert.equal(docs[0]._rev, '1-fake')
              ok('all')


              var db2 = couchie('testdb2')
              db2.post({_id:'test1', data:'not asdf', _rev:'2-fake'}, function(e, doc) {
                if (e) throw e

                db.all(function(e, docs) {
                  if (e) throw e
                  assert.equal(docs.length, 1)
                  assert.equal(docs[0]._id, 'test1')
                  assert.equal(docs[0]._rev, '1-fake')
                  assert.equal(docs[0].data, 'asdf')

                  db2.all(function(e, docs) {
                    if (e) throw e
                    assert.equal(docs.length, 1)
                    assert.equal(docs[0]._id, 'test1')
                    assert.equal(docs[0]._rev, '2-fake')
                    assert.equal(docs[0].data, 'not asdf')
                    ok('multi')

                    var i = 0
                    var x = db.all()
                    x.on('doc', function () {i += 1})
                    x.on('end', function () {
                      ok('all emitter')
                      ok.done()
                    })

                  })

                })

              })
            })
          })
        })
      })
    })
  })
})



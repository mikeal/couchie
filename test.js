var couchie = require('./')
  , rimraf = require('rimraf')
  , db = couchie('testdb')
  , assert = require('assert')
  ;

function clean () {
  if (process && process.on) {
    process.on('exit', function () {
      if (rimraf.sync) {
        rimraf.sync('testdb')
        rimraf.sync('testdb2')
      }
    })
  }
}

clean()

var i = 0
function ok (message) {
  i += 1
  console.log('ok '+i+' '+ (message || '') )
}
function done () {
  console.log('1..'+i)
}

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
                    clean()
                    done()
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



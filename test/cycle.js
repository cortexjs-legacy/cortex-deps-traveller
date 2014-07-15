'use strict';
/*global describe, it*/

var path = require('path');
var assert = require('chai').assert;
var Traveller = require('../lib/traveller');

var test_root = path.join(__dirname, './built_root');

describe('test cycle', function() {


  it('mixed', function(done) {
    var t = new Traveller(test_root);
    t.toJSONTree({
      name: 'module',
      version: '1.0.0',
      dependencies: {
        "a": "^1.0.0",
        "c": "~1.0.0"
      }
    }, function(err, json) {
      assert.equal(json.name, 'module');
      assert.equal(json.version, '1.0.0');
      assert(json.dependencies.c.scoped);
      assert(json.dependencies.c.dependencies.d.dependencies.e.dependencies.c.circular);

      var sorted = t.sort(json);

      assert.equal(sorted.length, 7);
      assert.equal(sorted[0], "module@1.0.0");
      assert.equal(sorted[1], "a@1.0.0");
      assert.equal(sorted[2], "b@1.0.0");
      assert.equal(sorted[3], "c@1.0.0");
      assert.equal(sorted[4], "d@1.0.0");
      assert.equal(sorted[5], "e@1.0.0");
      assert.equal(sorted[6], "f@1.0.0");
      done(err);
    });
  });

  it('three modules on ring', function(done) {
    var t = new Traveller(test_root);
    t.toJSONTree({
      name: 'module',
      version: '1.0.0',
      dependencies: {
        "c": "~1.0.0"
      }
    }, function(err, json) {
      if (err) return done(err);
      assert.equal(json.name, 'module');
      assert.equal(json.version, '1.0.0');
      assert(json.dependencies.c.scoped);
      assert(json.dependencies.c.dependencies.d.dependencies.e.dependencies.c.circular);

      var sorted = t.sort(json);

      assert.equal(sorted.length, 5);
      assert.equal(sorted[0], "module@1.0.0");
      assert.equal(sorted[1], "c@1.0.0");
      assert.equal(sorted[2], "d@1.0.0");
      assert.equal(sorted[3], "e@1.0.0");
      assert.equal(sorted[4], "f@1.0.0");

      done(err);
    });
  });


  it('deps on cycle', function(done) {
    var t = new Traveller(test_root);
    t.toJSONTree({
      name: 'module',
      version: '1.0.0',
      dependencies: {
        "cycle": "~1.0.0"
      }
    }, function(err, json) {
      assert.equal(json.name, 'module');
      assert.equal(json.version, '1.0.0');
      assert.equal(Object.keys(json.dependencies).length, 1);
      var cycle = json.dependencies.cycle;
      assert(cycle.scoped && cycle.dependencies.cycle.circular);


      var sorted = t.sort(json);
      assert(sorted.length == 2);
      assert.equal(sorted[0], "module@1.0.0");
      assert.equal(sorted[1], "cycle@1.0.0");

      done(err);
    });
  });

  it('self cycling', function(done) {
    var t = new Traveller(test_root);
    t.toJSONTree({
      name: 'cycle',
      version: '1.0.0',
      dependencies: {
        "cycle": "~1.0.0"
      }
    }, function(err, json) {
      if (err) return done(err);
      assert.equal(json.name, 'cycle');
      assert.equal(json.version, '1.0.0');
      assert.equal(Object.keys(json.dependencies).length, 1);
      assert(json.scoped);
      assert(json.dependencies.cycle.circular);

      var sorted = t.sort(json);
      assert(sorted.length == 1);
      assert.equal(sorted[0], "cycle@1.0.0");

      done(err);
    });
  });


});
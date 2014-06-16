'use strict';
/*global describe, it*/

var path = require('path');
var assert = require('chai').assert;
var Traveller = require('../lib/traveller');


describe('test traveller', function() {
  it('toJSONTree', function(done) {
    var t = new Traveller(path.join(__dirname, './cache_root'), {});
    t.toJSONTree({
      name: 'dep-test',
      version: '1.0.0',
      dependencies: {
        "json": "~1.0.0",
        "util": "~1.0.4"
      },
      devDependencies: {
        'assert': "~1.0.1"
      }
    }, function(err, json) {
      assert.equal(json.name, 'dep-test');
      assert.equal(json.version, '1.0.0');
      assert.equal(Object.keys(json.dependencies).length, 2);
      assert(json.dependencies.util);
      assert.equal(json.dependencies.util.from, "util@~1.0.4");
      assert.equal(json.dependencies.util.version, "1.0.5");
      done(err);
    });
  });


  it('ignoreDev', function(done) {
    var ignored = [];
    var t = new Traveller(path.join(__dirname, './cache_root'), {});
    t.toJSONTree({
      name: "test",
      version: "1.0.0",
      devDependencies: {
        "assert": "~1.0.0"
      }
    }, function(err, json) {
      assert.equal(ignored.length, 1);
      done(err);
    });

    t.on('ignoreDev', function(d) {
      ignored.push(d);
    });

  });

  it('test depth', function(done) {
    var t = new Traveller(path.join(__dirname, './cache_root'), {
      depth: 1
    });

    t.toJSONTree({
        name: 'test-pkg',
        version: "0.1.0",
        engines: {
          "neuron": "*"
        },
        dependencies: {
          "util": "~1.0.0",
          "dep-test": "~1.0.0"
        }
      },
      function(err, json) {
        assert.equal(json.name, 'test-pkg');
        assert.equal(json.version, '0.1.0');
        assert.equal(Object.keys(json.dependencies).length, 2);
        assert(json.dependencies.util);
        assert.equal(json.dependencies.util.from, "util@~1.0.0");
        assert.equal(json.dependencies.util.version, "1.0.5");
        assert(json.dependencies['dep-test']);
        assert(!json.dependencies['dep-test'].dependencies);
        done(err);
      });

  });
});
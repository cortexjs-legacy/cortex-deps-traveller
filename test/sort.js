"use strict";
/*global describe, it*/

var path = require('path');
var assert = require('chai').assert;

var Traveller = require('../lib/traveller');
var sort = require('../lib/sort');
var test_root = path.join(__dirname, './built_root');

describe('test sort', function() {
  it('simple tree', function(done) {
    var t = new Traveller(test_root);
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
      if (err) return done(err);

      var sorted = sort(json, 'dep-test');
      assert.equal(sorted.length, 3);
      assert.equal(sorted[0], 'dep-test@1.0.0');
      assert.equal(sorted[2], 'json@1.0.1');
      done(err);
    });
  });


  it('deep tree', function(done) {
    var t = new Traveller(test_root);

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
        if (err) return done(err);

        var sorted = sort(json, 'test-pkg');

        assert.equal(sorted.length, 4);
        assert.equal(sorted[0], 'test-pkg@0.1.0');
        assert.equal(sorted[3], 'json@1.0.1');
        done(err);
      });

  });


  it('cylce sort', function() {
    var sorted = sort({
      name: 'a',
      version: '1.0.0',
      dependencies: {
        'b': {
          version: '0.0.1'
        },
        'c': {
          version: '0.1.0',
          dependencies: {
            a: {
              version: '1.0.0'
            }
          }
        }
      }
    });

    assert.equal(sorted.length, 3);
    assert.equal(sorted[0], 'a@1.0.0');
    assert.equal(sorted[1], 'b@0.0.1');
    assert.equal(sorted[2], 'c@0.1.0');


    sorted = sort({
      name: 'a',
      version: '1.0.0',
      dependencies: {
        'b': {
          version: '0.0.1',
          dependencies: {
            'c': {
              version: '0.1.0',
              dependencies: {
                b: {
                  version: '0.0.1'
                }
              }
            }
          }
        }
      }
    });

    assert.equal(sorted.length, 3);
    assert.equal(sorted[0], 'a@1.0.0');
    assert.equal(sorted[1], 'b@0.0.1');
    assert.equal(sorted[2], 'c@0.1.0');

  });
});
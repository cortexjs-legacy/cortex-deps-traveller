"use strict"

var Traveller = require('./lib/traveller');


module.exports = function(cache_root, built_root, options) {
  return new Traveller(cache_root, built_root, options);
};

module.exports.Traveller = Traveller;

module.exports.Visitor = Traveller.Visitor;

module.exports.topsort = require('./lib/sort');
"use strict"

var Traveller = require('./lib/traveller');


module.exports = function(cache_root, options) {
  return new Traveller(cache_root, options);
};

module.exports.Visitor = Traveller.Visitor;
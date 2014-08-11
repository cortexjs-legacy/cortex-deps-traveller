"use strict";

var Traveller = require('./lib/traveller');


module.exports = function(built_root, options) {
  return new Traveller(built_root, options);
};

module.exports.Traveller = Traveller;

module.exports.Visitor = Traveller.Visitor;

module.exports.topsort = require('./lib/sort');
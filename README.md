# Cortex Deps Traveller - Travel Package Dep Tree
 [![NPM version](https://badge.fury.io/js/cortex-deps-traveller.svg)](http://badge.fury.io/js/cortex-deps-traveller) [![Build Status](https://travis-ci.org/cortexjs/cortex-deps-traveller.svg?branch=master)](https://travis-ci.org/cortexjs/cortex-deps-traveller) [![Dependency Status](https://gemnasium.com/cortexjs/cortex-deps-traveller.svg)](https://gemnasium.com/cortexjs/cortex-deps-traveller)

Traveling cortex packages through dependencies tree.

## Install

```bash
$ npm install cortex-deps-traveller --save
```

## Usage

```js
var traveller = require('cortex-deps-traveller')(built_root, {
  maxDepth: 3
});

traveller.toJSONTree(pkg, function(err, tree) {
  
});


// Advanced Usage, visit will travel the dep tree with BFS (which is better for performance)
traveller.visit(pkg, {
  enter: function(node, parent) {
      node.pkg; // pkg info
      node.from; // resolved from

      if(parent == null) {
        // is root node, with non-parent
      }
  }, leave: function(node, parent) {

  }
}, function(err) {
  // all things is done
  
});


var Traveller = require('cortex-deps-traveller').Traveller;
```

## APIs

### new Traveller(built_root, [options])

#### Options

* max_depth    _number_
* dev          _boolean_
* async        _boolean_
* pkgDeps      _function_


### traveller.toJSONTree(pkg, callback)

Generate dependencies tree from pkg

### traveller.visit(pkg, visitor, done)

Visit the dependencies tree of pkg with a visitor

* pkg {Object} pkg info object
* visitor {Visitor} visitor
* done {function} called when all the nodes are visited

### traveller.topsort(tree, [rootName])

Return a sorted array from the tree

```javascript
traveller.toJSONTree(pkg, function(err, json) {
    var sorted = traveller.topsort(json, pkg.name);
});
```

* tree {Object} dependencies tree
* rootName {string=} the name of root package in the tree, used for output and cycle-detection

### traveller.resolvePackage(name, range|version, callback)

Read package information object from name and range, which utilized the internal cache in traveller

```javascript
traveller.resolvePackage(name, range, function(err, pkg) {
   // pkg is read from cortex.json
});
```


### traveller.resolveRange(name, range, callback)

Return a version resolved from range for package

```javascript
traveller.resolveRange(name, range, function(err, version) {
   // 
});
```

### traveller.readVersions(name, callback)

Return an array of available versions.

```javascript
traveller.readVersions(name, function(err, versions) {
  // do something on versions
});
```

* name {string} package name
* callback {function}


### module.exports.topsort(root, [name])


## Licence

MIT
<!-- do not want to make nodeinit to complicated, you can edit this whenever you want. -->

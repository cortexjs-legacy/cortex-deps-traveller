# Cortex Traveller - Travel Package Dep Tree
 [![NPM version](https://badge.fury.io/js/cortex-traveller.svg)](http://badge.fury.io/js/cortex-traveller) [![Build Status](https://travis-ci.org/cortexjs/cortex-traveller.svg?branch=master)](https://travis-ci.org/cortexjs/cortex-traveller) [![Dependency Status](https://gemnasium.com/cortexjs/cortex-traveller.svg)](https://gemnasium.com/cortexjs/cortex-traveller)

<!-- description -->

## Install

```bash
$ npm install cortex-traveller --save
```

## Usage

```js
var traveller = require('cortex-traveller')(cache_root, {
  stabelOnly: true,
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
```

## APIs

### new Traveller(cache_root, [options])

#### Options

* stableOnly  _boolean_
* maxDepth    _number_
* enableDev   _boolean_
* enableAsync _boolean_
* pkgDeps     _function_

### traveller.visit(pkg, Visitor, done)

### traveller.toJSONTree(pkg, callback)

### traveller.resolvePackage(name, range|version, callback)

### traveller.resolveRange(name, range, callback)

### traveller.readVersions(name, callback)



## Licence

MIT
<!-- do not want to make nodeinit to complicated, you can edit this whenever you want. -->

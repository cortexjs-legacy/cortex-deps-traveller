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

```

## APIs

### Options

* stableOnly  _boolean_
* maxDepth    _number_
* enableDev   _boolean_
* enableAsync _boolean_
* pkgDeps     _function_


## Licence

MIT
<!-- do not want to make nodeinit to complicated, you can edit this whenever you want. -->

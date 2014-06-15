var path = require('path');
var util = require('util');
var semver = require('semver');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var sortedObject = require('sorted-object');
var async = require('async');
var readjson = require('read-cortex-json');

var SKIP = {};
var BREAK = {};

module.exports = Traveller;

module.exports.Visitor = {
  SKIP: SKIP,
  BREAK: BREAK
};


function Traveller(cache_root, options) {
  if (!root || !cache_root) {
    return new Error("Must provide pkg and cache_root");
  }

  EventEmitter.call(this);

  this.cache_root = cache_root;

  // options
  options = options || {};

  this.options = options;
  this.stableOnly = options.stableOnly !== false;
  this.maxDepth = options.maxDepth || options.depth || Infinity;

  // caches
  this.pkgCache = {};

  this.verCache = {};
}

util.inherits(Traveller, EventEmitter);


/**
 * Get tree of dependencies from the root in JSON fromat
 * @param  {Object}   root     package.json object
 * @param  {Function} callback callback function
 */
Traveller.prototype.toJSONTree = function(root, callback) {
  var trees = {};

  this.visit(root, {
      enter: function(node, parent) {
        var key = node.pkg.name + '@' + node.pkg.version + node.from;
        if (!trees[key]) {
          trees[key] = {
            from: node.pkg.name + '@' + node.from,
            version: node.pkg.version
          }
        }

        var n = trees[key];

        if (parent) {
          var pkey = parent.pkg.name + '@' + parent.pkg.version + parent.from;
          if (!trees[pkey]) {
            trees[pkey] = {
              from: parent.pkg.name + '@' + parent.from,
              version: parent.pkg.version,
              dependencies: {}
            }
          }

          var p = trees[pkey];
          p.dependencies = p.dependencies || {};

          p.dependencies[node.pkg.name] = n;
        }
      }
    },
    function(err) {
      var rootKey = root.name + '@' + root.version + undefined;
      var json = trees[rootKey];
      delete json.from;
      json.name = root.name;
      callback(err, json);
    });
};


/**
 * Visit the dep tree of root with visitor
 * @param  {Object}   root    root of the dep tree
 * @param  {Visitor}  visitor visitor object to travel the dep tree
 * @param  {Object=}  options
 * @param  {Function} done    called when all the node are visited
 */
Traveller.prototype.visit = function(root, visitor, done) {
  this.pkgCache[root.name + "@" + root.version] = root;

  this.__visit({
    pkg: root
  }, null, visitor.enter, visitor.leave, function(err) {
    if (typeof visitor.complete == 'function') {
      visitor.complete.call(this, err, root);
    }

    done && done(err);
  });
};


Traveller.prototype.__visit = function(child, parent, enter, leave, done, depth) {
  depth = depth || 0;


  if (depth > this.maxDepth) {
    return done();
  }

  var self = this;
  var pkg = child.pkg;
  var from = child.from;
  var pkgDir = path.join(this.cache_root, pkg.name, pkg.version, 'package');
  var pkgDeps = this.options.pkgDeps || defaultPkgDeps;


  self.pkgCache[pkg.name + '@' + pkg.version] = pkg;

  // enter
  if (typeof enter == 'function') {
    var ret = enter.call(this, child, parent);
    if (ret === BREAK || ret === SKIP) {
      if (typeof leave == 'function')
        leave.call(this, child, parent);

      return done(null, ret);
    }
  }


  var dependencies = sortedObject(pkgDeps.call(this, pkg));

  var breaked = false;
  async.parallel(Object.keys(dependencies).map(function(name) {
      var range = dependencies[name];
      return function(cb) {
        if (breaked) return cb();
        self.resolveRange(name, range, function(err, version) {
          if (err) return done(err);
          if (version) {
            var key = name + '@' + version;
            if (self.pkgCache[key]) {
              self.__visit({
                pkg: self.pkgCache[key],
                from: range
              }, {
                pkg: pkg,
                from: child.from
              }, enter, leave, function(err, ret) {
                if (ret === BREAK)
                  breaked = true;
                cb(err);
              }, depth + 1);
            } else {
              var depDir = path.join(self.cache_root, name, version, 'package');
              readjson.read(depDir, function(err, dep) {
                self.pkgCache[key] = dep;

                self.__visit({
                  pkg: dep,
                  from: range
                }, {
                  pkg: pkg,
                  from: child.from
                }, enter, leave, function(err, ret) {
                  if (ret === BREAK)
                    breaked = true;
                  cb(err);
                }, depth + 1);
              });
            }
          }
        });
      };
    }),
    // all dependencies done
    function(err) {
      if (err) return done(err);
      var ret;
      if (typeof leave == 'function') {
        ret = leave.call(this, child, parent);
      }

      done(null, ret);
    });
};



Traveller.prototype.resolveRange = function(name, range, callback) {
  var self = this;
  (function(cb) {
    if (self.verCache[name]) {
      cb(null, self.verCache[name]);
    } else {

      self.readVersions(name, function(err, versions) {
        cb(null, versions);
      });
    }
  })(function(err, versions) {
    if (err) return callback(err);

    var ver = semver.maxSatisfying(versions, range);

    if (!ver) {
      // TODO: whether go to registry, issue #1
      return callback("Can not resolve package " + name + " from range: " + range + " in available versions: " + versions);
    }

    callback(null, ver);
  });
};



Traveller.prototype.readVersions = function(name, cb) {
  var verCache = this.verCache || {};
  // no multi process
  if (verCache[name]) {
    cb(null, verCache[name]);
  } else {
    var pkg_root = path.join(this.cache_root, name);
    fs.exists(pkg_root, function(exists) {
      if (!exists)
        return cb({
          message: "No pacakge '" + name + "' installed, please run 'cortex install' first"
        });

      fs.readdir(pkg_root, function(err, files) {
        if (err) return cb(err);

        var vers = files.filter(semver.valid);
        if (!this.stableOnly) {
          vers = vers.filter(function(ver) {
            return ver.indexOf('-') == -1;
          });
        }

        cb(null, verCache[name] = vers);
      });
    });
  }
};


function defaultPkgDeps(pkg) {
  var dependencies = {};
  if (pkg.dependencies) {
    for (var d in pkg.dependencies) {
      dependencies[d] = pkg.dependencies[d];
    }
  }

  if (this.enableDev) {
    var devDependencies = pkg.devDependencies || {};
    for (var d in devDependencies) {
      dependencies[d] = devDependencies[d];
    }
  } else if (!isEmptyObject(pkg.devDependencies)) {
    for (var d in pkg.devDependencies) {
      this.emit("ignoreDev", d);
    }
  }

  if (this.enableAsync) {
    var asyncDependencies = pkg.asyncDependencies || {};
    for (var ad in asyncDependencies) {
      dependencies[ad] = asyncDependencies[ad];
    }
  } else if (pkg.asyncDependencies) {
    for (var ad in pkg.asyncDependencies) {
      this.emit("ignoreAsync", ad);
    }
  }
  return dependencies;
}


function isEmptyObject(obj) {
  if (!obj) return true;
  for (var p in obj) {
    if (obj.hasOwnProperty(p))
      return false;
  }

  return true;
}
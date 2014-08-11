var path = require('path');
var util = require('util');
var semver = require('semver');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var async = require('async');

var SKIP = {};
var BREAK = {};

module.exports = Traveller;

module.exports.Visitor = {
  SKIP: SKIP,
  BREAK: BREAK
};


function Traveller(built_root, options) {
  if (typeof built_root != 'string') {
    return new Error("Must provide built_root");
  }

  EventEmitter.call(this);

  this.built_root = built_root;

  // options
  options = options || {};

  this.options = options;
  this.enableDev = options.dev || options.enableDev;
  this.enableAsync = options.async || options.enableAsync;
  this.stopOnError = options.stop_on_error !== false;

  this.maxDepth = options.max_depth || options.maxDepth || options.depth || Infinity;

  // caches
  this.pkgCache = {};

  this.verCache = {};
}

util.inherits(Traveller, EventEmitter);

Traveller.prototype.topsort = Traveller.prototype.sort = require('./sort');

/**
 * Get tree of dependencies from the root in JSON fromat
 * @param  {Object}   root     package.json object
 * @param  {Function} callback callback function
 */
Traveller.prototype.toJSONTree = function(root, callback) {
  var trees = {};

  this.visit(root, {
      enter: function(node, parent, circular, ref) {
        var key = node.pkg.name + '@' + node.pkg.version + node.from;
        if (!trees[key]) {
          trees[key] = {
            from: node.pkg.name + '@' + node.from,
            version: node.pkg.version
          };
        }

        var n = trees[key];
        if (circular && ref) {
          n = {
            from: node.pkg.name + '@' + node.from,
            version: node.pkg.version,
            circular: true
          };

          var r = trees[ref.pkg.name + '@' + ref.pkg.version + ref.from];
          if (r) {
            r.scoped = true;
          }
        }

        if (parent) {
          var pkey = parent.pkg.name + '@' + parent.pkg.version + parent.from;
          if (!trees[pkey]) {
            trees[pkey] = {
              from: parent.pkg.name + '@' + parent.from,
              version: parent.pkg.version,
              dependencies: {}
            };
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
  if (!root) return done('Root must be provided');
  var self = this;
  process.nextTick(function() {
    self.pkgCache[root.name + "@" + root.version] = root;

    self.__visit({
      pkg: root
    }, null, visitor.enter, visitor.leave, function(err) {
      if (typeof visitor.complete == 'function') {
        visitor.complete.call(this, err, root);
      }
      done && done(err);
    });
  });
};


Traveller.prototype.__visit = function(child, parent, enter, leave, done, depths) {
  depths = depths || [];

  if (depths.length > this.maxDepth) {
    return done();
  }


  var self = this;
  var pkg = child.pkg;
  var from = child.from;
  var pkgDeps = this.options.pkgDeps || defaultPkgDeps;

  // try to find child node in the path if there is a cycle existed
  for (var i = depths.length - 1; i >= 0; --i) {
    var d = depths[i];
    if (d.pkg.name == pkg.name && d.pkg.version == pkg.version) {
      // cycle
      if (typeof enter == 'function') {
        var ret, err;
        try {
          ret = enter.call(this, child, parent, true, d);
          if (typeof leave == 'function')
            leave.call(this, child, parent, true, d);
        } catch (e) {
          err = e;
        } finally {
          return done(err, ret);
        }
      }
    }
  }

  self.pkgCache[pkg.name + '@' + pkg.version] = pkg;

  // enter
  if (typeof enter == 'function') {
    var ret, err;
    try {
      ret = enter.call(this, child, parent);
    } catch (e) {
      err = e;
    } finally {
      if (ret === BREAK || ret === SKIP) {
        if (typeof leave == 'function')
          leave.call(this, child, parent);
        return done(null, ret);
      } else if (err)
        return done(err);
    }
  }

  var dependencies = pkgDeps.bind(this)(pkg);

  var breaked = false;
  async.parallel(Object.keys(dependencies).map(function(name) {
      var range = dependencies[name];
      return function(cb) {
        if (breaked) return cb();
        self.resolvePackage(name, range, function(err, dep) {
          if (err) {
            return cb(err);
          }

          // skip
          if (!dep) {
            self.emit('unmet', name, range, child.pkg.name, child.pkg.version, child.from);
            return cb();
          }

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
          }, depths.concat(child));
        });
      };
    }),
    // all dependencies done
    function(err) {
      if (err) return done(err);

      var ret;
      if (typeof leave == 'function') {
        try {
          ret = leave.call(this, child, parent);
        } catch (err) {
          return done(err);
        }
      }

      done(null, ret);
    });
};


Traveller.prototype.resolvePackage = function(name, range, callback) {
  var self = this;
  self.resolveRange(name, range, function(err, version) {
    if (err) {
      if (self.stopOnError) {
        return callback(err);
      } else {
        self.emit("depErr", name, range, err);
        return callback();
      }
    }

    var key = name + '@' + version;
    if (self.pkgCache[key]) {
      callback(null, self.pkgCache[key]);
    } else {
      var ctx_json = path.join(self.built_root, name, version, 'cortex.json');
      fs.exists(ctx_json, function(exists) {
        // error that can not continue and recover
        if (!exists) return callback(new Error("'" + ctx_json + "' does not exist"));
        var pkg;
        try {
          pkg = require(ctx_json);
        } catch (e) {
          // error that can not continue and recover
          return callback(e);
        }

        self.pkgCache[key] = pkg;
        callback(null, pkg);
      });
    }
  });
};


Traveller.prototype.resolveRange = function(name, range, callback) {
  var self = this;
  (function(cb) {
    if (self.verCache[name]) {
      cb(null, self.verCache[name]);
    } else {

      self.readVersions(name, cb);
    }
  })(function(err, versions) {
    if (err) return callback(err);

    var ver = semver.maxSatisfying(versions, range);

    if (!ver) {
      // TODO: whether go to registry, issue #1
      return callback(new Error("Can not resolve package " + name + " from range: " + range + " in available versions: " + versions));
    }

    callback(null, ver);
  });
};



Traveller.prototype.readVersions = function(name, cb) {
  var self = this,
    verCache = self.verCache || {};
  // no multi process
  if (verCache[name]) {
    cb(null, verCache[name]);
  } else {
    var pkg_root = path.join(self.built_root, name);
    fs.exists(pkg_root, function(exists) {
      if (!exists)
        return cb(new Error("No pacakge '" + name + "' installed, please run 'cortex install' first"));

      fs.readdir(pkg_root, function(err, files) {
        if (err) return cb(err);

        var vers = files.filter(semver.valid);
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
/**
 * Return topsorted array
 */

module.exports = function(root, name) {
    if (!root) return [];

    name = name || root.name;
    if (!name) throw new Error('Root node has no name');

    var incomings = {};
    var outcomings = {};
    var rootId = name + '@' + root.version;

    var queue = [{
        id: rootId,
        node: root
    }],
        visited = {},
        n;


    while (n = queue.shift()) {
        var id = n.id;

        // mark visited
        visited[id] = true;

        var dependencies = n.node.dependencies || {}; // don't use dependents as dependents may continas cycle

        var leaves = Object.keys(dependencies).map(function(name) {
            return {
                id: name + '@' + dependencies[name].version,
                node: dependencies[name]
            };
        });

        // skip if visted already
        Array.prototype.push.apply(queue, leaves.filter(function(l) {
            return !visited[l.id];
        }) || []);


        leaves.forEach(function(dep) {
            var income = incomings[dep.id] = incomings[dep.id] || [];
            if (income.indexOf(id) == -1)
                income.push(id);

            var outcome = outcomings[id] = outcomings[id] || [];
            if (outcome.indexOf(dep.id))
                outcome.push(dep.id);
        });
    }


    // do sort
    queue = [rootId];

    var sort = [];

    while (!isEmptyObject(incomings) || queue.length) {
        var start = {};
        while (n = queue.shift()) {
            if (sort.indexOf(n) == -1)
                sort.push(n);

            var dependencies = outcomings[n] || [];
            dependencies.forEach(function(depId) {
                var income = incomings[depId] || [];
                var idx = income.indexOf(n);
                if (idx != -1) {
                    income.splice(idx, 1);
                    if (!income.length) {
                        delete incomings[depId];
                        delete start[depId];
                        queue.push(depId);
                    } else {
                        start[depId] = true;
                    }
                }
            });
        }


        if (!isEmptyObject(incomings)) {
            // cycle detected
            Object.keys(start).forEach(function(id) {
                var find = false,
                    path = [];
                find = searchGroup(id, path, incomings);
                if (find) {
                    for (var len = path.length, i = len; i > 0; --i) {
                        var pathid = path[i % len];
                        if (sort.indexOf(pathid) == -1)
                            sort.push(pathid);

                        var deps = outcomings[pathid] || [];

                        deps.forEach(function(depId) {
                            var income = incomings[depId] || [];
                            var idx = income.indexOf(pathid);
                            if (idx != -1) { // changed
                                income.splice(idx, 1);
                                if (!income.length) {
                                    delete incomings[depId];
                                    if (path.indexOf(depId) == -1)
                                        queue.push(depId);
                                }
                            }
                        });
                    }
                }
            });
        }
    }

    return sort;


    function searchGroup(id, path, edges) {
        if (path.indexOf(id) != -1) {
            return true;
        }

        path.push(id);

        var find = false;
        var e = edges[id] || [];
        e.forEach(function(rid) {
            if (!find) {
                find = searchGroup(rid, path, edges);
            }
        });

        if (find) return find;

        path.pop();
        return false;
    }


};


function isEmptyObject(obj) {
    for (var p in obj) {
        return false;
    }

    return true;
}
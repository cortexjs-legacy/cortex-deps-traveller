/**
 * Return topsorted array
 */

module.exports = function(root, name) {
    if (!root) return [];

    name = name || root.name;
    if (!name) throw new Error('Root node has no name');

    var incomings = {};
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
        });
    }


    if (incomings[rootId] && incomings[rootId].length) {
        throw new Error('Cycle detected');
    }

    // do sort
    queue = [{
        id: rootId,
        node: root
    }];
    var sort = [];
    while (n = queue.shift()) {
        sort.push(n.id);

        var dependencies = n.node.dependencies || [];

        Object.keys(dependencies).forEach(function(dep) {
            var depId = dep + '@' + dependencies[dep].version;

            var income = incomings[depId] || [];
            var idx = income.indexOf(n.id);
            if (idx != -1) {
                income.splice(idx, 1);
                if (!income.length) {
                    delete incomings[depId];
                }
            }

            if (!income.length) {
                queue.push({
                    id: depId,
                    node: dependencies[dep]
                });
            }
        });
    }

    for (var rem in incomings) {
        throw new Error('Cycle detected');
    }

    return sort;
};
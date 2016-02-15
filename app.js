var DISABLED = {};
var LEGEND_GRAPH;
var TYPES = ['building', 'research', 'proving', 'items', 'drop', 'misc'];
var INITIALIZED = false;

function run() {
    LEGEND_GRAPH = legend();
    chart();
    legendClicks();
    filterChange();
    hierarchy();
}

function hierarchy() {
    XCOM_TECH_TREE.forEach(function (item) {
        if (item.parent) {
            item.parent.forEach(function (index) {
                if (XCOM_TECH_TREE[index]) {
                    XCOM_TECH_TREE[index].children = XCOM_TECH_TREE[index].children || [];
                    XCOM_TECH_TREE[index].children.push(item);
                }
            });
        }
    });
}

function legend() {
    var g = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: 'TB',
            nodesep: 20,
            ranksep: 20
        })
        .setDefaultEdgeLabel(function () {
            return {};
        });


    TYPES.forEach(function (item, index) {
        g.setNode(index, {
            label: item,
            class: item,
            height: 22,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 0,
            paddingBottom: 4
        });
    });

    var render = new dagreD3.render();
    var svg = d3.select('svg.legend');
    var root = svg.select('g');

    render(root, g);
    root.attr('transform', 'translate(' + [1.5, 1.5] + ')');
    svg.attr('height', g.graph().height + 3);
    svg.attr('width', g.graph().width + 3);

    return g.graph();
}

function chart() {
    var g = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: 'LR',
            nodesep: 20,
            ranksep: 20
        })
        .setDefaultEdgeLabel(function () {
            return {};
        });

    XCOM_TECH_TREE.forEach(function (item, index) {
        var radius = item.parent ? 11 : 0;

        if (!item.hide) {
            g.setNode(index, {
                label: item.disable ? '…' : item.title,
                class: item.type + (item.disable ? ' disabled' : ''),
                height: 22,
                rx: radius,
                ry: radius,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 0,
                paddingBottom: 4
            });
        }
    });

    XCOM_TECH_TREE.forEach(function (item, index) {
        if (item.parent) {
            item.parent.forEach(function (parent) {
                if (!XCOM_TECH_TREE[parent].hide && !XCOM_TECH_TREE[index].hide) {
                    g.setEdge(parent, index, {
                        lineInterpolate: 'basis'
                    });
                }
            });
        }
    });

    var render = new dagreD3.render();
    var svg = d3.select('svg.chart');
    var root = svg.select('g');

    g.graph().transition = INITIALIZED ? function (selection) {
        return selection.transition().duration(250);
    } : null;

    render(root, g);
    root.attr('transform', 'translate(' + [1.5, 1.5] + ')');
    svg.attr('height', g.graph().height + 3);
    svg.attr('width', g.graph().width + 3);

    INITIALIZED = true;

    tooltip();
}

function legendClicks() {
    var svg = d3.select('svg.legend');

    var nodes = svg.selectAll('.node');

    nodes.on('click', function (d) {
        var e = d3.select(this);

        DISABLED[TYPES[d]] = !DISABLED[TYPES[d]];
        e.classed('disabled', DISABLED[TYPES[d]]);
        setTimeout(update, 0);
    });
}

function filterChange() {
    var svg = d3.select('#filter');

    svg.on('input', function () {
        setTimeout(update, 0);
    });
}

function reset() {
    XCOM_TECH_TREE.forEach(function (item) {
        item.hide = false;
        item.disable = false;
    });
}

function update() {
    reset();

    var filter = d3.select('#filter').node().value;

    filter = filter ? filter.toLowerCase() : null;

    XCOM_TECH_TREE.forEach(function (item) {
        item.hide = false;
        item.disable = DISABLED[item.type] || (filter && !(item.title.toLowerCase().indexOf(filter) > -1));
    });

    hide();
    chart();
}

function isVisible(item) {
    if (item.hide) {
        return false;
    }

    if (!item.children) {
        return !item.disable;
    }

    for (var i = 0; i < item.children.length; i++) {
        var child = item.children[i];

        if (isVisible(child)) {
            return true;
        }
    }

    return false;
}

function hide() {
    XCOM_TECH_TREE.forEach(function (item) {
        if (!item.hide) {
            if (!isVisible(item)) {
                item.hide = true;
            }
        }
    });
}

function getCostTable(item) {
    if (item.cost) {
        var r = {};
        var k, i;

        for (i = 0; i < item.cost.length; i++) {
            for (k in item.cost[i]) {
                r[k] = r[k] || [];
                r[k][i] = item.cost[i][k];
            }
        }

        if (item.instantCost) {
            for (i = 0; i < item.instantCost.length; i++) {
                for (k in item.instantCost[i]) {
                    r[k] = r[k] || [];
                    r[k][i] += ' (' + item.instantCost[i][k] + ')';
                }
            }
        }

        var t = '<table>';

        for (k in r) {
            t += '<tr>';
            t += '<th>' + k + '</th>';
            t += '<td>' + r[k].join('</td><td>') + '</td>';
            t += '</tr>';
        }

        t += '</table>';

        return t;
    }

    return '';
}

function tooltip() {
    var div = d3.select('.tooltip');

    d3.selectAll('svg.chart .node').on('mousemove', function (d) {
            var item = XCOM_TECH_TREE[d];

            item.table = item.table || getCostTable(item);

            div
                .attr('class', 'tooltip ' + item.type)
                .html('<b>' + item.title + '</b>' +
                    '<br>' +
                    '<i>' + item.type + '</i>' +
                    (item.table ? '<hr>' : '') +
                    item.table)
                .style('opacity', 1)
                .style('left', (d3.event.pageX + 28) + 'px')
                .style('top', (d3.event.pageY) + 'px');
        })
        .on('mouseout', function (d) {
            div.style('opacity', 0);
        });
}

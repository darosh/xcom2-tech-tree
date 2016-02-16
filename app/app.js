var DISABLED = {};
var LEGEND_GRAPH;
var TYPES = ['building', 'research', 'proving', 'item', 'drop', 'misc', 'skill'];
var INITIALIZED = false;
var RENDER = new dagreD3.render();
var SVG = d3.select('svg.chart');
var ROOT = SVG.select('g');
var DIV = d3.select('.tooltip');
var FILTER = d3.select('#filter');
var SHORTCUTS = true;
var HORIZONTAL = false;

function run() {
    LEGEND_GRAPH = legend();
    chart();
    legendClicks();
    filterChange();
    tools();
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

    var svg = d3.select('svg.legend');
    var root = svg.select('g');

    RENDER(root, g);
    root.attr('transform', 'translate(' + [1.5, 1.5] + ')');
    svg.attr('height', g.graph().height + 3);
    svg.attr('width', g.graph().width + 3);

    return g.graph();
}

function chart() {
    var g = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: HORIZONTAL ? 'TB' : 'LR',
            nodesep: 20,
            ranksep: 20
        });

    XCOM_TECH_TREE.forEach(function (item, index) {
        var radius = item.parent ? 11 : 0;

        if (!item.hide) {
            var d = SHORTCUTS && item.disable;

            g.setNode(index, {
                label: d ? '…' : item.title,
                class: item.type + (d ? ' disabled' : ''),
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

    g.graph().transition = INITIALIZED ? function (selection) {
        return selection.transition().duration(250);
    } : null;

    RENDER(ROOT, g);
    ROOT.attr('transform', 'translate(' + [1.5, 1.5] + ')');
    SVG.transition().duration(INITIALIZED ? 250 : 0)
        .attr('height', ((g.graph().height > 0) ? g.graph().height : 0) + 3)
        .attr('width', ((g.graph().width > 0) ? g.graph().width : 0) + 3);

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
        delayedUpdate();
    });
}

function legendStatus() {
    var svg = d3.select('svg.legend');
    var nodes = svg.selectAll('.node');

    nodes.classed('disabled', function (d) {
        return DISABLED[TYPES[d]];
    });
}

function filterChange() {
    FILTER.on('input', function () {
        delayedUpdate();
    });
}

function reset() {
    XCOM_TECH_TREE.forEach(function (item) {
        item.hide = false;
        item.disable = false;
    });
}

function delayedUpdate() {
    setTimeout(update, 20);
}

function update() {
    reset();
    hideTooltip();

    var filter = FILTER.node().value;

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

    return !item.disable;
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

function getCostArray(item) {
    var t = {};

    if (item.cost) {
        var r = {};
        var k, i;
        var m = 0;

        for (i = 0; i < item.cost.length; i++) {
            for (k in item.cost[i]) {
                r[k] = r[k] || [];
                r[k][i] = item.cost[i][k];
                m = Math.max(m, i);
            }
        }


        m++;

        if (item.instantCost) {
            for (i = 0; i < item.instantCost.length; i++) {
                for (k in item.instantCost[i]) {
                    r[k] = r[k] || [];
                    r[k][i] += '/' + item.instantCost[i][k];
                }
            }
        }

        for (k in r) {
            for (i = 0; i < m; i++) {
                r[k][i] = r[k][i] !== undefined ? r[k][i] : '?';
            }

            t[k] = r[k];
        }
    }

    return t;
}

function getCostTable(item) {
    var t = '';

    if (item.cost) {
        t += '<table>';

        var r = getCostArray(item);
        var t = '<table>';

        for (var k in r) {
            t += '<tr>';
            t += '<th>' + k + '</th>';
            t += '<td>' + r[k].join('</td><td>') + '</td>';
            t += '</tr>';
        }

        t += '</table>';
    }

    return t;
}

function hideTooltip() {
    DIV
        .style('opacity', 0)
        .style('left', 0 + 'px')
        .style('top', 0 + 'px');
}

function tooltip() {
    d3.selectAll('svg.chart .node')
        .on('click', function (d) {
            var item = XCOM_TECH_TREE[d];
            FILTER.node().value = item.title;

            if (DISABLED[item.type]) {
                DISABLED[item.type] = false;
                setTimeout(legendStatus, 10);
            }

            delayedUpdate();
        })
        .on('mousemove', function (d) {
            var item = XCOM_TECH_TREE[d];

            item.table = item.table || getCostTable(item);

            DIV
                .attr('class', 'tooltip ' + item.type)
                .html('<b>' + item.title + '</b>' +
                    '<br>' +
                    '<i>' + item.type + '</i>' +
                    (item.required ? '<hr>' +
                    '<table><tr><th>Required</th><td>' + item.required + '</td></tr></table>' : '') +
                    (item.table ? '<hr>' : '') +
                    item.table)
                .style('opacity', 1)
                .style('left', (d3.event.pageX + 28) + 'px')
                .style('top', (d3.event.pageY) + 'px');
        })
        .on('mouseout', hideTooltip);
}

function getCsv() {
    var header = ['Id', 'Title', 'Type', 'Parent', 'Required',
        'Supplies', 'Intel', 'Upkeep', 'Power', 'Elerium', 'Elerium Core', 'Alloy', 'Engineer', 'Scientist', 'Corpse'];

    var rows = [header];

    XCOM_TECH_TREE.forEach(function (item, index) {
        var row = [];

        row.push(index);
        row.push(item.title);
        row.push(item.type);
        row.push(item.parent ? item.parent.join(', ') : '');
        row.push(item.required ? item.required : '');

        var a = getCostArray(item);

        for (var k in a) {
            var index = header.indexOf(k);

            if (index < 0) {
                index = header.length;
                header.push(k);
            }

            row[index] = a[k].join(', ');
        }

        rows.push('"' + row.join('","') + '"');
    });

    rows[0] = header.join(',');

    return rows.join('\n');
}

function tools() {
    d3.select('#reset')
        .on('click', function () {
            d3.event.preventDefault();
            FILTER.node().value = '';
            delayedUpdate();
        });

    d3.select('#save')
        .on('click', function () {
            d3.event.preventDefault();

            var source = getSource(document.querySelectorAll('svg.chart')[0], getStyles(document));
            source[0] = source[0].replace(/dy="1em"/gi, 'dy="14"');
            var url = window.URL.createObjectURL(new Blob(source, {'type': 'text/xml'}));
            var a = document.getElementById('download');
            a.setAttribute('href', url);
            a.setAttribute('download', 'xcom2-tech-tree.svg');
            a.style['display'] = 'none';
            a.click();

            setTimeout(function () {
                window.URL.revokeObjectURL(url);
            }, 10);
        });


    d3.select('#export')
        .on('click', function () {
            d3.event.preventDefault();

            var source = getCsv();
            var url = window.URL.createObjectURL(new Blob([source], {'type': 'text/csv'}));
            var a = document.getElementById('download');
            a.setAttribute('href', url);
            a.setAttribute('download', 'xcom2-tech-tree.csv');
            a.style['display'] = 'none';
            a.click();

            setTimeout(function () {
                window.URL.revokeObjectURL(url);
            }, 10);
        });

    d3.select('#horizontal')
        .on('click', function () {
            d3.event.preventDefault();
            HORIZONTAL = !HORIZONTAL;
            var s = d3.select(this);
            var t = s.text();
            t = t.replace(HORIZONTAL ? ': off' : ': on', !HORIZONTAL ? ': off' : ': on');
            s.text(t);
            delayedUpdate();
        });

    d3.select('#shortcuts')
        .on('click', function () {
            d3.event.preventDefault();
            SHORTCUTS = !SHORTCUTS;
            var s = d3.select(this);
            var t = s.text();
            t = t.replace(SHORTCUTS ? ': off' : ': on', !SHORTCUTS ? ': off' : ': on');
            s.text(t);
            delayedUpdate();
        });
}

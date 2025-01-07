"use strict";
function parseQueryString() {
    let start = null;
    let end = null;
    if (location.search != '') {
        const params = location.search.substring(1).split('&');
        for (const param of params) {
            const [name, value] = param.split('=', 2);
            if (value === '') {
                continue;
            }
            if (name == 'start') {
                start = new Date(value);
            }
            else if (name == 'end') {
                end = new Date(value);
            }
        }
    }
    return [start, end];
}
function mapUnitToMax(unit) {
    switch (unit) {
        case 'ms':
            return 'sec';
        default:
            return unit;
    }
}
function show_notification(html_text) {
    let notificationElem = document.getElementById('notification');
    notificationElem.innerHTML = html_text;
    notificationElem.classList.remove('hidden');
    setTimeout(() => {
        notificationElem.classList.add('hidden');
    }, 3000);
}
function compression_over_time(lines, counter) {
    let plot = {
        data: [],
        layout: {
            title: "compression",
            xaxis: {
                title: "Benchmark Index",
                tickformat: 'd', // only integers
            },
            yaxis: {
                title: "Wall Time (ms)",
                rangemode: "tozero",
            },
            height: 700,
            width: Math.min(1200, window.innerWidth - 30),
            margin: {
                l: 50,
                r: 20,
                b: 100,
                t: 100,
                pad: 4,
            },
            legend: {
                orientation: window.innerWidth < 700 ? "h" : "v",
            },
        },
    };
    let unzipped = {};
    for (let line of lines) {
        for (let [group, runs] of Object.entries(line.bench_groups)) {
            if (!group.startsWith("compress")) {
                continue;
            }
            for (let run of runs) {
                let key = run.cmd[2].startsWith("tests/input/bzip2-testfiles/") ?
                    run.cmd[2].slice("tests/input/bzip2-testfiles/".length) : run.cmd[2];
                key += " (" + group + ")";
                if (!unzipped[key]) {
                    unzipped[key] = { x: [], y: [], sha: [] };
                }
                unzipped[key].y.push(run.counters[counter].value);
                unzipped[key].sha.push(line.commit_hash);
            }
        }
    }
    for (let key of Object.keys(unzipped)) {
        if (!unzipped[key]) {
            continue;
        }
        plot.data.push({
            y: unzipped[key].y,
            text: unzipped[key].sha,
            name: `${key.startsWith("tests/input/bzip2-testfiles/") ? key.slice("tests/input/bzip2-testfiles/".length) : key}`,
            hovertemplate: `%{y} %{text}`
        });
    }
    return plot;
}
function decompression_over_time(lines, counter) {
    let plot = {
        data: [],
        layout: {
            title: "decompression",
            xaxis: {
                title: "Benchmark Index",
                tickformat: 'd', // only integers
            },
            yaxis: {
                title: "Wall Time (ms)",
                rangemode: "tozero",
            },
            height: 700,
            width: Math.min(1200, window.innerWidth - 30),
            margin: {
                l: 50,
                r: 20,
                b: 100,
                t: 100,
                pad: 4,
            },
            legend: {
                orientation: window.innerWidth < 700 ? "h" : "v",
            },
        },
    };
    let unzipped = {};
    for (let line of lines) {
        for (let [group, runs] of Object.entries(line.bench_groups)) {
            if (!group.startsWith("decompress")) {
                continue;
            }
            for (let run of runs) {
                let key = run.cmd[2].startsWith("tests/input/bzip2-testfiles/") ?
                    run.cmd[2].slice("tests/input/bzip2-testfiles/".length) : run.cmd[2];
                key += " (" + group + ")";
                if (!unzipped[key]) {
                    unzipped[key] = { x: [], y: [], sha: [] };
                }
                unzipped[key].y.push(run.counters[counter].value);
                unzipped[key].sha.push(line.commit_hash);
            }
        }
    }
    for (let key of Object.keys(unzipped)) {
        if (!unzipped[key]) {
            continue;
        }
        plot.data.push({
            y: unzipped[key].y,
            text: unzipped[key].sha,
            name: `${key}`,
            hovertemplate: `%{y} %{text}`
        });
    }
    return plot;
}
async function main() {
    await update('linux-x86');
}
async function update(target) {
    let data_url = `https://raw.githubusercontent.com/trifectatechfoundation/libbzip2-rs-bench/main/metrics-${target}.json`;
    const data = await (await fetch(data_url)).text();
    const entries = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));
    render(data_url, entries);
}
function render(data_url, entries) {
    const bodyElement = document.getElementById('plots');
    // clear the plots from the previous configuration
    while (bodyElement.firstChild) {
        bodyElement.removeChild(bodyElement.firstChild);
    }
    const counter = data_url.includes("macos") ? "user-time" : "task-clock";
    {
        const plot = decompression_over_time(entries, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
        bodyElement.appendChild(plotDiv);
    }
    {
        const plot = compression_over_time(entries, counter);
        // Render the plot
        const plotDiv = document.createElement("div");
        Plotly.newPlot(plotDiv, plot.data, plot.layout);
        bodyElement.appendChild(plotDiv);
    }
}
main();

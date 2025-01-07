type Unit = 'MB' | 'ms' | 'sec';
type MemoryMetric = [number, 'MB'];
type TimeMetric = [number, 'ms'];

type Root = {
  commit_hash: string
  commit_timestamp: number
  timestamp: Timestamp
  arch: string
  os: string
  runner: string
  cpu_model: string
  bench_groups: {[key: string]: SingleBench[]},
};

type Timestamp = {
  secs_since_epoch: number
  nanos_since_epoch: number
};

type SingleBench = {
  cmd: string[]
  counters: Counters
};

type CounterName = "cycles" | "instructions" | "user-time" | "task-clock";
type Counters = {
  cycles: Cycles
  instructions: Instructions
  "user-time": UserTime,
  "task-clock": TaskClock
};

type Cycles = {
  value: string
  unit: string
};

type Instructions = {
  value: string
  unit: string
};

type UserTime = {
  value: string
  unit: string
};

type TaskClock = {
  value: string
  unit: string
};

type Plots = {
    data: (Plotly.Data & { name: string })[];
    layout: Partial<Plotly.Layout>;
};

function parseQueryString(): [Date | null, Date | null] {
    let start: Date | null = null;
    let end: Date | null = null;
    if (location.search != '') {
        const params = location.search.substring(1).split('&');
        for (const param of params) {
            const [name, value] = param.split('=', 2);
            if (value === '') {
                continue;
            }
            if (name == 'start') {
                start = new Date(value);
            } else if (name == 'end') {
                end = new Date(value);
            }
        }
    }
    return [start, end];
}

function mapUnitToMax(unit: Unit): Unit {
    switch (unit) {
        case 'ms':
            return 'sec';
        default:
            return unit;
    }
}

function show_notification(html_text: string) {
    let notificationElem = document.getElementById('notification')!;
    notificationElem.innerHTML = html_text;
    notificationElem.classList.remove('hidden');
    setTimeout(() => {
        notificationElem.classList.add('hidden');
    }, 3000);
}

function compression_over_time(lines: Root[], counter: CounterName): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title: "libbzip2-rs compression",
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

    let unzipped: {[level: string]: {x: [], y: string[], sha: string[]}} = {};

    for (let line of lines) {
        for (let run of line.bench_groups["compress-rs"]) {
            const key = run.cmd[1];

            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], sha: [] };
            }

            unzipped[key].y.push(run.counters[counter].value);
            unzipped[key].sha.push(line.commit_hash);
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

function decompression_over_time(lines: Root[], counter: CounterName): Plots {
    let plot: Plots = {
        data: [],
        layout: {
            title: "zlib-rs decompression",
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

    let unzipped: {[key: string]: {x: [], y: string[], sha: string[]}} = {};

    for (let line of lines) {
        for (let run of line.bench_groups["decompress-rs"]) {
            const key = run.cmd[2];

            if (!unzipped[key]) {
                unzipped[key] = { x: [], y: [], sha: [] };
            }

            unzipped[key].y.push(run.counters[counter].value);
            unzipped[key].sha.push(line.commit_hash);
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

async function main() {
    await update('linux-x86');
}

async function update(target: string) {
    let data_url = `https://raw.githubusercontent.com/trifectatechfoundation/libbzip2-rs-bench/main/metrics-${target}.json`

    const data = await (await fetch(data_url)).text();

    const entries: Root[] = data
        .split('\n')
        .filter((it) => it.length > 0)
        .map((it) => JSON.parse(it));

    render(data_url, entries);
}

function render(data_url: string, entries: Root[]) {
    const bodyElement = document.getElementById('plots')!;

    // clear the plots from the previous configuration
    while (bodyElement.firstChild) {
        bodyElement.removeChild(bodyElement.firstChild);
    }

    const counter: CounterName = data_url.includes("macos") ? "user-time" : "task-clock";

    {
        const plot = decompression_over_time(entries, counter);

        // Render the plot
        const plotDiv = document.createElement(
            "div"
        ) as any as Plotly.PlotlyHTMLElement;

        Plotly.newPlot(plotDiv, plot.data, plot.layout);

        bodyElement.appendChild(plotDiv);
    }

    /*
    {
        const plot = compression_over_time(entries, counter);

        // Render the plot
        const plotDiv = document.createElement(
            "div"
        ) as any as Plotly.PlotlyHTMLElement;

        Plotly.newPlot(plotDiv, plot.data, plot.layout);

        bodyElement.appendChild(plotDiv);
    }
    */
}

main();

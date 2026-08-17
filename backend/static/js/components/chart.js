/* ============================================================
   Chartly — Chart component
   Plotly rendering, image export, and code generation.
   ============================================================ */

export const chart = {
  aggTypes: ['bar', 'line', 'area', 'pie', 'scatter', 'treemap', 'funnel'],
  rawTypes: ['histogram', 'box', 'violin'],

  accent(type) {
    return { bar: 'orange', line: 'green', pie: 'purple', scatter: 'blue', area: 'indigo', histogram: 'green', box: 'orange', violin: 'purple', treemap: 'blue', funnel: 'indigo' }[type] || 'slate';
  },

  typeLabel(type) {
    return { bar: 'Bar Chart', line: 'Line Chart', pie: 'Pie Chart', scatter: 'Scatter Plot', area: 'Area Chart', histogram: 'Histogram', box: 'Box Plot', violin: 'Violin Plot', treemap: 'Treemap', funnel: 'Funnel Chart' }[type] || type;
  },

  async render(container, renderData) {
    container.innerHTML = '';
    const el = document.createElement('div');
    el.style.width = '100%';
    el.style.minHeight = '380px';
    container.appendChild(el);
    Plotly.newPlot(el, renderData.data, renderData.layout, { responsive: true, displayModeBar: true, locale: 'en-US' });
  },

  async downloadImage(format, container, title) {
    const plotEl = container.querySelector('.js-plotly-plot');
    if (!plotEl) throw new Error('Chart is not rendered yet');
    const dataUrl = await Plotly.toImage(plotEl, { format, width: 1280, height: 720, scale: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(title || 'chart').replace(/[^\w\- ]+/g, '_').trim() || 'chart'}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  generateCode(spec, datasetId) {
    const chartType = spec.chart_type || 'bar';
    const dim = spec.dimension || 'x';
    const met = spec.metric || 'y';
    const agg = spec.aggregation || 'sum';
    const title = spec.title || `${met} by ${dim}`;
    const isRaw = this.rawTypes.includes(chartType);

    if (isRaw) {
      const pyKwargs = chartType === 'histogram'
        ? `    x="${dim}",\n    title="${title}",\n    nbinsx=40`
        : `    x="${dim}",\n    y="${met}",\n    title="${title}"`;
      const python = `import plotly.express as px
import pandas as pd

# Load your data
df = pd.read_csv("your_data.csv")  # or pd.read_excel("your_data.xlsx")

# Create chart (plots raw values, no aggregation)
fig = px.${chartType}(
${pyKwargs}
)

fig.update_layout(template="plotly_white")
fig.show()`;

      const jsTrace = chartType === 'histogram'
        ? `const trace = {
  x: rawData.map(r => r["${dim}"]),
  type: "histogram",
  nbinsx: 40,
  marker: { color: "#3b82f6" }
};`
        : `const trace = {
  x: rawData.map(r => r["${dim}"]),
  y: rawData.map(r => r["${met}"]),
  type: "${chartType}",
  marker: { color: "#3b82f6" }
};`;
      const javascript = `<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"><\/script>
<script>
// Assumes data is an array of objects
const rawData = [
  // { "${dim}": "value1", "${met}": 100 },
  // { "${dim}": "value2", "${met}": 200 },
];

${jsTrace}

const layout = {
  title: "${title}",
  template: "plotly_white"
};

Plotly.newPlot("chart", [trace], layout);
<\/script>
<div id="chart"></div>`;
      return { python, javascript };
    }

    const pyCall = chartType === 'treemap'
      ? `    path=["${dim}"],\n    values="${met}"`
      : chartType === 'funnel'
        ? `    x="${met}",\n    y="${dim}"`
        : `    x="${dim}",\n    y="${met}"`;
    const python = `import plotly.express as px
import pandas as pd

# Load your data
df = pd.read_csv("your_data.csv")  # or pd.read_excel("your_data.xlsx")

# Aggregate data
chart_df = df.groupby("${dim}", as_index=False).agg(
    ${met}=("${met}", "${agg}")
)

# Create chart
fig = px.${chartType}(
${pyCall},
    title="${title}"
)

fig.update_layout(template="plotly_white")
fig.show()`;

    const jsTrace = chartType === 'pie'
      ? `const trace = {
  labels: labels,
  values: values,
  type: "pie"
};`
      : chartType === 'treemap'
        ? `const trace = {
  labels: labels,
  parents: labels.map(() => ""),
  values: values,
  type: "treemap"
};`
        : chartType === 'funnel'
          ? `const trace = {
  x: values,
  y: labels,
  type: "funnel"
};`
          : `const trace = {
  x: labels,
  y: values,
  type: "${chartType}"${chartType === 'area' ? ',\n  fill: "tozeroy"' : ''},
  marker: { color: "#3b82f6" }
};`;
    const javascript = `<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"><\/script>
<script>
// Aggregate data (assumes data is an array of objects)
const rawData = [
  // { "${dim}": "value1", "${met}": 100 },
  // { "${dim}": "value2", "${met}": 200 },
];

const grouped = {};
rawData.forEach(row => {
  const key = row["${dim}"];
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(row["${met}"]);
});

const aggFunc = "${agg}" === "sum" ? (a,b) => a+b
  : "${agg}" === "average" ? (a,b) => a+b
  : "${agg}" === "count" ? (a,b) => a+1
  : "${agg}" === "min" ? (a,b) => Math.min(a,b)
  : (a,b) => Math.max(a,b);

const labels = Object.keys(grouped);
const values = labels.map(k => grouped[k].reduce(aggFunc, 0));

${jsTrace}

const layout = {
  title: "${title}",
  template: "plotly_white"
};

Plotly.newPlot("chart", [trace], layout);
<\/script>
<div id="chart"></div>`;

    return { python, javascript };
  },
};
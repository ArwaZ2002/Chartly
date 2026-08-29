/* ============================================================
   Chartly — Chart component
   Plotly rendering, image export, and code generation.
   ============================================================ */

export const chart = {
  aggTypes: ['bar', 'line', 'area', 'pie', 'scatter', 'treemap', 'funnel'],
  rawTypes: ['histogram', 'box', 'violin'],

  palettes: [
    { name: 'Default', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'] },
    { name: 'Sunset', colors: ['#f97316', '#ea580c', '#f59e0b', '#e11d48', '#fb7185', '#fde68a'] },
    { name: 'Ocean', colors: ['#0ea5e9', '#2563eb', '#06b6d4', '#22d3ee', '#1e40af', '#67e8f9'] },
    { name: 'Forest', colors: ['#16a34a', '#65a30d', '#0d9488', '#4ade80', '#84cc16', '#14b8a6'] },
    { name: 'Royal', colors: ['#4f46e5', '#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9', '#c4b5fd'] },
    { name: 'Rose', colors: ['#e11d48', '#be123c', '#f43f5e', '#fda4af', '#9f1239', '#fb7185'] },
    { name: 'Mono', colors: ['#111827', '#4b5563', '#9ca3af', '#6b7280', '#374151', '#d1d5db'] },
  ],

  fonts: [
    { value: '', label: 'System default' },
    { value: "'Poppins', 'Inter', sans-serif", label: 'Poppins' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: "'Courier New', monospace", label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
  ],

  defaultColors() {
    return this.palettes[0].colors;
  },

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
    const dark = document.documentElement.dataset.theme === 'dark';
    const layout = {
      ...(renderData.layout || {}),
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { ...((renderData.layout && renderData.layout.font) || {}), color: dark ? '#f3e9e1' : '#111827' },
      xaxis: { ...((renderData.layout && renderData.layout.xaxis) || {}), gridcolor: dark ? 'rgba(255, 255, 255, 0.08)' : undefined },
      yaxis: { ...((renderData.layout && renderData.layout.yaxis) || {}), gridcolor: dark ? 'rgba(255, 255, 255, 0.08)' : undefined },
    };
    Plotly.newPlot(el, renderData.data, layout, { responsive: true, displayModeBar: true, locale: 'en-US' });
  },

  async downloadImage(format, container, title, background = 'white') {
    const plotEl = container.querySelector('.js-plotly-plot');
    if (!plotEl) throw new Error('Chart is not rendered yet');

    const origPaper = plotEl._fullLayout?.paper_bgcolor || 'rgba(0,0,0,0)';
    const origPlot = plotEl._fullLayout?.plot_bgcolor || 'rgba(0,0,0,0)';

    if (background === 'white') {
      await Plotly.relayout(plotEl, { paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff' });
    }

    const dataUrl = await Plotly.toImage(plotEl, { format, width: 1280, height: 720, scale: 2 });

    await Plotly.relayout(plotEl, { paper_bgcolor: origPaper, plot_bgcolor: origPlot });

    const ext = format === 'jpeg' ? 'jpg' : format;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(title || 'chart').replace(/[^\w\- ]+/g, '_').trim() || 'chart'}.${ext}`;
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
    const showLabels = !!spec.show_labels;

    if (isRaw) {
      const pyKwargs = chartType === 'histogram'
        ? `    x="${dim}",\n    title="${title}",\n    nbinsx=40`
        : `    x="${dim}",\n    y="${met}",\n    title="${title}"`;
      const pyLabels = showLabels
        ? `\nfig.update_traces(textposition="outside")\nfig.update_layout(uniformtext_minsize=8, uniformtext_mode="hide")`
        : '';
      const python = `import plotly.express as px
import pandas as pd

# Load your data
df = pd.read_csv("your_data.csv")  # or pd.read_excel("your_data.xlsx")

# Create chart (plots raw values, no aggregation)
fig = px.${chartType}(
${pyKwargs}
)${pyLabels}

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
        : chartType === 'bar' && spec.orientation === 'horizontal'
          ? `    x="${met}",\n    y="${dim}",\n    orientation="h"`
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
)${showLabels ? `\n\n# Add data labels\nfig.update_traces(textposition="outside")\nfig.update_layout(uniformtext_minsize=8, uniformtext_mode="hide")` : ''}

fig.update_layout(template="plotly_white")
fig.show()`;

    const jsTrace = chartType === 'pie'
      ? `const trace = {
  labels: labels,
  values: values,
  type: "pie",
  textinfo: "label+percent+value",
  texttemplate: "%{label}<br>%{percent}<br>%{value:,.0f}",
  textposition: "inside"
};`
      : chartType === 'treemap'
        ? `const trace = {
  labels: labels,
  parents: labels.map(() => ""),
  values: values,
  type: "treemap",
  textinfo: "label+value+percent parent"
};`
        : chartType === 'funnel'
          ? `const trace = {
  x: values,
  y: labels,
  type: "funnel",
  text: values.map(v => v.toLocaleString()),
  textinfo: "text+value+percent initial"
};`
          : chartType === 'bar' && spec.orientation === 'horizontal'
            ? `const trace = {
  x: values,
  y: labels,
  type: "bar",
  orientation: "h",
  marker: { color: "#3b82f6" }${showLabels ? ',\n  text: values.map(v => v.toLocaleString()),\n  textposition: "outside"' : ''}
};`
            : `const trace = {
  x: labels,
  y: values,
  type: "${chartType}"${chartType === 'area' ? ',\n  fill: "tozeroy"' : ''},
  marker: { color: "#3b82f6" }${showLabels && ['bar', 'line', 'scatter'].includes(chartType) ? ',\n  text: values.map(v => v.toLocaleString()),\n  textposition: "top center"' : ''}
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
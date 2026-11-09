const regions = ["North America", "Europe & Central Asia", "East Asia & Pacific", "Latin America & Caribbean", "Middle East & North Africa", "South Asia", "Sub-Saharan Africa"];
const colors = d3.scaleOrdinal(regions, ["#e15759", "#59a14f", "#4e79a7", "#f28e2b", "#b07aa1", "#9c755f", "#76b7b2"]);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const money = d3.format("$,.0f");

let data = [];
let year = 2018;
let query = "";
let selectedRegion = null;

function summarize(rows) {
  return regions.map(region => {
    const inRegion = rows.filter(d => d.r === region);
    const people = d3.sum(inRegion, d => d.p);
    return {
      label: region,
      spend: d3.sum(inRegion, d => d.s * d.p),
      people,
      life: d3.sum(inRegion, d => d.l * d.p) / people,
    };
  });
}

function drawPie(svgId, regionData, value) {
  const total = d3.sum(regionData, value);
  const arcs = d3.pie().value(value).sort(null)(regionData);
  const svg = d3.select(svgId);
  svg.selectAll("path").remove();
  arcs.forEach(arc => {
    svg.append("path")
      .attr("d", arcGenerator(arc))
      .attr("fill", colors(arc.data.label))
      .attr("class", selectedRegion === null ? "" : arc.data.label === selectedRegion ? "selected" : "dim")
      .attr("data-region", arc.data.label)
      .on("mouseenter", () => hoverRegion(arc.data.label))
      .on("mouseleave", () => hoverRegion(null))
      .on("click", () => selectRegion(arc.data.label))
      .append("title").text(`${arc.data.label}: ${(100 * value(arc.data) / total).toFixed(1)}%`);
  });
}

function drawLegend(regionData) {
  const spendTotal = d3.sum(regionData, d => d.spend);
  const peopleTotal = d3.sum(regionData, d => d.people);
  const legend = d3.select(".legend");
  legend.selectAll("li").remove();
  regionData.forEach(d => {
    legend.append("li")
      .attr("style", `--color:${colors(d.label)}`)
      .attr("class", d.label === selectedRegion ? "selected" : "")
      .html(`<span class="swatch"></span><span>${d.label}</span><em>${Math.round(100 * d.spend / spendTotal)}% of $ · ${Math.round(100 * d.people / peopleTotal)}% of people · ${d.life.toFixed(1)} yrs</em>`)
      .on("mouseenter", () => hoverRegion(d.label))
      .on("mouseleave", () => hoverRegion(null))
      .on("click", () => selectRegion(d.label));
  });
}

const W = 900, H = 480, M = { t: 16, r: 24, b: 52, l: 60 };
const x = d3.scaleLog().domain([5, 16000]).range([M.l, W - M.r]);
const y = d3.scaleLinear().domain([35, 88]).range([H - M.b, M.t]);
const radius = d3.scaleSqrt().domain([0, 1.4e9]).range([2, 30]);
const labeled = ["United States", "Costa Rica", "Japan"];
const tooltip = d3.select("#tooltip");
const scatter = d3.select("#scatter").append("svg").attr("viewBox", [0, 0, W, H]);
const ticks = [10, 50, 100, 500, 1000, 5000, 10000];

scatter.append("g").attr("class", "grid").attr("transform", `translate(0,${H - M.b})`)
  .call(d3.axisBottom(x).tickValues(ticks).tickSize(-(H - M.t - M.b)).tickFormat(""));
scatter.append("g").attr("class", "grid").attr("transform", `translate(${M.l},0)`)
  .call(d3.axisLeft(y).tickSize(-(W - M.l - M.r)).tickFormat(""));
scatter.append("g").attr("class", "axis").attr("transform", `translate(0,${H - M.b})`)
  .call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("$,")));
scatter.append("g").attr("class", "axis").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y));
scatter.append("text").attr("class", "axis-label").attr("x", (W + M.l) / 2).attr("y", H - 10).attr("text-anchor", "middle")
  .text("Health spending per person (PPP dollars, log scale)");
scatter.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -(H - M.b + M.t) / 2).attr("y", 16).attr("text-anchor", "middle")
  .text("Life expectancy at birth (years)");
const dots = scatter.append("g");
const labels = scatter.append("g");

function drawScatter(rows) {
  const q = query.trim().toLowerCase();
  const sorted = [...rows].sort((a, b) => b.p - a.p);
  dots.selectAll("circle")
    .data(sorted, d => d.c)
    .join(enter => enter.append("circle").attr("cx", d => x(d.s)).attr("cy", d => y(d.l)).attr("r", 0))
    .attr("data-region", d => d.r)
    .attr("fill", d => colors(d.r))
    .classed("dim", d => selectedRegion !== null && d.r !== selectedRegion)
    .classed("match", d => q !== "" && d.c.toLowerCase().includes(q))
    .on("mouseenter", (event, d) => {
      tooltip.attr("hidden", null).html(`<strong>${d.c}</strong>, ${d.y}<br>${d.r}<br>${money(d.s)} per person<br>${d.l.toFixed(1)} years life expectancy<br>${d3.format(",.0f")(d.p)} people`);
    })
    .on("mousemove", event => tooltip.style("left", `${event.clientX + 14}px`).style("top", `${event.clientY + 14}px`))
    .on("mouseleave", () => tooltip.attr("hidden", true))
    .on("click", (event, d) => selectRegion(d.r))
    .transition().duration(400)
    .attr("cx", d => x(d.s))
    .attr("cy", d => y(d.l))
    .attr("r", d => radius(d.p));

  labels.selectAll("text")
    .data(rows.filter(d => labeled.includes(d.c)), d => d.c)
    .join("text")
    .attr("class", "label")
    .attr("text-anchor", d => d.c === "United States" ? "end" : "start")
    .attr("x", d => x(d.s) + (d.c === "United States" ? -radius(d.p) - 4 : radius(d.p) + 4))
    .attr("y", d => y(d.l) + 4)
    .text(d => d.c);
}

function hoverRegion(region) {
  d3.selectAll(".pies path").classed("faded", function () { return region !== null && this.dataset.region !== region; });
  dots.selectAll("circle").style("opacity", function () { return region !== null && this.dataset.region !== region ? 0.12 : null; });
}

function renderCountries(rows) {
  const container = document.querySelector(".countries");
  container.innerHTML = "";
  const title = selectedRegion ?? "All countries";
  document.querySelector("#listTitle").textContent = `${title}, ${year} (${rows.length} ${rows.length === 1 ? "country" : "countries"}, highest spending first)`;
  rows.sort((a, b) => b.s - a.s).forEach(d => {
    const card = document.createElement("article");
    card.className = "country";
    card.innerHTML = `<h3>${d.c}</h3><p>${money(d.s)} per person</p><p>${d.l.toFixed(1)} years life expectancy</p>`;
    container.append(card);
  });
}

function selectRegion(region) {
  selectedRegion = selectedRegion === region ? null : region;
  render();
}

function render() {
  const thisYear = data.filter(d => d.y === year);
  const regionData = summarize(thisYear);
  drawPie("#spendPie", regionData, d => d.spend);
  drawPie("#popPie", regionData, d => d.people);
  drawLegend(regionData);
  drawScatter(thisYear);
  const visible = thisYear.filter(d =>
    (selectedRegion === null || d.r === selectedRegion) &&
    d.c.toLowerCase().includes(query.toLowerCase())
  );
  renderCountries(visible);
}

fetch("health.json")
  .then(response => response.json())
  .then(json => {
    data = json.filter(d => d.p !== null);
    const years = [...new Set(data.map(d => d.y))].sort((a, b) => b - a);
    const select = document.querySelector("#year");
    years.forEach(y => select.append(new Option(y, y)));
    select.addEventListener("change", e => { year = Number(e.target.value); render(); });
    document.querySelector("#search").addEventListener("input", e => { query = e.target.value; render(); });
    render();
  });

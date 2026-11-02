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
      .on("mouseenter", () => d3.selectAll("path").classed("faded", function () { return this.dataset.region !== arc.data.label; }))
      .on("mouseleave", () => d3.selectAll("path").classed("faded", false))
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
      .on("click", () => selectRegion(d.label));
  });
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

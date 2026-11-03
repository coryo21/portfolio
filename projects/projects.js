import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value((d) => d.value).sort(null);

let query = '';
let selectedYear = null;

function searchProjects() {
  return projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
}

function update() {
  let searched = searchProjects();
  let visible = selectedYear === null
    ? searched
    : searched.filter((p) => String(p.year) === selectedYear);

  renderProjects(visible, projectsContainer, 'h2');
  projectsTitle.textContent = `${visible.length} Projects`;
  renderPieChart(searched);
}

function toggleYear(year) {
  selectedYear = selectedYear === year ? null : year;
  update();
}

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(projectsGiven, (v) => v.length, (d) => String(d.year))
    .sort((a, b) => d3.descending(a[0], b[0]));
  let data = rolledData.map(([year, count]) => ({ value: count, label: year }));
  let arcData = sliceGenerator(data);

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  arcData.forEach((d) => {
    svg
      .append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(d.data.label))
      .attr('class', d.data.label === selectedYear ? 'selected' : null)
      .on('click', () => toggleYear(d.data.label));
  });

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();
  data.forEach((d) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(d.label)}`)
      .attr('class', d.label === selectedYear ? 'legend-item selected' : 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => toggleYear(d.label));
  });
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  update();
});

update();

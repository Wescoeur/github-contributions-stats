import * as d3 from 'd3'
import forEach from 'lodash.foreach'
import fs from 'fs-promise'
import jsdom from 'jsdom'
import map from 'lodash.map'
import parseArgs from './parse-args'

// ===================================================================

const CHART_WIDTH = 800
const CHART_HEIGHT = 600

const MARGIN = 60

const X_AXIS_STYLE = {
  'font-size': '12px'
}

const Y_AXIS_STYLE = {
  'font-size': '12px'
}

const LINE_STYLE = {
  'stroke-width': '1.5px',
  fill: 'none',
  stroke: 'blue'
}

// ===================================================================

const helper = () => {
  console.error(`contributions-cli --help, -h
  Display this help message.
contributions-cli --convert --input=<input> --output=<output>
  Make a png chart from a stats file.`)
  process.exit(0)
}

// ===================================================================

function setStyles (style) {
  forEach(style, (value, key) => {
    this.style(key, value)
  })

  return this
}

const computeChart = (stats, output) => {
  const data = map(stats.data, (date, value) => ({ date: new Date(date), value }))

  const width = CHART_WIDTH - MARGIN
  const height = CHART_HEIGHT - MARGIN

  const x = d3.scaleTime()
    .range([ 0, width ])
    .domain(d3.extent(data, d => d.date))
  const y = d3.scaleLinear()
    .range([ height, 0 ])
    .domain(d3.extent(data, d => d.value))

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value))

  return new Promise((resolve, reject) => {
    jsdom.env({
      html: '',
      done: (errors, window) => {
        window.d3 = d3.select(window.document)

        let svg = window.d3.select('body')
          .append('div')
            .attr('class', 'container')
            .append('svg')
              .attr('width', CHART_WIDTH)
              .attr('height', CHART_HEIGHT)

        svg.append('rect')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('fill', 'white')

        svg = svg.append('g')
          .attr('transform', `translate(${MARGIN / 2}, ${MARGIN / 2})`)

        svg.append('g')
          .call(d3.axisBottom(x))
          .attr('transform', `translate(0, ${height})`)
          ::setStyles(X_AXIS_STYLE)

        svg.append('g')
          .call(d3.axisLeft(y))
          ::setStyles(Y_AXIS_STYLE)

        svg.append('path')
          .datum(data)
          .attr('d', line)
          ::setStyles(LINE_STYLE)

        resolve(window.d3.select('.container').html())
      }
    })
  })
}

// ===================================================================

async function _exec () {
  const args = parseArgs(process.argv.slice(2), {
    alias: {
      input: 'i',
      output: 'o'
    },
    helper,
    options: [ 'input', 'output' ]
  })

  if (args.help || !args.input || !args.output) {
    helper()
  }

  const chart = await computeChart(JSON.parse(await fs.readFile(args.input)))
  await fs.writeFile(args.output, chart)
}

export default async function main () {
  return _exec()
}

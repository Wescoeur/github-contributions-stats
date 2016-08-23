import * as d3 from 'd3'
import forEach from 'lodash.foreach'
import fs from 'fs-promise'
import jsdom from 'jsdom'
import map from 'lodash.map'
import minimist from 'minimist'

import * as fetchStats from './fetch-stats'
import { getGithubApiInstance } from './index'

// ===================================================================

const CHART_WIDTH = 800
const CHART_HEIGHT = 600

const MARGIN = 60

// ===================================================================

const helper = () => {
  console.error(`contributions-cli --help, -h
  Display this help message.
contributions-cli --call=<call> --repo=<repo> --user=<username> --token=<token> [--since=<timestamp>] [--output=<output>]
  Fetch the stats.
    --call=<call>
      Use a function in this list to get stats:${map(fetchStats, (_, key) => ` ${key}`)}
    --repo=<repo>
      Source repository.
    --user=<username>
      Github account name of repository.
    --token
      A github token.
    --output
      Output file. Default stdout.
    --since=<timestamp>
      Get stats since a timestamp.
      Timestamp is in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.
contributions-cli --convert --input=<input> --output=<output>
  Make a png chart from a file.
`)
  process.exit(0)
}

// ===================================================================

const STRING_ARGS = [ 'call', 'input', 'output', 'repo', 'since', 'token', 'user' ]

const ALIAS = {
  call: 'c',
  help: 'h',
  input: 'i',
  output: 'o',
  user: 'u'
}

const parseArgs = argsList => {
  const args = minimist(argsList, {
    alias: ALIAS,
    boolean: [ 'convert', 'help' ],
    string: STRING_ARGS,
    unknown: helper
  })

  // Warning: minimist makes one array of values if the same option is used many times.
  // (But only for strings args, not boolean)
  forEach(STRING_ARGS, argName => {
    const array = args[argName]

    if (array instanceof Array) {
      const value = args[argName] = array[array.length - 1]
      const alias = ALIAS[argName]

      if (alias) {
        args[alias] = value
      }
    }
  })

  return args
}

// ===================================================================

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

        const svg = window.d3.select('body')
          .append('div')
            .attr('class', 'container')
            .append('svg')
              .attr('width', CHART_WIDTH)
              .attr('height', CHART_HEIGHT)
              .append('g')
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
  const args = parseArgs(process.argv.slice(2))

  // Help.
  if (args.help) {
    helper()
  }

  // Convert.
  if (args.convert) {
    if (!args.input || !args.output) {
      helper()
    }

    const chart = await computeChart(JSON.parse(await fs.readFile(args.input)))
    await fs.writeFile(args.output, chart)

    return
  }

  // Fetch.
  if (!args.call || !args.user || !args.repo || !args.token) {
    helper()
  }

  const call = fetchStats[args.call]
  if (!call) {
    console.error(`Call ${args.call} does not exist.`)
    return
  }

  // TODO: Test args.output before call.

  const github = getGithubApiInstance(args.user, {
    token: args.token,
    type: 'token',
    username: args.user
  })

  const stats = await call(github, args.user, args.repo, { since: args.since })

  if (args.output) {
    await fs.writeFile(args.output, JSON.stringify(stats))
  } else {
    console.log(stats)
  }
}

async function exec () {
  try {
    await _exec()
  } catch (e) {
    console.error('error', e)
  }
}

exec()

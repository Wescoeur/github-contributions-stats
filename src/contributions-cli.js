import fs from 'fs-promise'
import map from 'lodash.map'

import * as fetchStats from './fetch-stats'
import parseArgs from './parse-args'
import { getGithubApiInstance } from './index'

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
      Timestamp is in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.`)
  process.exit(0)
}

// ===================================================================

async function _exec () {
  const args = parseArgs(process.argv.slice(2), {
    alias: {
      call: 'c',
      help: 'h',
      output: 'o',
      user: 'u'
    },
    helper,
    options: [ 'call', 'output', 'repo', 'since', 'token', 'user' ]
  })

  if (args.help || !args.call || !args.user || !args.repo || !args.token) {
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

export default async function main () {
  return _exec()
}

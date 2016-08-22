import forEach from 'lodash.foreach'
import map from 'lodash.map'
import minimist from 'minimist'

import * as fetchStats from './fetch-stats'
import { getGithubApiInstance } from './index'

// ===================================================================

const helper = () => {
  console.error(`contributions-cli --help, -h
  Display this help message.
contributions-cli --call=<call> --repo=<repo> --user=<username> --token=<token>
  Fetch the stats.
    --call=<call>
      Use a function in this list to get stats:${map(fetchStats, (_, key) => ` ${key}`)}
    --repo=<repo>
      Source repository.
    --user=<username>
      Github account name of repository.
    --token
      Used instead of password. A github token.`)
  process.exit(0)
}

// ===================================================================

const STRING_ARGS = [ 'call', 'export', 'password', 'repo', 'token', 'user' ]

const ALIAS = {
  call: 'c',
  export: 'e',
  help: 'h',
  user: 'u'
}

const parseArgs = argsList => {
  const args = minimist(argsList, {
    string: STRING_ARGS,
    boolean: [ 'help' ],
    default: {
      help: false
    },
    alias: ALIAS,
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

const computeAuthentification = ({ user: username, password, token }) => ({
  type: password ? 'basic' : 'token',
  username,
  password,
  token
})

async function _exec () {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || !args.call || !args.user || !args.repo || !args.token) {
    helper()
    return
  }

  const call = fetchStats[args.call]
  if (!call) {
    console.error(`call ${args.call} does not exist.`)
    return
  }

  const github = getGithubApiInstance(args.user, computeAuthentification(args))
  const stats = await call(github, args.user, args.repo)

  console.log(stats)
}

async function exec () {
  try {
    await _exec()
  } catch (e) {
    console.error('error', e)
  }
}

exec()

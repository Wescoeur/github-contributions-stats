import forEach from 'lodash.foreach'
import minimist from 'minimist'

export default function parseArgs (argsList, { options, alias, helper }) {
  const args = minimist(argsList, {
    alias,
    boolean: [ 'help' ],
    string: options,
    unknown: helper
  })

  // Warning: minimist makes one array of values if the same option is used many times.
  // (But only for strings args, not boolean)
  forEach(options, argName => {
    const array = args[argName]

    if (array instanceof Array) {
      const value = args[argName] = array[array.length - 1]
      const alias = alias[argName]

      if (alias) {
        args[alias] = value
      }
    }
  })

  return args
}

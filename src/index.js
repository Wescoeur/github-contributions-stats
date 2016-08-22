import GithubApi from 'github'
import { promisify } from 'promise-toolbox'

export {
  getCommitsDates,
  getForksDates,
  getIssuesDates,
  getStarsDates
} from './fetch-stats'

export function getGithubApiInstance (userAgent, auth, host = 'api.github.com') {
  const github = new GithubApi({
    headers: {
      'user-agent': userAgent
    },
    host,
    protocol: 'https',
    timeout: 5000
  })

  github.authenticate(auth)

  // Promisify github calls.
  github.getNextPage = github.getNextPage::promisify()

  return github
}

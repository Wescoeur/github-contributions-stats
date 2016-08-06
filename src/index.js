import GithubApi from 'github'
import map from 'lodash.map'
import { promisify } from 'promise-toolbox'

// ===================================================================

const STARGAZERS_HEADERS = {
  // To get the starred_at field.
  Accept: 'application/vnd.github.v3.star+json'
}

// ===================================================================

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

// ===================================================================

export async function getStarsDates (github, user, repo) {
  let result = await github.activity.getStargazersForRepo({
    headers: STARGAZERS_HEADERS,
    repo,
    user
  })

  const stars = map(result, 'starred_at')

  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result, STARGAZERS_HEADERS)
    stars.push.apply(stars, map(result, 'starred_at'))
  }

  return stars
}

export async function getForksDates (github, user, repo) {
  let result = await github.repos.getForks({
    repo,
    user,
    sort: 'oldest'
  })

  const forks = map(result, 'created_at')

  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    forks.push.apply(forks, map(result, 'created_at'))
  }

  return forks
}

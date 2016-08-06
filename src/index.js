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
    sort: 'oldest',
    user
  })

  const forks = map(result, 'created_at')
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    forks.push.apply(forks, map(result, 'created_at'))
  }

  return forks
}

export async function getCommitsDates (github, user, repo) {
  let result = await github.repos.getCommits({
    repo,
    user
  })

  const commits = map(result, ({ commit }) => commit.author.date)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    commits.push.apply(commits, map(result, ({ commit }) => commit.author.date))
  }

  return commits.reverse()
}

export async function getIssuesDates (github, user, repo) {
  let result = await github.issues.getForRepo({
    repo,
    direction: 'asc',
    state: 'all',
    user
  })

  const issues = map(result, ({ created_at, closed_at }) => ({ created_at, closed_at }))
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    issues.push.apply(issues, map(result, ({ created_at, closed_at }) => ({ created_at, closed_at })))
  }

  return issues
}

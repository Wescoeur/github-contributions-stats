import map from 'lodash.map'
import reduce from 'lodash.reduce'

// ===================================================================

const STARGAZERS_HEADERS = {
  // To get the starred_at field.
  Accept: 'application/vnd.github.v3.star+json'
}

const mapStars = stars => map(stars, 'starred_at')

export async function getStarsDates (github, user, repo) {
  let result = await github.activity.getStargazersForRepo({
    headers: STARGAZERS_HEADERS,
    repo,
    user
  })

  const stars = mapStars(result)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result, STARGAZERS_HEADERS)
    stars.push.apply(stars, mapStars(result))
  }

  return stars
}

// -------------------------------------------------------------------

const mapForks = forks => map(forks, 'created_at')

export async function getForksDates (github, user, repo) {
  let result = await github.repos.getForks({
    repo,
    sort: 'oldest',
    user
  })

  const forks = mapForks(result)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    forks.push.apply(forks, mapForks(result))
  }

  return forks
}

// -------------------------------------------------------------------

const mapCommits = commits => map(commits, ({ commit }) => commit.author.date)

export async function getCommitsDates (github, user, repo) {
  let result = await github.repos.getCommits({
    repo,
    user
  })

  const commits = mapCommits(result)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    commits.push.apply(commits, mapCommits(result))
  }

  return commits.reverse()
}

// -------------------------------------------------------------------

const reduceIssues = issues => reduce(issues, (result, { closed_at,  created_at, pull_request }) => {
  if (!pull_request) {
    result.push({ created_at, closed_at })
  }
})

export async function getIssuesDates (github, user, repo) {
  let result = await github.issues.getForRepo({
    direction: 'asc',
    repo,
    state: 'all',
    user
  })

  const issues = reduceIssues(result)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    issues.push.apply(issues, reduceIssues(result))
  }

  return issues
}

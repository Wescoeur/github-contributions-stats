import findIndex from 'lodash.findindex'
import map from 'lodash.map'
import reduce from 'lodash.reduce'
import slice from 'lodash.slice'

// ===================================================================

const getDataSince = (data, since, dateField = undefined) => {
  since = new Date(since).getTime()

  const predicate = (dateField === undefined)
    ? data => new Date(data).getTime() >= since
    : data => new Date(data[dateField]).getTime() >= since

  const index = findIndex(data, predicate)
  return (index !== -1) ? slice(data, index, data.length) : []
}

// ===================================================================

const STARGAZERS_HEADERS = {
  // To get the starred_at field.
  Accept: 'application/vnd.github.v3.star+json'
}

const mapStars = stars => map(stars, 'starred_at')

export async function getStarsDates (github, user, repo, {
  since
} = {}) {
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

  return {
    type: 'starsDates',
    data: since
      ? getDataSince(stars, since)
      : stars
  }
}

// -------------------------------------------------------------------

const mapForks = forks => map(forks, 'created_at')

export async function getForksDates (github, user, repo, {
  since
} = {}) {
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

  return {
    type: 'forksDates',
    data: since
      ? getDataSince(forks, since)
      : forks
  }
}

// -------------------------------------------------------------------

const mapCommits = commits => map(commits, ({ commit }) => commit.author.date)

export async function getCommitsDates (github, user, repo, {
  since
} = {}) {
  let result = await github.repos.getCommits({
    repo,
    since,
    user
  })

  const commits = mapCommits(result)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    commits.push.apply(commits, mapCommits(result))
  }

  return {
    type: 'commitsDates',
    data: commits.reverse()
  }
}

// -------------------------------------------------------------------

const reduceIssues = issues => reduce(issues, (result, { closed_at,  created_at, pull_request }) => {
  if (!pull_request) {
    result.push({ created_at, closed_at })
  }
  return result
}, [])

export async function getIssuesDates (github, user, repo, {
  since
} = {}) {
  let result = await github.issues.getForRepo({
    direction: 'asc',
    repo,
    since, // Warning: Github uses the update_at field, not created_at.
    state: 'all',
    user
  })

  const issues = reduceIssues(result)
  while (github.hasNextPage(result)) {
    result = await github.getNextPage(result)
    issues.push.apply(issues, reduceIssues(result))
  }

  return {
    type: 'issuesDates',
    data: since
      ? getDataSince(issues, since, 'created_at')
      : issues
  }
}

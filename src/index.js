const { context } = require('@actions/github');
const { Octokit } = require('@octokit/rest');

const MAX_PATCH_COUNT = 4000;

async function run() {
  // Create octokit instance (bring context from github token)
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  const { owner, repo } = context.repo;

  // TODO : Create new chat instance

  const { data: compareCommits } = await octokit.repos.compareCommits({
    owner: owner,
    repo: repo,
    base: context.payload.pull_request.base.sha,
    head: context.payload.pull_request.head.sha,
  });

  let { files: changedFiles, commits } = compareCommits

  if (context.payload.action === 'synchronize' && commits.length >= 2) {
    const {
      data: { files },
    } = await octokit.repos.compareCommits({
      owner: owner,
      repo: repo,
      base: commits[commits.length - 2].sha,
      head: commits[commits.length - 1].sha,
    });

    const filesNames = files?.map((file) => file.filename) || [];
    changedFiles = changedFiles?.filter((file) =>
      filesNames.includes(file.filename)
    );
  }

  if (!changedFiles?.length) {
    return 'there is no change';
  }

  console.time('gpt cost');

  for (let i = 0; i < changedFiles.length; i++) {
    const file = changedFiles[i];
    const patch = file.patch || '';

    if(file.status !== 'modified' && file.status !== 'added') {
      continue;
    }

    if (!patch || patch.length > MAX_PATCH_COUNT) {
      continue;
    }

    // TODO : Get response from chat instance

    // await octokit.pulls.createReviewComment({
    //   repo: repo,
    //   owner: owner,
    //   pull_number: context.payload.pull_request.number,
    //   commit_id: commits[commits.length - 1].sha,
    //   path: file.filename,
    //   body: "this is test comment",
    //   position: patch.split('\n').length - 1,
    // });

    console.timeEnd('gpt cost');
    console.info('suceess reviewed', context.payload.pull_request.html_url);

    return 'complete';
  }
}

run();

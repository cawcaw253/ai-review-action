import * as core from '@actions/core';
import openAIScanner from './openai-scanner.js';
const { context } = require('@actions/github');
const { Octokit } = require('@octokit/rest');

const MAX_PATCH_COUNT = 4000;
// TODO : add token counter
// const MAX_TOKENS = 4096 - 704;
const MAX_TOKENS = 2048;
const DEFAULT_LANGUAGE = "english"
const DEFAULT_MODEL = "gpt-3.5-turbo"

async function run() {
  const { owner, repo } = context.repo;
  const language = core.getInput('LANGUAGE') || DEFAULT_LANGUAGE
  const model = core.getInput('MODEL') || DEFAULT_MODEL

  // Create octokit instance (bring context from github token)
  const octokit = new Octokit({
    auth: core.getInput('GITHUB_TOKEN')
  });

  // Create new chat instance
  const openAI = new openAIScanner(core.getInput('OPENAI_API_KEY'))
  // Get changed files
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

  console.log("changed file length is " + changedFiles?.length);

  if (!changedFiles?.length) {
    return 'there is no change';
  }

  console.time('gpt cost');

  // Review code
  for (let i = 0; i < changedFiles.length; i++) {
    console.log(`review (${i + 1}/${changedFiles.length}) start`);

    const file = changedFiles[i];
    const patch = file.patch || '';

    // Print for test
    console.log('file : \n' + file)
    console.log('patch : \n' + String(patch))

    if(file.status !== 'modified' && file.status !== 'added') {
      continue;
    }

    if (!patch || patch.length > MAX_PATCH_COUNT) {
      continue;
    }

    // Get response from chat instance
    const response = await openAI.codeReview(String(patch), language, model)

    await octokit.pulls.createReviewComment({
      repo: repo,
      owner: owner,
      pull_number: context.payload.pull_request.number,
      commit_id: commits[commits.length - 1].sha,
      path: file.filename,
      body: response,
      position: patch.split('\n').length - 1,
    });
  }

  console.timeEnd('gpt cost');

  console.info('suceess reviewed', context.payload.pull_request.html_url);

  return 'complete';
}

run();

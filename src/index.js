const { context } = require('@actions/github');
const { Octokit } = require('@octokit/rest');
const { Configuration, OpenAIApi } = require("openai");

const MAX_PATCH_COUNT = 4000;
// TODO : add token counter
// const MAX_TOKENS = 4096 - 704;
const MAX_TOKENS = 2048;
const DEFAULT_LANGUAGE = "english"
const DEFAULT_MODEL = "gpt-3.5-turbo-0301"

async function initOpenAI(key) {
  // https://platform.openai.com/docs/api-reference/completions/create
  const configuration = new Configuration({
    apiKey: key,
  });
  return new OpenAIApi(configuration);
}

// about model : https://platform.openai.com/docs/models/overview
async function codeReview(openAI, code, language, model) {
  if (!code) {
    return '';
  }

  const message = `Below is the code patch, please do a brief code review, and Answer me in ${language}.
if any bug, risk, improvement suggestion please let me know.
${code}`;

  console.log("start chat");

  try {
    const response = await openAI.createChatCompletion({
      model: model,
      messages: [{ role: 'user', content: String(message) }],
      max_tokens: MAX_TOKENS,
      temperature: 1,
    });

    console.log(`response received! response is ↓\n"${response.data.choices[0].message.content}"`);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error.response.data)

    return error;
  }
}

async function run() {
  const { owner, repo } = context.repo;
  const language = process.env.LANGUAGE || DEFAULT_LANGUAGE
  const model = process.env.MODEL || DEFAULT_MODEL

  // Create octokit instance (bring context from github token)
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  // Create new chat instance
  const openAI = await initOpenAI(process.env.OPENAI_API_KEY);

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
    const response = await codeReview(openAI, String(patch), language, model)

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

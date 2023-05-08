import * as core from '@actions/core';
const { context } = require('@actions/github');
const { Octokit } = require('@octokit/rest');
import OpenAIConnector from './openai-connector.js';

const INPUT_GITHUB_TOKEN = 'GITHUB_TOKEN';
const INPUT_LANGUAGE = 'LANGUAGE';
const INPUT_MODEL = 'MODEL';
const INPUT_OPENAI_API_KEY = 'OPENAI_API_KEY'

const MAX_PATCH_COUNT = 4000;

class Integrator {
  constructor() {
    this.octokit = new Octokit({
      auth: core.getInput(INPUT_GITHUB_TOKEN)
    });
    this.repo = context.repo;
    this.language = core.getInput(INPUT_LANGUAGE);
    this.model = core.getInput(INPUT_MODEL);
    this.openAI = new OpenAIConnector(core.getInput(INPUT_OPENAI_API_KEY));
    this.commits = null;
    this.changedFiles = null;
  }

  async fetchChangedFiles() {
    const { data: compareCommits } = await this.octokit.repos.compareCommits({
      owner: this.repo.owner,
      repo: this.repo.repo,
      base: context.payload.pull_request.base.sha,
      head: context.payload.pull_request.head.sha,
    })

    this.changedFiles = compareCommits.files.changedFiles;
    this.commits = compareCommits.files.commits;

    return this;
  }

  async filterChangedFiles() {
    // On Synchronize Action
    if (context.payload.action === 'synchronize' && this.commits.length >= 2) {
      const {
        data: { files },
      } = await octokit.repos.compareCommits({
        owner: this.repo.owner,
        repo: this.repo.repo,
        base: this.commits[this.commits.length - 2].sha,
        head: this.commits[this.commits.length - 1].sha,
      });
  
      const filesNames = files?.map((file) => file.filename) || [];
      this.changedFiles = this.changedFiles?.filter((file) =>
        filesNames.includes(file.filename)
      );
    }

    return this;
  }

  async reviewAndComment() {
    if (!this.changedFiles?.length) {
      console.log('there is no change');
      return this;
    }

    for (let i = 0; i < this.changedFiles.length; i++) {
      console.log(`review (${i + 1}/${this.changedFiles.length}) start`);
  
      const file = this.changedFiles[i];
      const patch = file.patch || '';
  
      if(file.status !== 'modified' && file.status !== 'added') {
        continue;
      }
  
      if (!patch || patch.length > MAX_PATCH_COUNT) {
        continue;
      }
  
      const response = await this.openAI.codeReview(String(patch), this.language, this.model)
  
      await octokit.pulls.createReviewComment({
        owner: this.repo.owner,
        repo: this.repo.repo,
        pull_number: context.payload.pull_request.number,
        commit_id: this.commits[this.commits.length - 1].sha,
        path: file.filename,
        body: response,
        position: patch.split('\n').length - 1,
      });
    }

    return this;
  }
}

export default Integrator;

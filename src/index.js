const core = require("@actions/core");

async function run() {
  try {
    const OPENAI_API_KEY = core.getInput("OPENAI_API_KEY");
    const [OWNER, REPO] = process.env.GITHUB_REPOSITORY.split("/");

    console.log(OPENAI_API_KEY, OWNER, REPO)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run();

const { Configuration, OpenAIApi } = require("openai");

const DEFAULT_LANGUAGE = "english"
const DEFAULT_MODEL = "gpt-3.5-turbo" // about model : https://platform.openai.com/docs/models/overview
// TODO : add token counter
// const MAX_TOKENS = 4096 - 704;
const DEFAULT_MAX_TOKENS = 2048;

const LOG_LEVEL_INFO = "info"
const LOG_LEVEL_ERROR = "error"

class OpenAIScanner {
  constructor(apiKey) {
    // https://platform.openai.com/docs/api-reference/completions/create
    const configuration = new Configuration({
      apiKey: apiKey,
    });

    this.openAI = new OpenAIApi(configuration);
  }

  buildMessage(patch, language) {
    return `Below is the code patch, please do a brief code review, and Answer me in ${language}.
if any bug, risk, improvement suggestion please let me know.
${patch}`
  }

  logger(message, level = LOG_LEVEL_INFO) {
    switch (level) {
      case LOG_LEVEL_INFO:
        console.log(`[In ${this.constructor.name}] [${level.toUpperCase()}] ${message}`)
        break;
      case LOG_LEVEL_ERROR:
        console.error(`[In ${this.constructor.name}] [${level.toUpperCase()}] ${message}`)
        break;
    }
  }

  async codeReview(patch, language=DEFAULT_LANGUAGE, model=DEFAULT_MODEL) {
    const message = this.buildMessage(patch, language);

    this.logger(`start chat`);
    await this.openAI.createChatCompletion({
      model: model,
      messages: [{ role: 'user', content: String(message) }],
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: 1,
    }).then((response) => {
      this.logger(`response received! response is ↓\n"${response.data.choices[0].message.content}"`);
      return response.data.choices[0].message.content;
    }).catch((error) => {
      this.logger(error, LOG_LEVEL_ERROR)
      throw error;
    })
  }
}

export default OpenAIScanner;

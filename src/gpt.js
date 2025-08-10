const OpenAI = require("openai");

const MODEL_MISTRAL = "mistralai/mistral-small-3.2-24b-instruct:free";
const MAX_MEMORY = 10;

let conversationHistory = [];

function addToMemory(role, content) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > MAX_MEMORY) {
    conversationHistory = conversationHistory.slice(-MAX_MEMORY);
  }
}
function getMemory() {
  return [...conversationHistory]
}

async function callMistralResponse(systemPrompt, userPrompt, model = MODEL_MISTRAL, maxTokens = 10000) {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_TOKEN,
  });

  addToMemory("system", systemPrompt);
  addToMemory("user", userPrompt);

  const completion = await client.chat.completions.create({
    model: model,
    messages: getMemory(),
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  const response = completion.choices[0]?.message?.content || "";

  addToMemory("assistant", response);

  return response;
}

module.exports = {
  callMistralResponse,
  addToMemory,
  getMemory,
};
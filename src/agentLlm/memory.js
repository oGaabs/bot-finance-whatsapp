const MAX_MEMORY = 10;

let conversationHistory = [];
let userVariables = {}; // Simple in-memory key/value store for user variables

function addToMemory(role, content) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > MAX_MEMORY) {
    conversationHistory = conversationHistory.slice(-MAX_MEMORY);
  }
}
function storeVariable(name, value) {
  userVariables[name] = value;
  return { success: true, stored: { name, value } };
}

function listVariables() {
  return { ...userVariables };
}

function getAgentMemory(systemPrompt) {
  const varsSummary = Object.keys(userVariables).length
    ? `\n\nUser stored variables (JSON): ${JSON.stringify(userVariables)}`
    : "";
  return [
    { role: "system", content: systemPrompt + varsSummary },
    ...conversationHistory,
  ];
}

module.exports = {
  addToMemory,
  getAgentMemory,
  storeVariable,
  listVariables,
};
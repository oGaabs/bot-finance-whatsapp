const whatsapp = require('../whatsapp');
const gpt = require('../gpt');

const bot_name = '<BOT>';

async function start(client) {
  client.on('message_create', async message => {
    const messageText = message.body.trim();
    const command = messageText.split(' ')[0].toLowerCase();

    if (!message.fromMe) return;
    if (messageText.startsWith(bot_name)) return; // Ignore messages sent by the bot itself
    if (!messageText.startsWith('!')) return; // Process only commands starting with '!'
    if (command === '!ping') {
      whatsapp.sendMessage(message, `${bot_name} pong`);
    }

    if (command === '!bot') {
      const userPrompt = messageText.replace('!bot', '').trim();

      try {
        const botResponse = await gpt.callMistralResponse(
          "You are a helpful assistant. Respond concisely and clearly and with emojis when appropriate.",
          userPrompt
        )

        whatsapp.sendMessage(message, `${bot_name} ${botResponse}`);
      } catch (err) {
        whatsapp.sendMessage(message, `${bot_name} Sorry, I encountered an error while processing your request.`);

        console.error("Error calling Mistral API:", err);
      }
    }
  });
};

module.exports = {
  start
}
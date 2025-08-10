const whatsapp = require('../whatsapp');

async function start(client) {
  client.on('message_create', message => {
    const messageText = message.body.trim();

    if (!message.fromMe) return;
    if (messageText.startsWith('<BOT>')) return; // Ignore messages sent by the bot itself
    if (messageText === '!ping') {
      whatsapp.sendMessage(message, '<BOT> pong');
    }
  });
};

module.exports = {
  start
}
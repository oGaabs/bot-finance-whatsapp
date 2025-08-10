const whatsapp = require('./whatsapp');
const messageHandler = require('./handlers/messageHandlers');

const client = whatsapp.getClient();
client.initialize();

// Start event handlers
messageHandler.start(client);

client.on("ready", () => {
  console.log("> Connected to WhatsApp!");
})

process.on('SIGINT', async () => {
  console.info('SIGINT recebido — encerrando...');

  process.exit(0);
});
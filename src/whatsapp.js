const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client = null;

async function sendMessage(message, replyText) {
  const chat = await message.getChat();
  const rawNumber = message.from;

  if (chat.isGroup) {
    console.log(`[GRUPO] Mensagem no grupo "${chat.name}"\n "${message.author}": ${message.body}`);

    console.log(`[GRUPO] Enviando resposta para o grupo "${chat.name}": ${replyText}`);
    await chat.sendMessage(replyText);
    return;
  }

  console.log(`[CHAT] Mensagem de "${rawNumber}": ${message.body}`);
  console.log(`[REPLY-${rawNumber}] Enviando resposta para "${rawNumber}": ${replyText}`);

  await client.sendMessage(rawNumber, replyText);
}

function startWhatsApp() {
  console.log(`> Iniciando WhatsApp bot...`);

  // Configura o cliente com autenticação local
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ["--no-sandbox"] },
  });


  client.on("qr", (qr) => qrcode.generate(qr, { small: true }));   // When the client received QR-Code
  client.on("ready", () => {
    console.log("> Connected to WhatsApp!");
  });

  client.on('message_create', message => {
    const messageText = message.body.trim();

    if (!message.fromMe) return;
    if (messageText.startsWith('<BOT>')) return; // Ignore messages sent by the bot itself
    if (messageText === '!ping') {
      sendMessage(message, '<BOT> pong');
    }
  });


  client.initialize();
}

module.exports = {
  startWhatsApp,
  getClient: () => client,
};

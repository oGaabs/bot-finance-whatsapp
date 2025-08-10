const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client = null;

function getClient() {
  if (!client) {
    console.log(`> Criando novo cliente WhatsApp...`);
    client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true, args: ["--no-sandbox"] },
    });

    console.log(`> Cliente WhatsApp criado! Verificando QR Code...`);
    client.on("qr", (qr) => qrcode.generate(qr, { small: true }));   // When the client received QR-Code
  }

  return client;
}
async function sendMessage(message, replyText) {
  const chat = await message.getChat();
  const rawNumber = message.from;

  const formatUser = `${message.rawData.notifyName} (${rawNumber})`;

  if (chat.isGroup) {
    console.log(`[GRUPO] Mensagem no grupo "${chat.name}"\n "${formatUser}": ${message.body}`);

    console.log(`[GRUPO] Enviando resposta para o grupo "${chat.name} para ${formatUser}": ${replyText}`);
    await chat.sendMessage(replyText);
    return;
  }

  console.log(`[CHAT] Mensagem de "${rawNumber}": ${message.body}`);
  console.log(`[REPLY-${formatUser}] Enviando resposta": ${replyText}`);

  await client.sendMessage(rawNumber, replyText);
}

module.exports = {
  getClient,
  sendMessage,
};

import qrcode from 'qrcode-terminal'
import whatsappWebPkg from 'whatsapp-web.js'
import { getLogger } from './utils/logger.js'
const logger = getLogger('whatsapp')

const { Client, LocalAuth } = whatsappWebPkg

let client = null

function getClient() {
  if (!client) {
    logger.info('Criando novo cliente WhatsApp...')
    client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true, args: ["--no-sandbox"] },
    })

    logger.info('Cliente WhatsApp criado! Verificando QR Code...')
    client.on("qr", (qr) => qrcode.generate(qr, { small: true }))   // When the client received QR-Code
  }

  return client
}
async function sendMessage(message, replyText) {
  const chat = await message.getChat()
  const rawNumberTo = message.to

  const formatUser = `${message.rawData.notifyName} (${rawNumberTo})`

  if (chat.isGroup) {
    logger.info({ group: chat.name, from: formatUser, body: message.body }, 'Mensagem de grupo recebida')
    logger.info({ group: chat.name, to: formatUser, reply: replyText }, 'Enviando resposta para grupo')
    await chat.sendMessage(replyText)
    return
  }

  logger.info({ to: rawNumberTo, body: message.body }, 'Mensagem direta recebida')
  logger.info({ to: rawNumberTo, reply: replyText }, 'Enviando resposta direta')

  await client.sendMessage(rawNumberTo, replyText)
}

export { getClient, sendMessage }


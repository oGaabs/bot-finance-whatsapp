import * as messageHandler from './handlers/messageHandlers.js'
import { startReports } from './services/AI_Reports.js'
import { getLogger } from './utils/logger.js'
import * as whatsapp from './whatsapp.js'
const logger = getLogger('server')

const client = whatsapp.getClient()

client.initialize()

// Start event handlers
messageHandler.start(client)

// Start background services
startReports()

client.on('ready', () => {
  logger.info('Connected to WhatsApp')
})

process.on('SIGINT', async () => {
  logger.warn('SIGINT recebido — encerrando...')
  process.exit(0)
})
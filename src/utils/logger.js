import fs from 'fs'
import path from 'path'
import pino from 'pino'

// Root directory for logs (override with LOG_ROOT)
const root = process.env.LOG_ROOT ? path.resolve(process.env.LOG_ROOT) : process.cwd()

// Timestamped folder for this run
const ts = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]
const baseDir = path.resolve(root, `logs_${ts}`)
const threadsDir = path.join(baseDir, 'threads')
const errorsDir = path.join(baseDir, 'error')
const globalFile = path.join(baseDir, 'global.log')

for (const dir of [baseDir, threadsDir, errorsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// Create base pino instance with pretty transport for console (non-production).
const level = process.env.LOG_LEVEL || 'info'
const prettyTransport = process.env.NODE_ENV !== 'production'
  ? pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  })
  : undefined
const base = pino({ level, timestamp: pino.stdTimeFunctions.isoTime }, prettyTransport)

// Utility: append a JSON line to a file
function appendLine(filePath, line) {
  fs.appendFile(filePath, line + '\n', () => { /* ignore errors */ })
}

function parseArgs(args) {
  // Supports: (msg), (msg,obj), (obj), (obj,msg)
  let msg = ''
  let obj = {}
  if (args.length === 1) {
    if (typeof args[0] === 'string') msg = args[0]
    else obj = args[0] || {}
  } else if (args.length >= 2) {
    const a = args[0]
    const b = args[1]
    if (typeof a === 'string' && typeof b === 'object') {
      msg = a; obj = b || {}
    } else if (typeof b === 'string' && typeof a === 'object') {
      msg = b; obj = a || {}
    } else if (typeof a === 'string') {
      msg = a
    } else if (typeof b === 'string') {
      msg = b; obj = a || {}
    }
  }
  return { msg, obj }
}

// Factory for module-specific logger
export function getLogger(moduleName = 'app') {
  const cleanName = path.basename(moduleName).replace(/\.[cm]?js$/, '')
  const threadFile = path.join(threadsDir, `${cleanName}.log`)

  function write(levelName, args) {
    const { msg, obj } = parseArgs(args)
    const record = {
      time: new Date().toISOString(),
      level: levelName,
      module: cleanName,
      ...obj,
      msg
    }
    const line = JSON.stringify(record)
    appendLine(threadFile, line)
    appendLine(globalFile, line) // aggregate
    if (levelName === 'error') {
      appendLine(path.join(errorsDir, `${cleanName}.error.log`), line)
    }
    // Emit via base pino (structured); ensure msg last for pretty printers
    base[levelName] ? base[levelName]({ module: cleanName, ...obj }, msg) : base.info({ module: cleanName, ...obj }, msg)
  }

  return {
    info: (...a) => write('info', a),
    warn: (...a) => write('warn', a),
    error: (...a) => write('error', a),
    debug: (...a) => write('debug', a)
  }
}

// Global logger (default)
const globalLogger = getLogger('global')

// One-time process hooks
if (!global.__BOT_LOGGER_HOOKS__) {
  global.__BOT_LOGGER_HOOKS__ = true
  process.on('unhandledRejection', (reason, promise) => {
    globalLogger.error('UnhandledRejection', { reason: reason && reason.stack || reason, promise: !!promise })
  })
  process.on('uncaughtException', err => {
    globalLogger.error('UncaughtException', { err: err && err.stack || err })
  })
}

export default globalLogger

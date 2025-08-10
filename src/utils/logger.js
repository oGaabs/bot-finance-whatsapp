import fs from 'fs'
import path from 'path'
import pino from 'pino'

// Root directory for logs (override with LOG_ROOT)
const root = process.env.LOG_ROOT ? path.resolve(process.env.LOG_ROOT) : process.cwd()

// Internal mutable state to allow daily rotation
const state = {
  date: '',          // YYYY-MM-DD
  ts: '',            // full timestamp used in folder name
  baseDir: '',
  threadsDir: '',
  errorsDir: '',
  globalFile: ''
}

function ensureDir(dir) {
  if (!fs.existsSync(dir))
    fs.mkdirSync(dir, { recursive: true })
}


function rotateIfNeeded() {
  const currentDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  if (currentDate === state.date)
    return
  state.date = currentDate
  state.ts = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]
  state.baseDir = path.resolve(root, `logs_${state.ts}`)
  state.threadsDir = path.join(state.baseDir, 'threads')
  state.errorsDir = path.join(state.baseDir, 'error')
  state.globalFile = path.join(state.baseDir, 'global.log')
  ensureDir(state.baseDir)
  ensureDir(state.threadsDir)
  ensureDir(state.errorsDir)
}

// Initialize on first load
rotateIfNeeded()

// Create base pino instance with pretty transport for console (non-production). Fallback gracefully if pino-pretty absent.
const level = process.env.LOG_LEVEL || 'info'
let transport = null

if (process.env.NODE_ENV !== 'production') {
  try {
    transport = pino.transport({
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
    })
  } catch {
    // Ignore pretty errors; continue without pretty
  }
}
const base = pino({ level, timestamp: pino.stdTimeFunctions.isoTime }, transport || undefined)

// Utility: append a JSON line to a file
function appendLine(filePath, line) {
  fs.appendFile(filePath, line + '\n', () => { /* ignore errors */ })
}

function parseArgs(args) {
  // Supports: (msg), (msg,obj), (obj), (obj,msg)
  let msg = ''
  let obj = {}

  if (args.length === 1) {
    if (typeof args[0] === 'string')
      msg = args[0]
    else
      obj = args[0] || {}
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

// ================= Stack Trace Helpers ================= //
function parseStack(stack) {
  if (!stack || typeof stack !== 'string')
    return []
  const lines = stack.split('\n').slice(1) // skip error message line
  const frames = []
  const re = /^\s*at\s+(?:(.*?)\s+\()?(.*?):(\d+):(\d+)\)?$/

  for (const l of lines) {
    const m = l.match(re)

    if (!m) 
      continue
    const [, fn, file, line, col] = m

    frames.push({ fn: fn || null, file, line: Number(line), col: Number(col) })
    if (frames.length >= 30) 
      break
  }

  return frames
}

function enrichErrors(obj) {
  if (!obj || typeof obj !== 'object') 
    return obj
  const clone = { ...obj }
  const keys = Object.keys(clone)

  for (const k of keys) {
    const val = clone[k]

    if (val && typeof val === 'object' && (val instanceof Error || (val.stack && typeof val.stack === 'string'))) {
      const baseInfo = {
        name: val.name,
        message: val.message,
        stack: val.stack,
        stackTree: parseStack(val.stack)
      }

      // Preserve enumerable props
      for (const pk of Object.keys(val)) {
        if (!(pk in baseInfo)) 
          baseInfo[pk] = val[pk]
      }
      clone[k] = baseInfo
      // Atalho global se só houver um erro principal
      if (!clone.stackTree) 
        clone.stackTree = baseInfo.stackTree
    }
  }

  return clone
}

// Factory for module-specific logger
export function getLogger(moduleName = 'app') {
  const cleanName = path.basename(moduleName).replace(/\.[cm]?js$/, '')

  function write(levelName, args) {
    rotateIfNeeded() // rotate folder if date changed
    const threadFile = path.join(state.threadsDir, `${cleanName}.log`)
    const { msg, obj } = parseArgs(args)
    const enriched = levelName === 'error' ? enrichErrors(obj) : obj
    const record = {
      time: new Date().toISOString(),
      level: levelName,
      module: cleanName,
      ...enriched,
      msg
    }
    const line = JSON.stringify(record)

    appendLine(threadFile, line)
    appendLine(state.globalFile, line) // aggregate
    if (levelName === 'error') {
      appendLine(path.join(state.errorsDir, `${cleanName}.error.log`), line)
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

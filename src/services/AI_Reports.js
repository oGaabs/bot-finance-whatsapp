import cron from 'node-cron'
import { listVariables } from '../agentLlm/memory.js'
import { getLogger } from '../utils/logger.js'
import { sendRaw } from '../whatsapp.js'

const logger = getLogger('AI_Reports')

// =================== Utilidades de Cálculo =================== //
function businessDaysInMonth(year, month, presencialWeekdays) {
  let count = 0
  const date = new Date(year, month, 1)

  while (date.getMonth() === month) {
    const day = date.getDay()

    if (presencialWeekdays.includes(day))
      count++
    date.setDate(date.getDate() + 1)
  }

  return count
}

function parseWeekdays(list) {
  // Se nada for informado, assume dias úteis padrão (seg-sex)
  if (!list)
    return [1, 2, 3, 4, 5].map(d => (d % 7))
  const mapNames = { 'dom': 0, 'domingo': 0, 'seg': 1, 'segunda': 1, 'ter': 2, 'terça': 2, 'tue': 2, 'qua': 3, 'quarta': 3, 'qui': 4, 'quinta': 4, 'sex': 5, 'sexta': 5, 'sab': 6, 'sábado': 6, 'sabado': 6 }

  return list.split(',').map(s => s.trim().toLowerCase()).map(v => {
    if (v in mapNames)
      return mapNames[v]
    const n = Number(v)

    if (!isNaN(n)) {
      if (n === 7)
        return 0
      if (n >= 1 && n <= 6)
        return n % 7
    }

    return null
  }).filter(v => v !== null)
}

// =================== Funções de Relatório =================== //
export async function runVRMonthlyReport() {
  const vars = listVariables()
  const valorRefeicao = Number(vars.vr_valor_refeicao || process.env.VR_VALOR_REFEICAO || 0)
  const diasPresencialRaw = (vars.dias_presencial || process.env.DIAS_PRESENCIAL || '') + ''
  const presencialWeekdays = parseWeekdays(diasPresencialRaw)

  if (!valorRefeicao || !presencialWeekdays.length) {
    logger.warn('VR report skipped: missing valorRefeicao or presencialWeekdays')


    return
  }
  const now = new Date()
  const y = now.getFullYear(); const m = now.getMonth()
  const working = businessDaysInMonth(y, m, presencialWeekdays)
  const gastoPrevisto = working * valorRefeicao

  const msg = [
    '📅 *Relatório Mensal de VR*',
    ' ',
    `*Mês:* ${(m + 1).toString().padStart(2, '0')}/${y}`,
    `*Dias presenciais (total):* ${working}`,
    `Valor refeição: R$ ${valorRefeicao.toFixed(2)}`,
    ' ',
    `💰 Gasto estimado: R$ ${gastoPrevisto.toFixed(2)}`,
    ' ',
    'Planeje-se bem! 🧮'
  ].join('\n')

  const targetsRaw = (vars.user_vr_target || process.env.VR_USERS || '') + ''
  const targets = targetsRaw.split(',').map(s => s.trim()).filter(Boolean)

  for (const t of targets)
    await sendRaw(t, msg)

  if (!targets.length)
    logger.warn('Nenhum destinatário VR configurado (user_vr_target ou VR_USERS)')
}

// =================== Configuração de Jobs =================== //
const REPORT_JOBS = [
  {
    name: 'vr_monthly_report',
    description: 'Relatório mensal de VR com dias presenciais e gasto estimado',
    cron: '0 8 1 * *', // => 08:00 no dia 1 de cada mês
    run: runVRMonthlyReport,
    enabled: true
  }
]

// =================== Orquestrador =================== //
let scheduled = false
const activeTasks = []

export function startReports() {
  if (scheduled) { return }
  scheduled = true
  for (const job of REPORT_JOBS) {
    try {
      const isEnabled = typeof job.enabled === 'function' ? job.enabled() : job.enabled !== false

      if (!isEnabled) {
        logger.info({ job: job.name }, 'Job desabilitado, ignorando')
        continue
      }
      const task = cron.schedule(job.cron, async () => {
        logger.info({ job: job.name }, 'Executando job de relatório')
        try {
          await job.run()
          logger.info({ job: job.name }, 'Relatório concluído')
        } catch (err) {
          logger.error({ err, job: job.name }, 'Erro ao executar relatório')
        }
      }, { scheduled: true })

      activeTasks.push({ job, task })
      logger.info({ job: job.name, cron: job.cron }, 'Job agendado')
    } catch (err) {
      logger.error({ err, job: job.name }, 'Falha ao agendar job')
    }
  }
}

// Registro dinâmico opcional (para extensões futuras)
export function registerReport(jobConfig) {
  if (scheduled) {
    logger.warn({ name: jobConfig.name }, 'Registrar após start não é suportado atualmente')

    return false
  }
  REPORT_JOBS.push(jobConfig)

  return true
}

// Retorna metadados dos reports
export function listReports() {
  return REPORT_JOBS.map(j => ({ name: j.name, description: j.description, cron: j.cron, enabled: typeof j.enabled === 'function' ? j.enabled() : j.enabled !== false }))
}

// Executa um relatório pelo nome (forçado/manual)
export async function runReportNow(name) {
  const job = REPORT_JOBS.find(j => j.name === name)

  if (!job)
    throw new Error('Report não encontrado')

  if (typeof job.enabled === 'function' ? !job.enabled() : job.enabled === false)
    throw new Error('Report desabilitado')

  await job.run()

  return { name: job.name, executedAt: new Date().toISOString() }
}

export default { startReports, registerReport, listReports, runReportNow }

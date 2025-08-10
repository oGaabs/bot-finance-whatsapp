import OpenAI from 'openai'
import { getLogger } from '../utils/logger.js'
import { addToMemory, getAgentMemory, storeVariable } from './memory.js'
const logger = getLogger('gpt')

const MODEL_MISTRAL = "openai/gpt-5-nano"

// Supported enforced patterns only:
// tool_call:store_variable({"name":"salario","value":1500})
// tool_call:store_variable(name=salario,value=1500)
function parseInlineToolCalls(content) {
  if (!content) return []
  const results = []

  const lines = content.split(/\n|\r/).map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (!line.toLowerCase().startsWith('tool_call:')) continue
    const match = /^tool_call:([a-zA-Z0-9_]+)\((.*)\)$/.exec(line)
    if (!match) continue
    const fnName = match[1]
    const inside = match[2].trim()
    let argsObj = {}
    if (inside.startsWith('{')) {
      try { argsObj = JSON.parse(inside) } catch { argsObj = {} }
    } else if (inside.length) {
      inside.split(',').forEach(pair => {
        const [k, vRaw] = pair.split('=').map(s => s && s.trim())
        if (!k) return
        let v = vRaw
        if (!isNaN(Number(vRaw))) v = Number(vRaw)
        else if ((vRaw || '').startsWith('[') && (vRaw || '').endsWith(']')) {
          try { v = JSON.parse(vRaw) } catch { /* ignore */ }
        }
        argsObj[k] = v
      })
    }
    results.push({ name: fnName, args: argsObj, raw: line })
  }
  return results
}

// Processes inline tool calls and records variable updates.
// Returns true if at least one tool call was processed.
function processInlineToolCalls(assistantContent, messages) {
  const calls = parseInlineToolCalls(assistantContent)
  if (!calls.length) return false

  const summaries = []
  for (const c of calls) {
    if (c.name === 'store_variable') {
      const { name, value } = c.args || {}
      if (name !== undefined && value !== undefined) {
        storeVariable(name, value)
        summaries.push(`OK ${name}`)
      } else {
        summaries.push(`ERRO argumentos inválidos em ${c.raw}`)
      }
    } else {
      summaries.push(`IGNORADO ferramenta desconhecida ${c.name}`)
    }
  }

  // Registrar a linha original do modelo na memória como se fosse "assistant" técnica
  addToMemory('assistant', assistantContent)

  // Adicionar um resumo técnico como system para próxima rodada
  messages.push({ role: 'system', content: `RESULTADO_TOOL_CALLS: ${summaries.join('; ')}` })
  return true
}

async function callMistralResponse(_user, systemPrompt, userPrompt, model = MODEL_MISTRAL, maxTokens = 4000) {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_TOKEN,
  })

  const enforcedInstructions = `\nINSTRUÇÕES PARA CHAMADA DE FERRAMENTA:\nPara armazenar uma variável devolva APENAS linhas no formato:\n  tool_call:store_variable({"name":"<nome>","value":<valor>})\nSem texto antes/depois nessas linhas. Depois responda normalmente apenas quando terminar as chamadas (nova rodada). Se o usuario so quiser a informação, não precisa chamar a ferramenta novamente.`

  addToMemory("user", userPrompt)
  let messages = getAgentMemory(systemPrompt + enforcedInstructions)

  // Rodada 1: modelo pode emitir tool_call lines
  const first = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
  })

  const firstChoice = first.choices[0]
  const firstContent = firstChoice.message.content || ""

  const hadCalls = processInlineToolCalls(firstContent, messages)

  if (hadCalls) {
    // Rodada 2: pedir resposta final após aplicar variáveis
    messages = getAgentMemory(systemPrompt + enforcedInstructions) // reconstruir para incluir variáveis atualizadas
    messages.push({ role: 'assistant', content: firstContent })
    messages.push({ role: 'user', content: 'Forneça a resposta final considerando as variáveis salvas.' })

    const second = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    })
    const secondContent = second.choices[0].message.content || ""
    addToMemory('assistant', secondContent)
    logger.info('Resposta final após tool calls')
    return secondContent
  }

  // Caso sem tool calls, tratamos a primeira saída como resposta final
  addToMemory('assistant', firstContent)
  logger.info('Resposta sem tool calls')
  return firstContent
}

export { callMistralResponse }


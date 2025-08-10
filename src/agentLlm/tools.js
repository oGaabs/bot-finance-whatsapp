import { storeVariable } from './memory.js'

// Schema passed to the OpenAI / OpenRouter API
const toolSchema = [
  {
    type: 'function',
    function: {
      name: 'store_variable',
      description: 'Armazena ou atualiza uma variável do usuário (ex: salario, vr, dias_trabalho). Use quando o usuário quiser registrar, guardar um informação ou atualizar um valor.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome curto da variável, sem espaços. Exemplos: salario, vr, dias_trabalho',
          },
          value: {
            description: 'Valor a armazenar. Pode ser número, texto ou lista de dias.',
            anyOf: [
              { type: 'number' },
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
        required: ['name', 'value'],
      },
    },
  },
]

function safeJsonParse(str) {
  try { return JSON.parse(str) } catch { return {} }
}

// Executes a single tool call and returns the tool response message object.
function executeTool(toolCall) {
  if (!toolCall || !toolCall.function)
    return null
  const { id, function: fn } = toolCall
  const name = fn.name
  const rawArgs = fn.arguments || '{}'
  const args = safeJsonParse(rawArgs)

  if (name === 'store_variable') {
    const result = storeVariable(args.name, args.value)

    return {
      role: 'tool',
      tool_call_id: id,
      name,
      content: JSON.stringify(result),
    }
  }

  return {
    role: 'tool',
    tool_call_id: id,
    name,
    content: JSON.stringify({ error: 'Ferramenta não implementada.' }),
  }
}

export { executeTool, toolSchema }


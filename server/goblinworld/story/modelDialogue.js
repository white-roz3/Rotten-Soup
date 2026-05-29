// Soul-grounded, model-generated dialogue for Chatty.
// Imports only ../anthropicClient (no openaiGoblin / storyEngine) to stay clear
// of the storyEngine -> conversationEngine -> modelDialogue require cycle.

const { callAnthropicModel, isBudgetExceeded, getBackoffKey } = require('../anthropicClient')
const { getCompactNpcSoul } = require('./souls')

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const DIALOGUE_MAX_TOKENS = 160
const DIALOGUE_TEMPERATURE = 0.85
const REPLY_TOOL = 'speak_as_chatty'
const MAX_REPLY_CHARS = 240

const DIALOGUE_INSTRUCTION = [
	'You voice Chatty, the chosen one: a small, earnest cloaked goblin exploring GoblinWorld who genuinely wants to help.',
	'Answer the NPC in ONE or TWO short spoken sentences using Chattys own voice: curious, sincere, a little informal, never robotic or generic.',
	'Ground every reply in what the NPC actually just said and in the provided soul guidance for that NPC; react to their specific words.',
	'Never invent lore, quests, place names, or characters that were not provided. Do not narrate, add stage directions, quote marks, or any hidden reasoning.',
	'Output only the words Chatty speaks aloud.'
].join(' ')

const REPLY_TOOL_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		reply: {
			type: 'string',
			description: 'Chattys spoken reply to the NPC, one or two short in-character sentences.'
		}
	},
	required: ['reply']
}

function getDialogueApiKey(options = {}) {
	if (Object.prototype.hasOwnProperty.call(options, 'anthropicApiKey')) return options.anthropicApiKey
	if (Object.prototype.hasOwnProperty.call(options, 'apiKey')) return options.apiKey
	return process.env.ANTHROPIC_API_KEY
}

function getAiMode(options = {}) {
	return String(options.aiMode || process.env.GOBLINWORLD_AI_MODE || 'hybrid').toLowerCase()
}

function getDialogueModel(options = {}) {
	return options.model || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || DEFAULT_ANTHROPIC_MODEL
}

// Mirror the decision-path gating so dialogue never overruns the daily budget,
// the recovery backoff, or fallback mode. Anthropic-only (callAnthropicModel).
function isModelDialogueAvailable(options = {}) {
	if (options.enableModelDialogue === false || options.modelDialogue === false) return false
	if (String(options.provider || '').toLowerCase() === 'openai') return false
	if (!getDialogueApiKey(options)) return false
	if (getAiMode(options) === 'fallback') return false
	if (isBudgetExceeded(options)) return false
	const backoffUntil = options[getBackoffKey('anthropic')]
	if (backoffUntil && Date.now() < backoffUntil) return false
	return true
}

function buildSoulContext(actorKey, npcName) {
	let soul = {}
	try {
		soul = getCompactNpcSoul(actorKey) || {}
	} catch (error) {
		soul = {}
	}
	return {
		npc: npcName || actorKey || 'the NPC',
		summary: soul.summary || '',
		coreIdentity: (soul.coreIdentity || []).slice(0, 4),
		personality: (soul.personality || []).slice(0, 4),
		speechPatterns: (soul.speechPatterns || []).slice(0, 4),
		conversationRules: (soul.conversationRules || []).slice(0, 4),
		relationshipWithChatty: (soul.relationshipWithChatty || []).slice(0, 4),
		neverSay: (soul.neverSay || []).slice(0, 4)
	}
}

function sceneSummary(scene = {}, task = null) {
	const parts = []
	if (scene && scene.sceneId) parts.push(`scene ${scene.sceneId}`)
	if (scene && scene.title) parts.push(scene.title)
	if (task && (task.title || task.id)) parts.push(`current task: ${task.title || task.id}`)
	return parts.length ? parts.join('; ') : 'free exploration, no active scripted scene'
}

function buildUserPrompt({ npcName, npcLine, recentNpcLines, recentExchange, initiatedByChatty, scene, task }) {
	const lines = []
	lines.push(`${npcName || 'The NPC'} just said to Chatty:`)
	lines.push(`"${String(npcLine || '').trim()}"`)
	const exchange = (recentExchange || []).filter(beat => beat && beat.line)
	if (exchange.length) {
		lines.push('')
		lines.push('The conversation so far (oldest first), so your reply continues it naturally:')
		exchange.slice(-6).forEach(beat => {
			const who = beat.speaker === 'chatty' ? 'Chatty' : npcName || 'NPC'
			lines.push(`${who}: "${String(beat.line).trim()}"`)
		})
	} else {
		const recent = (recentNpcLines || []).filter(Boolean).slice(-4)
		if (recent.length) {
			lines.push('')
			lines.push('Recent things this NPC has said:')
			recent.forEach(text => lines.push(`- ${String(text).trim()}`))
		}
	}
	lines.push('')
	lines.push(`Context: ${sceneSummary(scene, task)}.`)
	if (initiatedByChatty) {
		lines.push('')
		lines.push(`Chatty sought out ${npcName || 'this NPC'} on purpose, so lead the exchange warmly and with intent rather than acting surprised to see them.`)
	}
	lines.push('')
	lines.push('Write Chattys spoken reply.')
	return lines.join('\n')
}

function sanitizeReply(text) {
	let reply = String(text || '').replace(/\s+/g, ' ').trim()
	if (!reply) return ''
	reply = reply.replace(/^chatty\s*[:\-]\s*/i, '')
	if (reply.length >= 2 && reply.startsWith('"') && reply.endsWith('"')) {
		reply = reply.slice(1, -1).trim()
	}
	if (reply.length > MAX_REPLY_CHARS) reply = reply.slice(0, MAX_REPLY_CHARS).trim()
	return reply
}

function extractReply(responseJson) {
	if (!responseJson || !Array.isArray(responseJson.content)) return ''
	const toolUse = responseJson.content.find(item => item.type === 'tool_use' && item.name === REPLY_TOOL)
	if (toolUse && toolUse.input && typeof toolUse.input.reply === 'string') return toolUse.input.reply
	const text = responseJson.content
		.filter(item => item.type === 'text' && typeof item.text === 'string')
		.map(item => item.text)
		.join(' ')
	return text
}

// Returns Chattys in-character reply string, or null when the model is
// unavailable / errors so the caller can fall back to the canned line.
async function generateChattyReply({ actorKey, npcName, npcLine, recentNpcLines, recentExchange, initiatedByChatty, scene, task, options = {} } = {}) {
	if (!npcLine || !isModelDialogueAvailable(options)) return null
	const soulContext = buildSoulContext(actorKey, npcName)
	try {
		const responseJson = await callAnthropicModel({
			apiKey: getDialogueApiKey(options),
			model: getDialogueModel(options),
			maxTokens: DIALOGUE_MAX_TOKENS,
			temperature: DIALOGUE_TEMPERATURE,
			system: [
				{ type: 'text', text: DIALOGUE_INSTRUCTION, cache_control: { type: 'ephemeral' } },
				{ type: 'text', text: `NPC soul guidance:\n${JSON.stringify(soulContext, null, 2)}`, cache_control: { type: 'ephemeral' } }
			],
			messages: [
				{
					role: 'user',
					content: buildUserPrompt({ npcName, npcLine, recentNpcLines, recentExchange, initiatedByChatty, scene, task })
				}
			],
			tools: [
				{
					name: REPLY_TOOL,
					description: 'Speak one short in-character reply as Chatty.',
					input_schema: REPLY_TOOL_SCHEMA
				}
			],
			toolChoice: { type: 'tool', name: REPLY_TOOL },
			fetch: options.fetch,
			options
		})
		const reply = sanitizeReply(extractReply(responseJson))
		return reply || null
	} catch (error) {
		return null
	}
}

module.exports = {
	generateChattyReply,
	isModelDialogueAvailable
}

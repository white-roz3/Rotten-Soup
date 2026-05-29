// Thin Anthropic Messages client + shared model-budget primitives.
// Intentionally imports nothing from ./story or ./openaiGoblin so dialogue and
// decision modules can both reuse callAnthropicModel without a require cycle.

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_RECOVERY_BACKOFF_MS = 120000
const DEFAULT_MAX_TOKENS = 700
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_DAILY_MODEL_REQUEST_CAP = 1200
const DEFAULT_DAILY_INPUT_TOKEN_CAP = 1000000
const DEFAULT_DAILY_OUTPUT_TOKEN_CAP = 150000

function getNumericOption(options, optionName, envName, fallback) {
	const value = Object.prototype.hasOwnProperty.call(options, optionName) ? options[optionName] : process.env[envName]
	const number = Number(value)
	return Number.isFinite(number) && number >= 0 ? number : fallback
}

function getTodayKey() {
	return new Date().toISOString().slice(0, 10)
}

function getBudgetState(options = {}) {
	const dayKey = getTodayKey()
	if (!options.__modelBudget || options.__modelBudget.dayKey !== dayKey) {
		options.__modelBudget = {
			dayKey,
			requestCount: 0,
			inputTokens: 0,
			outputTokens: 0,
			failures: 0
		}
	}
	return options.__modelBudget
}

function recordModelRequest(options = {}) {
	const budget = getBudgetState(options)
	budget.requestCount += 1
}

function recordModelFailure(options = {}) {
	const budget = getBudgetState(options)
	budget.failures += 1
}

function getUsageNumber(usage, ...keys) {
	for (const key of keys) {
		const value = usage && usage[key]
		if (Number.isFinite(value)) return value
	}
	return 0
}

function recordModelUsage(options = {}, usage = {}) {
	const budget = getBudgetState(options)
	budget.inputTokens += getUsageNumber(usage, 'input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens')
	budget.outputTokens += getUsageNumber(usage, 'output_tokens', 'outputTokens', 'completion_tokens', 'completionTokens')
}

function getBudgetLimits(options = {}) {
	return {
		requestCap: getNumericOption(options, 'dailyModelRequestCap', 'GOBLINWORLD_DAILY_MODEL_REQUEST_CAP', DEFAULT_DAILY_MODEL_REQUEST_CAP),
		inputTokenCap: getNumericOption(options, 'dailyInputTokenCap', 'GOBLINWORLD_DAILY_INPUT_TOKEN_CAP', DEFAULT_DAILY_INPUT_TOKEN_CAP),
		outputTokenCap: getNumericOption(options, 'dailyOutputTokenCap', 'GOBLINWORLD_DAILY_OUTPUT_TOKEN_CAP', DEFAULT_DAILY_OUTPUT_TOKEN_CAP)
	}
}

function isBudgetExceeded(options = {}) {
	const budget = getBudgetState(options)
	const limits = getBudgetLimits(options)
	return budget.requestCount >= limits.requestCap || budget.inputTokens >= limits.inputTokenCap || budget.outputTokens >= limits.outputTokenCap
}

function getBackoffKey(provider) {
	return `${provider}BackoffUntil`
}

function getRecoveryBackoffMs(options = {}) {
	return options.recoveryBackoffMs || Number(process.env.GOBLINWORLD_RECOVERY_BACKOFF_MS) || DEFAULT_RECOVERY_BACKOFF_MS
}

// Single Anthropic call sharing the daily budget caps + 429/529 recovery backoff.
// system may be a plain string or an array of content blocks (use the latter to
// attach cache_control on the stable prefix). Returns the parsed response JSON.
async function callAnthropicModel({ apiKey, model, system, messages, tools, toolChoice, maxTokens, temperature, fetch: httpFetch, options = {} }) {
	const doFetch = httpFetch || fetch
	const body = {
		model,
		max_tokens: Number.isFinite(maxTokens) ? maxTokens : DEFAULT_MAX_TOKENS,
		temperature: Number.isFinite(temperature) ? temperature : DEFAULT_TEMPERATURE,
		messages: messages || []
	}
	if (system) body.system = system
	if (tools) body.tools = tools
	if (toolChoice) body.tool_choice = toolChoice

	recordModelRequest(options)
	const response = await doFetch(ANTHROPIC_MESSAGES_URL, {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': ANTHROPIC_VERSION,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	})

	if (!response.ok) {
		const text = await response.text()
		recordModelFailure(options)
		if (response.status === 429 || response.status === 529) {
			options[getBackoffKey('anthropic')] = Date.now() + getRecoveryBackoffMs(options)
		}
		throw new Error(`Anthropic request failed (${response.status}): ${text.slice(0, 400)}`)
	}

	const responseJson = await response.json()
	recordModelUsage(options, responseJson.usage)
	return responseJson
}

module.exports = {
	DEFAULT_RECOVERY_BACKOFF_MS,
	getNumericOption,
	getTodayKey,
	getBudgetState,
	getUsageNumber,
	recordModelRequest,
	recordModelFailure,
	recordModelUsage,
	getBudgetLimits,
	isBudgetExceeded,
	getBackoffKey,
	getRecoveryBackoffMs,
	callAnthropicModel
}

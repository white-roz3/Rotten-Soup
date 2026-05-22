const fs = require('fs')
const path = require('path')

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true })
}

const DEFAULT_MAX_EVENT_LOG_LINES = 20000
const DEFAULT_MAX_EVENT_LOG_BYTES = 10 * 1024 * 1024

function toPositiveInteger(value, fallback) {
	const number = Number(value)
	if (!Number.isFinite(number) || number <= 0) return fallback
	return Math.floor(number)
}

function getEventLogLimits(options = {}) {
	return {
		maxLines: toPositiveInteger(
			options.maxEventLogLines || process.env.GOBLINWORLD_MAX_EVENT_LOG_LINES,
			DEFAULT_MAX_EVENT_LOG_LINES
		),
		maxBytes: toPositiveInteger(
			options.maxEventLogBytes || process.env.GOBLINWORLD_MAX_EVENT_LOG_BYTES,
			DEFAULT_MAX_EVENT_LOG_BYTES
		)
	}
}

function compactEventLines(lines, limits) {
	const nonEmptyLines = lines.filter(Boolean)
	let kept = nonEmptyLines
	if (limits.maxLines && kept.length > limits.maxLines) {
		kept = kept.slice(kept.length - limits.maxLines)
	}
	if (limits.maxBytes) {
		let totalBytes = 0
		const byteLimited = []
		for (let index = kept.length - 1; index >= 0; index -= 1) {
			const line = kept[index]
			const lineBytes = Buffer.byteLength(`${line}\n`, 'utf8')
			if (byteLimited.length > 0 && totalBytes + lineBytes > limits.maxBytes) break
			if (lineBytes > limits.maxBytes && byteLimited.length === 0) break
			byteLimited.unshift(line)
			totalBytes += lineBytes
		}
		kept = byteLimited
	}
	return kept
}

function createWorldPersistence(dir, options = {}) {
	const root = dir || path.join(process.cwd(), '.goblinworld')
	const snapshotPath = path.join(root, 'snapshot.json')
	const eventsPath = path.join(root, 'events.jsonl')
	const eventLogLimits = getEventLogLimits(options)
	const hasExplicitLineLimit = Boolean(options.maxEventLogLines || process.env.GOBLINWORLD_MAX_EVENT_LOG_LINES)
	let appendCountSinceLineCheck = 0

	function compactEventsIfNeeded() {
		if (!fs.existsSync(eventsPath)) return
		const stats = fs.statSync(eventsPath)
		appendCountSinceLineCheck += 1
		const shouldCheckLines = hasExplicitLineLimit || appendCountSinceLineCheck >= 100
		if (stats.size <= eventLogLimits.maxBytes && !shouldCheckLines) return
		if (stats.size <= eventLogLimits.maxBytes && shouldCheckLines) {
			const lineCount = fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/).filter(Boolean).length
			appendCountSinceLineCheck = 0
			if (lineCount <= eventLogLimits.maxLines) return
		}
		const lines = fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/)
		const kept = compactEventLines(lines, eventLogLimits)
		fs.writeFileSync(eventsPath, kept.length ? `${kept.join('\n')}\n` : '')
		appendCountSinceLineCheck = 0
	}

	return {
		loadSnapshot() {
			if (!fs.existsSync(snapshotPath)) return null
			try {
				return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
			} catch (error) {
				const corruptPath = `${snapshotPath}.corrupt-${Date.now()}`
				fs.copyFileSync(snapshotPath, corruptPath)
				fs.unlinkSync(snapshotPath)
				return null
			}
		},
		saveSnapshot(snapshot) {
			ensureDir(root)
			fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2))
		},
		appendEvent(event) {
			ensureDir(root)
			const payload = typeof event.toJSON === 'function' ? event.toJSON() : event
			fs.appendFileSync(eventsPath, `${JSON.stringify(payload)}\n`)
			compactEventsIfNeeded()
		},
		clear() {
			if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath)
			if (fs.existsSync(eventsPath)) fs.unlinkSync(eventsPath)
		},
		paths: {
			root,
			snapshotPath,
			eventsPath
		}
	}
}

module.exports = {
	createWorldPersistence
}

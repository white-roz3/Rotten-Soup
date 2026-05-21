const fs = require('fs')
const path = require('path')

const NPC_SOUL_KEYS = [
	'mayor',
	'bartender',
	'dwarf',
	'marketTrader',
	'hoodedVillager',
	'forestWanderer',
	'lanternKeeper',
	'stoneGuard',
	'hiddenGoblinOne',
	'hiddenGoblinTwo',
	'hiddenGoblinThree'
]

const SOUL_ROOT = __dirname
let soulCache = null

function soulPathForKey(key) {
	return path.join(SOUL_ROOT, key, 'SOUL.md')
}

function normalizeParagraph(text = '') {
	return String(text || '')
		.replace(/\r/g, '')
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
		.join(' ')
}

function extractSections(markdown = '') {
	const sections = {}
	let current = ''
	let buffer = []
	String(markdown || '').replace(/\r/g, '').split('\n').forEach(line => {
		const heading = line.match(/^##\s+(.+)$/)
		if (heading) {
			if (current) sections[current] = buffer.join('\n').trim()
			current = heading[1].trim()
			buffer = []
			return
		}
		if (current) buffer.push(line)
	})
	if (current) {
		sections[current] = buffer.join('\n').trim()
	}
	return sections
}

function extractBullets(section = '') {
	return String(section || '')
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.startsWith('- '))
		.map(line => line.slice(2).trim())
		.filter(Boolean)
}

function createCompactSoul(sections = {}) {
	return {
		summary: normalizeParagraph(sections['Runtime summary']).slice(0, 360),
		innerContradiction: normalizeParagraph(sections['Inner contradiction']).slice(0, 260),
		coreIdentity: extractBullets(sections['Core identity']).slice(0, 5),
		drivesAndFears: extractBullets(sections['Drives and fears']).slice(0, 8),
		personality: extractBullets(sections.Personality).slice(0, 5),
		conversationRules: extractBullets(sections['Conversation rules']).slice(0, 6),
		relationshipWithChatty: extractBullets(sections['Relationship with Chatty']).slice(0, 5),
		relationshipLadder: extractBullets(sections['Relationship ladder']).slice(0, 7),
		questBehavior: extractBullets(sections['Quest behavior']).slice(0, 5),
		sceneBehavior: extractBullets(sections['Scene behavior']).slice(0, 8),
		routeFailureBehavior: extractBullets(sections['Route failure behavior']).slice(0, 6),
		emotionalTriggers: extractBullets(sections['Emotional triggers']).slice(0, 8),
		speechPatterns: extractBullets(sections['Speech patterns']).slice(0, 6),
		chattyReplyHooks: extractBullets(sections['Chatty reply hooks']).slice(0, 8),
		exampleExchanges: extractBullets(sections['Example exchanges']).slice(0, 6),
		neverSay: extractBullets(sections['Never say']).slice(0, 5)
	}
}

function loadSoul(key) {
	const filePath = soulPathForKey(key)
	const markdown = fs.readFileSync(filePath, 'utf8')
	const sections = extractSections(markdown)
	return {
		key,
		path: filePath,
		markdown,
		sections,
		compact: createCompactSoul(sections)
	}
}

function getAllNpcSouls() {
	if (!soulCache) {
		soulCache = Object.fromEntries(NPC_SOUL_KEYS.map(key => [key, loadSoul(key)]))
	}
	return soulCache
}

function getNpcSoul(key) {
	return getAllNpcSouls()[key] || getAllNpcSouls().hoodedVillager
}

function getCompactNpcSoul(key) {
	return getNpcSoul(key).compact
}

module.exports = {
	NPC_SOUL_KEYS,
	getAllNpcSouls,
	getCompactNpcSoul,
	getNpcSoul
}

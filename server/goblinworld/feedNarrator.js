const CHATTY_NAME = 'Chatty, the chosen one'
const { getChattyFallbackNarration } = require('./story/sceneScripts')

const KNOWN_SPEAKERS = [
	'Chatty',
	'Mayor Leonard',
	'Bartender',
	'Dwarf Bili',
	'Market Trader',
	'Hooded Villager',
	'Forest Wanderer',
	'Lantern Keeper',
	'Stone Guard',
	'Hidden Goblin',
	'Hidden Goblin Pip',
	'Hidden Goblin Muck',
	'Hidden Goblin Nib',
	'Cellar Rat',
	'Bitey Weed',
	'Ledger Mite',
	'Bramble Crawler',
	'Crown Hound',
	'Thorn Scout',
	'Pantry Slime',
	'Armor Scrap',
	'Ledger Warden',
	'Crown Remnant'
]

const ENEMY_SPEAKERS = new Set([
	'Cellar Rat',
	'Bitey Weed',
	'Ledger Mite',
	'Bramble Crawler',
	'Crown Hound',
	'Thorn Scout',
	'Pantry Slime',
	'Armor Scrap',
	'Ledger Warden',
	'Crown Remnant'
])

const PUBLIC_CHARACTER_SPEAKERS = new Set([
	'Chatty',
	'Mayor Leonard',
	'Bartender',
	'Dwarf Bili',
	'Market Trader',
	'Hooded Villager',
	'Forest Wanderer',
	'Lantern Keeper',
	'Stone Guard',
	'Hidden Goblin',
	'Hidden Goblin Pip',
	'Hidden Goblin Muck',
	'Hidden Goblin Nib'
])

const SYSTEM_FEED_SPEAKERS = new Set([
	'Discovery',
	'GoblinWorld',
	'Quest',
	'Narrator',
	'Scene',
	'Story',
	'Battle',
	'System'
])

const HIDDEN_SYSTEM_EVENT_TYPES = new Set([
	'discovery',
	'phase',
	'quest',
	'scene',
	'story',
	'system'
])

const SYSTEM_FEED_SPEAKERS_NORMALIZED = new Set(
	Array.from(SYSTEM_FEED_SPEAKERS).map(speaker => speaker.toLowerCase())
)

function visibleSpeaker(actor, event = {}) {
	if (actor === CHATTY_NAME) return 'Chatty'
	// Feed is strictly character voices only. System/meta speakers never become a narrator voice.
	if (!actor || actor === 'NPC') return ''
	if (actor === 'GoblinWorld') return ''
	return actor
}

function cleanFeedSpeaker(speaker, event = {}) {
	const raw = String(speaker || '').trim()
	if (!raw) return visibleSpeaker(event.actor, event)
	if (SYSTEM_FEED_SPEAKERS_NORMALIZED.has(raw.toLowerCase())) return ''
	if (raw === 'NPC') return ''
	return raw
}

function isAllowedFeedSpeaker(speaker) {
	return PUBLIC_CHARACTER_SPEAKERS.has(String(speaker || '').trim())
}

function stripSpeakerPrefix(message) {
	const match = String(message || '').match(/^([A-Z][A-Za-z ]{2,32}):\s+(.+)$/)
	if (!match) return { speaker: '', text: String(message || '') }
	if (!KNOWN_SPEAKERS.includes(match[1])) return { speaker: '', text: String(message || '') }
	return {
		speaker: match[1],
		text: match[2]
	}
}

function sanitizeText(message, event = {}) {
	let text = String(message || '').trim()
	if (event.type === 'scene') text = text.replace(/^Scene:\s*/i, '')
	if (event.type === 'phase') text = text.replace(/^Phase\s+\d+:\s*/i, '')
	text = text.replace(/\[(?:ACTION|THOUGHT|SYSTEM|VALIDATION)\]\s*/gi, '')
	text = text.replace(/#[0-9]+\s*/g, '')
	text = text.replace(/\bactor-[a-z0-9-]+\b/gi, '')
	text = text.replace(/\bhostile-[a-z0-9-]+\b/gi, '')
	text = text.replace(/\bcontroller\s*=\s*[a-z0-9-]+\b/gi, '')
	text = text.replace(/\b(?:fallback|openai|anthropic|npc-sim)\b/gi, '')
	text = text.replace(/\bnpc\s*\/\s*move\s*/gi, '')
	text = text.replace(/\bNPC\b/g, 'Villager')
	text = text.replace(/\s+to\s+\d+,\d+\.?/gi, '.')
	text = text.replace(/\b\d+,\d+\b/g, '')
	text = text.replace(/\s{2,}/g, ' ').trim()
	text = text.replace(/\s+\./g, '.')
	if (
		event.actor === CHATTY_NAME &&
		(event.action === 'move' || /^The goblin moves\.?$/i.test(text) || /^Quest points\.? Feet obey\.?$/i.test(text))
	) {
		return createChattyFeedNarration(event)
	}
	if (!text || /^Villager wanders\.?$/i.test(text) || /^wanders\.?$/i.test(text)) {
		if (event.actor === CHATTY_NAME) return createChattyFeedNarration(event)
		return ''
	}
	return text
}

function isBlockedFeedText(text) {
	return /next lead|route recovery|objective changed|controller|validation|raw prompt|api key|story clue|story is speaking|piece of the story|current story|story beat|stay put and listen|sky-thought|feet choose anyway|roads after dawn|^day\\s+\\d+\\s*:/i.test(String(text || '')) ||
		/wanders|villager move|npc\s*\/\s*move/i.test(String(text || ''))
}

function createChattyFeedNarration(event = {}) {
	const publicText = `${event.publicRationale || ''} ${event.message || ''}`.toLowerCase()
	const questId = inferQuestId(publicText)
	const routeTargetName = inferRouteTargetName(publicText)
	return getChattyFallbackNarration({
		turn: event.turn || 0,
		story: {
			scene: {
				sceneType: event.action === 'wait' ? 'dialogue' : 'travel',
				questId
			}
		}
	}, event.action || 'move', { routeTargetName, questId })
}

function inferQuestId(text) {
	if (/find a speaking npc|speaking npc|bartender|tavern|first voice/.test(text)) return 'phase-1-find-voice'
	if (/ledger|old paper|cellar|red wax/.test(text)) return 'phase-2-recover-ledger'
	if (/hidden camp|hidden goblin|camp/.test(text)) return 'phase-3-hidden-camps'
	return ''
}

function inferRouteTargetName(text) {
	if (/bartender|tavern/.test(text)) return 'Bartender'
	if (/ledger|old paper|cellar/.test(text)) return 'Goblin Ledger'
	if (/hidden camp|camp/.test(text)) return 'hidden camp'
	return ''
}

function toneForEvent(event = {}) {
	if (event.type === 'combat') return 'combat'
	if (event.type === 'dialogue' || event.type === 'speech') return 'speech'
	if (event.type === 'scene' || event.type === 'phase' || event.type === 'quest' || event.type === 'discovery') return 'story'
	if (event.type === 'thought') return 'thought'
	return 'adventure'
}

function priorityForEvent(event = {}) {
	if (event.type === 'combat' || event.type === 'dialogue' || event.type === 'speech') return 'high'
	if (event.type === 'scene' || event.type === 'phase' || event.type === 'quest' || event.type === 'discovery') return 'high'
	if (event.type === 'thought') return 'normal'
	return 'low'
}

function shouldHideEvent(event = {}) {
	if (event.type === 'validation') return true
	if (event.type === 'combat') return true
	if (HIDDEN_SYSTEM_EVENT_TYPES.has(event.type)) return true
	if (event.controller === 'dialogue-hold') return true
	if (/\[ACTION\]|npc\s*\/\s*move|wanders\s+to|controller\s*=/i.test(`${event.message || ''} ${event.publicRationale || ''}`)) return true
	if (event.actor !== CHATTY_NAME && event.type === 'action' && event.action === 'move') return true
	if (event.actor === CHATTY_NAME && event.type === 'action' && event.action === 'interact' && !(event.target && event.target.targetMapId)) return true
	if (event.controller === 'npc-sim' && event.type === 'action' && event.action === 'move') return true
	if (event.actor === CHATTY_NAME && event.type === 'action' && event.action === 'move' && isRoutineMovement(event)) return true
	return false
}

function isRoutineMovement(event = {}) {
	const controller = String(event.controller || '').toLowerCase()
	const text = `${event.message || ''} ${event.publicRationale || ''}`.toLowerCase()
	const deterministic = ['fallback', 'recovery', 'budget-fallback', 'hybrid'].includes(controller) || controller.endsWith('-recovery')
	const generic = /quest points|feet obey|little square dance|fresh map space|the goblin moves|routes toward/.test(text)
	if (deterministic && event.action === 'move') return true
	if (/quest points|feet obey/.test(text)) return true
	if (!deterministic && !generic) return false
	return deterministic && generic
}

function createFeedEntryForEvent(event = {}) {
	if (event.feed === null) return null
	if (shouldHideEvent(event)) return null
	if (event.feed && typeof event.feed === 'object') {
		if (event.feed.visible === false) return null
		const speaker = cleanFeedSpeaker(event.feed.speaker, event)
		const text = sanitizeText(event.feed.text || event.message, event)
		if (!text || isBlockedFeedText(text)) return null
		if (!isAllowedFeedSpeaker(speaker)) return null
		return {
			visible: true,
			priority: priorityForEvent(event),
			...event.feed,
			speaker,
			text
		}
	}
	const speakerFromMessage = stripSpeakerPrefix(event.message)
	const speaker = cleanFeedSpeaker(speakerFromMessage.speaker || visibleSpeaker(event.actor, event), event)
	const text = sanitizeText(speakerFromMessage.text || event.message, event)
	if (!text || isBlockedFeedText(text)) return null
	if (!isAllowedFeedSpeaker(speaker)) return null
	return {
		speaker,
		text,
		tone: toneForEvent(event),
		priority: priorityForEvent(event),
		visible: true
	}
}

module.exports = {
	createFeedEntryForEvent,
	sanitizeText
}

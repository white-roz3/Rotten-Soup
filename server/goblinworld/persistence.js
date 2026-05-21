const fs = require('fs')
const path = require('path')

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true })
}

function createWorldPersistence(dir) {
	const root = dir || path.join(process.cwd(), '.goblinworld')
	const snapshotPath = path.join(root, 'snapshot.json')
	const eventsPath = path.join(root, 'events.jsonl')

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

const constants = require('./constants')
const characters = require('./characters')
const continuationArc = require('./continuationArc')
const dialogueBanks = require('./dialogueBanks')
const directorPlan = require('./directorPlan')
const encounters = require('./encounters')
const encounterDirector = require('./encounterDirector')
const phases = require('./phases')
const questInteractionDirector = require('./questInteractionDirector')
const sceneScripts = require('./sceneScripts')
const souls = require('./souls')
const storyEngine = require('./storyEngine')
const taskRules = require('./taskRules')
const worldZones = require('./worldZones')

module.exports = {
	...constants,
	...characters,
	...continuationArc,
	...dialogueBanks,
	...directorPlan,
	...encounters,
	...encounterDirector,
	...phases,
	...questInteractionDirector,
	...sceneScripts,
	...souls,
	...taskRules,
	...storyEngine,
	...worldZones
}

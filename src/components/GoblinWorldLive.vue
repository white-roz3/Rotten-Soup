<template>
	<main class="gw">
		<header class="gw-page-head">
			<router-link class="gw-brand" to="/">&lt; goblinworld.exe</router-link>
			<div class="gw-page-head__meta">
				<span class="gw-page-head__k">turn</span>
				<span class="gw-page-head__v">{{ snapshot ? snapshot.turn : 0 }}</span>
				<span class="gw-page-head__sep">::</span>
				<span class="gw-page-head__v">{{ activeModel }}</span>
			</div>
		</header>

		<section class="gw-live-grid">
			<article class="gw-window gw-world">
				<span class="gw-window__title">world.map</span>
				<span class="gw-window__chip">{{ snapshot ? snapshot.map.name.toLowerCase() : 'glade' }}&nbsp;&middot;&nbsp;{{ goalLabel }}</span>
				<div class="gw-window__body gw-world__body">
					<div ref="worldCanvas" class="gw-world__canvas"></div>
					<div v-if="objectiveOverlay" class="gw-objective">
						<span class="gw-objective__k">next lead</span>
						<span class="gw-objective__v">{{ objectiveOverlay }}</span>
					</div>
					<div v-if="debugMode" class="gw-debug">
						<div><span>goal</span>{{ debugPlan.currentIntent || '--' }}</div>
						<div><span>step</span>{{ debugPlan.currentStep || '--' }}</div>
						<div><span>route</span>{{ debugPlan.routeStatus || '--' }}</div>
						<div><span>waypoint</span>{{ debugWaypointLabel }}</div>
						<div><span>action</span>{{ debugPlan.nextAction || '--' }}</div>
					</div>
					<div v-if="!snapshot" class="gw-world__boot">
						<p>&gt; loading world<span class="gw-blink">_</span></p>
						<p v-if="loadError" class="gw-world__error">&gt; api offline: {{ loadError }}</p>
						<button v-if="loadError" class="gw-world__retry" @click="loadSnapshot">retry</button>
					</div>
				</div>
			</article>

			<aside class="gw-mind">
				<nav class="gw-tabs" role="tablist">
					<button :class="['gw-tab', { 'gw-tab--active': activeTab === 'feed' }]" @click="activeTab = 'feed'">
						<span class="gw-tab__b">[</span> feed <span class="gw-tab__b">]</span>
					</button>
					<button :class="['gw-tab', { 'gw-tab--active': activeTab === 'world' }]" @click="activeTab = 'world'">
						<span class="gw-tab__b">[</span> world <span class="gw-tab__b">]</span>
					</button>
				</nav>

				<div v-if="activeTab === 'feed'" class="gw-panel-stack">
					<article class="gw-window gw-window--panel gw-feed-panel">
						<span class="gw-window__title">feed.log</span>
						<div ref="terminal" class="gw-window__body gw-term__body gw-term__body--scroll">
							<p v-if="!feedEvents.length" class="gw-term__line gw-term__line--cursor">
								<span class="gw-term__prompt">&gt;</span>
								<span>{{ feedPlaceholderText }}</span>
								<span class="gw-blink">_</span>
							</p>
							<p v-for="event in feedEvents" :key="event.id" :class="['gw-feed-line', 'gw-feed-line--' + event.tone]">
								<span class="gw-term__prompt">&gt;</span>
								<span class="gw-feed-line__speaker">{{ event.speaker }}</span>
								<span class="gw-feed-line__text">{{ event.text }}</span>
							</p>
						</div>
					</article>

					<article class="gw-window gw-window--panel gw-quests-panel">
						<span class="gw-window__title">quests.log</span>
						<div class="gw-window__body gw-questlog gw-term__body--scroll">
							<div v-if="!questTasks.length" class="gw-questlog__empty">
								<span class="gw-term__prompt">&gt;</span>
								<span>no active quests</span>
								<span class="gw-blink">_</span>
							</div>
							<template v-else>
								<section v-if="activeQuest" class="gw-questlog__featured">
									<div class="gw-questlog__eyebrow">{{ questStatusLabel(activeQuest) }}</div>
									<h2>{{ activeQuest.title || activeQuest.label }}</h2>
									<p>{{ activeQuest.hint || activeQuest.detail }}</p>
									<div v-if="activeEncounter" class="gw-combat-readout">
										<span>{{ activeEncounter.enemy }}</span>
										<span>enemy {{ activeEncounter.hp }}/{{ activeEncounter.maxHp }}</span>
										<span>chatty {{ activeEncounter.chattyHp }}/{{ activeEncounter.maxChattyHp }}</span>
									</div>
								</section>
								<ol class="gw-questlog__list">
									<li v-for="(quest, index) in questTasks" :key="quest.id || index" :class="['gw-quest', questClass(quest)]">
										<span class="gw-quest__marker">{{ questMarker(quest) }}</span>
										<div class="gw-quest__copy">
											<div class="gw-quest__topline">
												<span class="gw-quest__status">{{ questStatusLabel(quest) }}</span>
												<span class="gw-quest__type">{{ questTypeLabel(quest) }}</span>
											</div>
											<div class="gw-quest__title">{{ quest.title || quest.label }}</div>
											<div v-if="quest.hint || quest.detail" class="gw-quest__hint">{{ quest.hint || quest.detail }}</div>
										</div>
									</li>
								</ol>
							</template>
						</div>
					</article>
				</div>

				<article v-else class="gw-window gw-window--panel gw-status-panel">
					<span class="gw-window__title">world.log</span>
					<div class="gw-window__body gw-status">
						<div class="gw-status__row">
							<span class="gw-status__k">NAME</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v">{{ goblinNameLabel }}</span>
						</div>
						<div class="gw-status__row">
							<span class="gw-status__k">POSITION</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v">{{ positionLabel }}</span>
						</div>
						<div class="gw-status__row">
							<span class="gw-status__k">HP</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v">{{ snapshot ? snapshot.goblin.hp : '--' }}</span>
						</div>
						<div class="gw-status__row">
							<span class="gw-status__k">PHASE</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v">{{ phaseLabel }}</span>
						</div>
						<div class="gw-status__row gw-status__row--block">
							<span class="gw-status__k">SCENE</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v gw-status__v--wrap">{{ sceneLabel }}</span>
						</div>
						<div class="gw-status__row gw-status__row--block">
							<span class="gw-status__k">LEAD</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v gw-status__v--wrap">{{ objectiveOverlay || '--' }}</span>
						</div>
						<div class="gw-status__row">
							<span class="gw-status__k">MODEL</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v">{{ controllerLabel }}</span>
						</div>
						<div class="gw-status__row gw-status__row--block">
							<span class="gw-status__k">ACTIONS</span>
							<span class="gw-status__c">::</span>
							<span class="gw-status__v gw-status__v--wrap">{{ actionsLabel }}</span>
						</div>
					</div>
				</article>
			</aside>
		</section>
	</main>
</template>

<script>
import * as PIXI from 'pixi.js'

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
PIXI.settings.ROUND_PIXELS = true

const PUBLIC_MODEL_LABEL = 'GPT-5.5'
const TILE_SIZE = 32
const VIEW_WIDTH = 864
const VIEW_HEIGHT = 576
const MOVE_TWEEN_MS = 3150
const CAMERA_TWEEN_MS = 3000
const CAMERA_DELAY_MS = 450
const MOVEMENT_STALE_MS = 7000
const RENDER_FRAME_MS = 16
const WALK_FRAME_MS = 95

export default {
	name: 'GoblinWorldLive',
	data() {
		return {
			activeTab: 'feed',
			loadError: '',
			snapshot: null,
			events: [],
			textures: {},
			characterSprites: {},
			animationTick: 0,
			animationTimer: null,
			animationTimerMode: '',
			lastAnimationFrameAt: 0,
			entityMotions: {},
			cameraMotion: null,
			cameraOrigin: null,
			walkResetTimers: {},
			pixi: {
				app: null,
				world: null,
				tileLayer: null,
				markerLayer: null,
				actorLayer: null,
				entitySprites: {},
				goblin: null
			}
		}
	},
	computed: {
		goalLabel() {
			if (!this.snapshot) return 'loading...'
			return this.snapshot.goblin.goal
		},
		quests() {
			return this.snapshot && Array.isArray(this.snapshot.tasks) ? this.snapshot.tasks : []
		},
		feedEvents() {
			const entries = this.events
				.map(this.createFeedEntry)
				.filter(Boolean)
			const seen = new Set()
			return entries.filter((entry, index) => {
				const normalizedKey = `${entry.speaker}::${entry.text}`.toLowerCase().replace(/\s+/g, ' ')
				if (seen.has(normalizedKey)) return false
				seen.add(normalizedKey)
				const recent = entries.slice(Math.max(0, index - 8), index)
				return !recent.some(previous => previous.speaker === entry.speaker && previous.text.toLowerCase().replace(/\s+/g, ' ') === entry.text.toLowerCase().replace(/\s+/g, ' '))
			})
		},
		feedStatus() {
			return this.snapshot && this.snapshot.feedStatus ? this.snapshot.feedStatus : {}
		},
		feedPlaceholderText() {
			if (!this.snapshot) return 'connecting to live feed'
			if (this.feedStatus.feedStarved) return 'Chatty is moving. Conversation will appear here.'
			return 'listening for Chatty and nearby voices'
		},
		questTasks() {
			return this.quests
		},
		activeQuest() {
			return this.questTasks.find(task => task.status === 'active' || task.status === 'combat') || this.questTasks.find(task => task.status !== 'done' && task.status !== 'failed')
		},
		activeEncounter() {
			return this.snapshot && this.snapshot.story && (this.snapshot.story.activeEncounter || this.snapshot.story.encounter)
				? (this.snapshot.story.activeEncounter || this.snapshot.story.encounter)
				: null
		},
		positionLabel() {
			if (!this.snapshot) return '?,?'
			return `${this.snapshot.goblin.position.x},${this.snapshot.goblin.position.y}`
		},
		actionsLabel() {
			if (!this.snapshot) return 'loading...'
			return this.snapshot.legalActions.join(', ')
		},
		controllerLabel() {
			return PUBLIC_MODEL_LABEL
		},
		activeModel() {
			return PUBLIC_MODEL_LABEL
		},
		goblinNameLabel() {
			return this.snapshot ? this.snapshot.goblin.name : '--'
		},
		phaseLabel() {
			if (!this.snapshot || !this.snapshot.story) return '--'
			return `${this.snapshot.story.phaseId} / ${this.snapshot.story.phaseTitle}`
		},
		sceneLabel() {
			const scene = this.snapshot && this.snapshot.story && this.snapshot.story.scene
			if (!scene) return '--'
			return `${scene.sceneType} / ${scene.title}`
		},
		debugMode() {
			return Boolean(this.$route && this.$route.query && this.$route.query.debug === '1')
		},
		debugPlan() {
			return this.snapshot && this.snapshot.story && this.snapshot.story.directorPlan
				? this.snapshot.story.directorPlan
				: {}
		},
		debugWaypointLabel() {
			const waypoint = this.debugPlan.targetWaypoint
			if (!waypoint) return '--'
			return waypoint.label || waypoint.id || '--'
		},
		objectiveOverlay() {
			const story = this.snapshot && this.snapshot.story
			if (!story) return ''
			const plan = story.directorPlan || {}
			const navigation = story.navigation || {}
			const target = plan.targetName || navigation.targetActorName || navigation.targetZone || ''
			const intent = story.currentObjective || plan.currentIntent || navigation.targetTitle || ''
			if (!target && !intent) return ''
			return target ? `${target}: ${intent}` : intent
		}
	},
	mounted() {
		this.loadSnapshot()
	},
	beforeDestroy() {
		if (this.eventSource) this.eventSource.close()
		this.stopAnimationTimer()
		Object.keys(this.walkResetTimers).forEach(key => clearTimeout(this.walkResetTimers[key]))
		if (this.pixi.app) {
			this.pixi.app.destroy(true)
			this.pixi.app = null
		}
	},
	methods: {
		async loadSnapshot() {
			try {
				this.loadError = ''
				const response = await fetch('/api/live/state')
				if (!response.ok) throw new Error('snapshot unavailable')
				this.snapshot = await response.json()
				this.cameraOrigin = this.getCameraTargetForPosition(this.snapshot.goblin.position)
				this.cameraMotion = null
				this.entityMotions = {}
				this.events = this.snapshot.events || []
				await this.initializePixi()
				this.renderWorld()
				this.connectEvents()
				this.$nextTick(this.scrollTerminalToBottom)
			} catch (err) {
				this.loadError = err.message || 'backend unavailable'
			}
		},
		connectEvents() {
			if (this.eventSource) this.eventSource.close()
			const source = new EventSource('/api/live/events')
			this.eventSource = source
			source.addEventListener('goblinworld', event => {
				const payload = JSON.parse(event.data)
				this.applyEvent(payload)
			})
		},
		async loadTextures() {
			const manifestResponse = await fetch('/images/goblinworld/characters/manifest.json')
			const characterManifest = await manifestResponse.json()
			return new Promise(resolve => {
				const complete = () => {
					const atlas = PIXI.loader.resources.textureAtlas.data
					const sheet = PIXI.loader.resources.spritesheet.texture
					this.textures = {}
					for (let id = 0; id < atlas.tilecount; id++) {
						const x = (id % atlas.columns) * atlas.tilewidth
						const y = Math.floor(id / atlas.columns) * atlas.tileheight
						this.textures[id] = new PIXI.Texture(sheet.baseTexture || sheet, new PIXI.Rectangle(x, y, atlas.tilewidth, atlas.tileheight))
					}
					this.characterSprites = this.buildCharacterTextures(characterManifest)
					resolve()
				}

				const characterKeys = Object.keys(characterManifest.characters || {})
				const hasCharacters = characterKeys.every(spriteKey => PIXI.loader.resources[`character-${spriteKey}`])
				if (PIXI.loader.resources.textureAtlas && PIXI.loader.resources.spritesheet && hasCharacters) {
					complete()
					return
				}
				if (!PIXI.loader.resources.spritesheet) PIXI.loader.add('spritesheet', '/images/compiled_tileset_32x32.png')
				if (!PIXI.loader.resources.textureAtlas) PIXI.loader.add('textureAtlas', '/compiled_dawnlike.json')
				characterKeys.forEach(spriteKey => {
					const resourceKey = `character-${spriteKey}`
					if (!PIXI.loader.resources[resourceKey]) {
						PIXI.loader.add(resourceKey, `/${characterManifest.characters[spriteKey].sheet}`)
					}
				})
				PIXI.loader.load(complete)
			})
		},
		buildCharacterTextures(manifest) {
			const sprites = {}
			Object.keys(manifest.characters || {}).forEach(spriteKey => {
				const config = manifest.characters[spriteKey]
				const resource = PIXI.loader.resources[`character-${spriteKey}`]
				if (!resource || !resource.texture) return
				const baseTexture = resource.texture.baseTexture || resource.texture
				const frameWidth = config.frameWidth || manifest.frameWidth || TILE_SIZE
				const frameHeight = config.frameHeight || manifest.frameHeight || TILE_SIZE
				const directions = config.directions || manifest.directions || ['down', 'left', 'right', 'up']
				const textures = {}
				directions.forEach((direction, row) => {
					textures[direction] = {}
					Object.keys(config.animations || {}).forEach(animationName => {
						textures[direction][animationName] = config.animations[animationName].frames.map(frame => {
							return new PIXI.Texture(baseTexture, new PIXI.Rectangle(frame * frameWidth, row * frameHeight, frameWidth, frameHeight))
						})
					})
				})
				sprites[spriteKey] = { config, textures }
			})
			return sprites
		},
		async initializePixi() {
			await this.loadTextures()
			this.pixi.app = new PIXI.Application({
				width: VIEW_WIDTH,
				height: VIEW_HEIGHT,
				antialias: false,
				transparent: false,
				preserveDrawingBuffer: true,
				powerPreference: 'high-performance',
				backgroundColor: 0x000000
			})
			this.$refs.worldCanvas.innerHTML = ''
			this.stylePixiCanvas(this.pixi.app.view)
			this.$refs.worldCanvas.appendChild(this.pixi.app.view)
			this.pixi.world = new PIXI.Container()
			this.pixi.app.stage.addChild(this.pixi.world)
			this.resetWorldLayers()
			this.startAnimationTimer()
		},
		startAnimationTimer() {
			if (this.animationTimer) return
			const scheduleNextFrame = () => {
				if (typeof window !== 'undefined' && window.requestAnimationFrame) {
					this.animationTimerMode = 'raf'
					this.animationTimer = window.requestAnimationFrame(tick)
				} else {
					this.animationTimerMode = 'timeout'
					this.animationTimer = setTimeout(tick, RENDER_FRAME_MS)
				}
			}
			const tick = () => {
				this.animationTimer = null
				if (!this.snapshot) return
				const actors = (this.snapshot.map && this.snapshot.map.actors) || []
				const hasWalking = this.snapshot.goblin.animation === 'walk' || actors.some(actor => actor.animation === 'walk')
				const hasMotion = this.hasActiveMotion()
				if (hasWalking || hasMotion) {
					const now = this.now()
					if (!this.lastAnimationFrameAt || now - this.lastAnimationFrameAt >= WALK_FRAME_MS) {
						this.animationTick += 1
						this.lastAnimationFrameAt = now
					}
					this.renderWorld()
				}
				if (this.pixi.app) scheduleNextFrame()
			}
			scheduleNextFrame()
		},
		stopAnimationTimer() {
			if (!this.animationTimer) return
			if (this.animationTimerMode === 'raf' && typeof window !== 'undefined' && window.cancelAnimationFrame) {
				window.cancelAnimationFrame(this.animationTimer)
			} else {
				clearTimeout(this.animationTimer)
			}
			this.animationTimer = null
			this.animationTimerMode = ''
		},
		now() {
			return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
		},
		easeMotion(progress) {
			return Math.max(0, Math.min(1, progress))
		},
		lerpPosition(from, to, progress) {
			const eased = this.easeMotion(progress)
			return {
				x: from.x + (to.x - from.x) * eased,
				y: from.y + (to.y - from.y) * eased
			}
		},
		getCameraTargetForPosition(position) {
			if (!this.snapshot || !this.snapshot.map || !position) return { x: 0, y: 0 }
			const map = this.snapshot.map
			const viewCols = Math.ceil(VIEW_WIDTH / TILE_SIZE)
			const viewRows = Math.ceil(VIEW_HEIGHT / TILE_SIZE)
			const maxX = Math.max(0, map.width - viewCols)
			const maxY = Math.max(0, map.height - viewRows)
			return {
				x: Math.max(0, Math.min(maxX, position.x - Math.floor(viewCols / 2))),
				y: Math.max(0, Math.min(maxY, position.y - Math.floor(viewRows / 2)))
			}
		},
		getRenderedCameraOrigin(now = this.now()) {
			if (!this.cameraOrigin) {
				this.cameraOrigin = this.getCameraTargetForPosition(this.snapshot && this.snapshot.goblin.position)
			}
			if (!this.cameraMotion) return this.cameraOrigin
			const elapsed = now - this.cameraMotion.startedAt
			if (elapsed < this.cameraMotion.delay) return this.cameraMotion.from
			const progress = (elapsed - this.cameraMotion.delay) / this.cameraMotion.duration
			if (progress >= 1) {
				this.cameraOrigin = this.cameraMotion.to
				this.cameraMotion = null
				return this.cameraOrigin
			}
			return this.lerpPosition(this.cameraMotion.from, this.cameraMotion.to, progress)
		},
		startCameraMotion(targetPosition) {
			const now = this.now()
			const from = this.getRenderedCameraOrigin(now)
			const to = this.getCameraTargetForPosition(targetPosition)
			if (Math.abs(from.x - to.x) < 0.001 && Math.abs(from.y - to.y) < 0.001) {
				this.cameraOrigin = to
				this.cameraMotion = null
				return
			}
			this.cameraMotion = {
				from,
				to,
				startedAt: now,
				duration: CAMERA_TWEEN_MS,
				delay: CAMERA_DELAY_MS
			}
		},
		startEntityMotion(key, from, to, duration = MOVE_TWEEN_MS) {
			const now = this.now()
			if (!from || !to) return
			const activeMotion = this.entityMotions[key]
			const start = activeMotion
				? this.lerpPosition(activeMotion.from, activeMotion.to, (now - activeMotion.startedAt) / activeMotion.duration)
				: { x: from.x, y: from.y }
			if (Math.abs(start.x - to.x) < 0.001 && Math.abs(start.y - to.y) < 0.001) {
				if (activeMotion) this.$delete(this.entityMotions, key)
				return
			}
			this.$set(this.entityMotions, key, {
				from: start,
				to: { x: to.x, y: to.y },
				startedAt: now,
				duration
			})
		},
		getRenderedEntityPosition(key, entity, now = this.now()) {
			const fallback = entity.position || { x: entity.x, y: entity.y }
			const motion = this.entityMotions[key]
			if (!motion) return fallback
			const progress = (now - motion.startedAt) / motion.duration
			if (progress >= 1) {
				this.$delete(this.entityMotions, key)
				return motion.to
			}
			return this.lerpPosition(motion.from, motion.to, progress)
		},
		hasActiveMotion() {
			return Boolean(this.cameraMotion) || Object.keys(this.entityMotions).length > 0
		},
		isTravelingDelta(delta) {
			return delta && (delta.movementState === 'traveling' || delta.animation === 'walk')
		},
		applyMovementState(key, entity, delta) {
			if (!entity || !delta) return
			if (delta.movementState) this.$set(entity, 'movementState', delta.movementState)
			if (this.isTravelingDelta(delta)) {
				this.$set(entity, 'animation', 'walk')
				this.scheduleMovementStaleReset(key, entity)
				return
			}
			if (this.walkResetTimers[key]) {
				clearTimeout(this.walkResetTimers[key])
				this.$delete(this.walkResetTimers, key)
			}
			if (delta.animation) this.$set(entity, 'animation', delta.animation)
			if (delta.movementState && delta.movementState !== 'traveling' && entity.animation === 'walk') {
				this.$set(entity, 'animation', 'idle')
			}
		},
		resetWorldLayers() {
			if (this.pixi.world) {
				const removed = this.pixi.world.removeChildren()
				removed.forEach(child => {
					if (child && child.destroy) child.destroy({ children: true })
				})
			}
			this.pixi.tileLayer = null
			this.pixi.markerLayer = null
			this.pixi.actorLayer = null
			this.pixi.entitySprites = {}
			this.pixi.goblin = null
		},
		ensureWorldLayers() {
			if (this.pixi.tileLayer || !this.snapshot || !this.pixi.world) return
			const map = this.snapshot.map
			const tileLayer = new PIXI.Container()
			map.tileLayers.forEach(layer => {
				const layerContainer = new PIXI.Container()
				layerContainer.alpha = layer.opacity === undefined ? 1 : layer.opacity
				for (let y = 0; y < map.height; y++) {
					for (let x = 0; x < map.width; x++) {
						const id = layer.data[y * map.width + x]
						if (!id || !this.textures[id]) continue
						const sprite = new PIXI.Sprite(this.textures[id])
						sprite.position.set(x * TILE_SIZE, y * TILE_SIZE)
						layerContainer.addChild(sprite)
					}
				}
				tileLayer.addChild(layerContainer)
			})
			this.pixi.tileLayer = tileLayer
			this.pixi.markerLayer = new PIXI.Container()
			this.pixi.actorLayer = new PIXI.Container()
			this.pixi.world.addChild(this.pixi.tileLayer)
			this.pixi.world.addChild(this.pixi.markerLayer)
			this.pixi.world.addChild(this.pixi.actorLayer)
		},
		setPixelPosition(displayObject, x, y) {
			displayObject.position.set(Math.round(x), Math.round(y))
		},
		renderEntitySprite(key, entity, position) {
			if (!this.pixi.actorLayer) return null
			const texture = this.getEntityTexture(entity)
			if (!texture) return null
			let sprite = this.pixi.entitySprites[key]
			if (!sprite) {
				sprite = new PIXI.Sprite(texture)
				sprite.roundPixels = true
				this.pixi.entitySprites[key] = sprite
				this.pixi.actorLayer.addChild(sprite)
			} else if (sprite.texture !== texture) {
				sprite.texture = texture
			}
			sprite.visible = true
			this.setPixelPosition(sprite, position.x * TILE_SIZE, position.y * TILE_SIZE)
			return sprite
		},
		pruneEntitySprites(seenKeys) {
			Object.keys(this.pixi.entitySprites).forEach(key => {
				if (seenKeys.has(key)) return
				const sprite = this.pixi.entitySprites[key]
				if (sprite && sprite.parent) sprite.parent.removeChild(sprite)
				if (sprite && sprite.destroy) sprite.destroy()
				delete this.pixi.entitySprites[key]
			})
		},
		stylePixiCanvas(canvas) {
			canvas.style.position = 'relative'
			canvas.style.zIndex = '1'
			canvas.style.display = 'block'
			canvas.style.width = '100%'
			canvas.style.maxWidth = `${VIEW_WIDTH}px`
			canvas.style.height = 'auto'
			canvas.style.imageRendering = 'pixelated'
			canvas.style.border = '0'
			canvas.style.backgroundColor = '#000000'
		},
		renderWorld() {
			if (!this.snapshot || !this.pixi.world) return
			this.ensureWorldLayers()
			const now = this.now()
			const map = this.snapshot.map
			const camera = this.getRenderedCameraOrigin(now)
			this.setPixelPosition(this.pixi.world, -camera.x * TILE_SIZE, -camera.y * TILE_SIZE)
			this.renderRouteMarker()

			const seenKeys = new Set()
			;(map.actors || []).forEach(actor => {
				const renderedPosition = this.getRenderedEntityPosition(`actor:${actor.id}`, actor, now)
				const key = `actor:${actor.id}`
				seenKeys.add(key)
				this.renderEntitySprite(key, actor, renderedPosition)
			})

			const position = this.getRenderedEntityPosition('goblin', this.snapshot.goblin, now)
			seenKeys.add('goblin')
			this.pixi.goblin = this.renderEntitySprite('goblin', this.snapshot.goblin, position)
			this.pruneEntitySprites(seenKeys)
			this.pixi.app.renderer.render(this.pixi.app.stage)
		},
		renderRouteMarker() {
			if (!this.pixi.markerLayer) return
			this.pixi.markerLayer.removeChildren().forEach(child => {
				if (child && child.destroy) child.destroy()
			})
			if (!this.debugMode) return
			const navigation = this.snapshot && this.snapshot.story && this.snapshot.story.navigation
			const step = navigation && navigation.nextStep
			if (!step || !Number.isInteger(step.x) || !Number.isInteger(step.y)) return
			const marker = new PIXI.Graphics()
			marker.lineStyle(2, 0xffc56b, 0.95)
			marker.beginFill(0xffc56b, 0.1)
			marker.drawRect(step.x * TILE_SIZE + 3, step.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6)
			marker.endFill()
			this.pixi.markerLayer.addChild(marker)
		},
		getEntityTexture(entity) {
			if (!entity) return null
			const character = this.characterSprites[entity.spriteKey]
			if (!character) return this.textures[entity.spriteId] || null
			const facing = character.textures[entity.facing] ? entity.facing : 'down'
			const directionTextures = character.textures[facing] || character.textures.down
			const animation = directionTextures[entity.animation] ? entity.animation : 'idle'
			const frames = directionTextures[animation] || directionTextures.idle || []
			if (!frames.length) return null
			const frameIndex = animation === 'walk' ? this.animationTick % frames.length : 0
			return frames[frameIndex] || frames[0]
		},
		applyEvent(event) {
			if (this.events.find(existing => existing.id === event.id)) return
			this.events.push(event)
			this.events = this.events.slice(-120)

			let shouldRender = false
			if (this.snapshot && event.worldDelta) {
				if (event.worldDelta.map) {
					this.$set(this.snapshot, 'map', event.worldDelta.map)
					this.cameraOrigin = null
					this.cameraMotion = null
					this.entityMotions = {}
					this.resetWorldLayers()
					shouldRender = true
				}
				if (event.worldDelta.goblin) {
					const delta = event.worldDelta.goblin
					if (delta.position) {
						this.startEntityMotion('goblin', this.snapshot.goblin.position, delta.position)
						this.startCameraMotion(delta.position)
						this.snapshot.goblin.position = delta.position
					}
					if (delta.facing) this.$set(this.snapshot.goblin, 'facing', delta.facing)
					this.applyMovementState('goblin', this.snapshot.goblin, delta)
					shouldRender = true
				}
				if (event.worldDelta.actors && this.snapshot.map && Array.isArray(this.snapshot.map.actors)) {
					Object.keys(event.worldDelta.actors).forEach(actorId => {
						const delta = event.worldDelta.actors[actorId]
						const actorIndex = this.snapshot.map.actors.findIndex(candidate => candidate.id === actorId)
						if (delta.removed) {
							if (actorIndex !== -1) this.snapshot.map.actors.splice(actorIndex, 1)
							this.$delete(this.entityMotions, `actor:${actorId}`)
							shouldRender = true
							return
						}
						let actor = actorIndex === -1 ? null : this.snapshot.map.actors[actorIndex]
						if (!actor && delta.position) {
							actor = {
								id: actorId,
								name: delta.name || 'Hostile',
								entityType: delta.entityType || 'HOSTILE',
								spriteId: Number.isInteger(delta.spriteId) ? delta.spriteId : 0,
								spriteKey: delta.spriteKey || null,
								x: delta.position.x,
								y: delta.position.y,
								facing: delta.facing || 'down',
								animation: delta.animation || 'idle',
								movementState: delta.movementState || 'idle',
								wanders: false
							}
							this.snapshot.map.actors.push(actor)
						}
						if (!actor) return
						if (delta.position) {
							this.startEntityMotion(`actor:${actor.id}`, { x: actor.x, y: actor.y }, delta.position)
							actor.x = delta.position.x
							actor.y = delta.position.y
						}
						if (delta.name) this.$set(actor, 'name', delta.name)
						if (delta.entityType) this.$set(actor, 'entityType', delta.entityType)
						if (Number.isInteger(delta.spriteId)) this.$set(actor, 'spriteId', delta.spriteId)
						if (delta.spriteKey !== undefined) this.$set(actor, 'spriteKey', delta.spriteKey)
						if (delta.facing) this.$set(actor, 'facing', delta.facing)
						this.applyMovementState(`actor:${actor.id}`, actor, delta)
						if (Number.isInteger(delta.lastSpeechTurn)) {
							this.$set(actor, 'lastSpeechTurn', delta.lastSpeechTurn)
						}
						shouldRender = true
					})
				}
				if (event.worldDelta.story && this.snapshot.story) {
					this.$set(this.snapshot, 'story', {
						...this.snapshot.story,
						...event.worldDelta.story
					})
				}
				if (Array.isArray(event.worldDelta.tasks)) {
					this.$set(this.snapshot, 'tasks', event.worldDelta.tasks)
				}
				this.snapshot.turn = Math.max(this.snapshot.turn || 0, event.turn || 0)
			}
			if (shouldRender) {
				this.renderWorld()
			}
			this.$nextTick(() => {
				this.scrollTerminalToBottom()
			})
		},
		scheduleMovementStaleReset(key, entity, delay = MOVEMENT_STALE_MS) {
			if (this.walkResetTimers[key]) clearTimeout(this.walkResetTimers[key])
			this.walkResetTimers[key] = setTimeout(() => {
				if (entity && entity.animation === 'walk' && entity.movementState === 'traveling') {
					this.$set(entity, 'movementState', 'idle')
					this.$set(entity, 'animation', 'idle')
					this.renderWorld()
				}
				this.$delete(this.walkResetTimers, key)
			}, delay)
		},
		eventActorLabel(event) {
			if (!event || !event.actor) return ''
			return event.actor
		},
		createFeedEntry(event) {
			if (this.isSystemFeedEvent(event)) return null
			if (event && event.controller === 'dialogue-hold') return null
			if (event && Object.prototype.hasOwnProperty.call(event, 'feed')) {
				if (!event.feed || event.feed.visible === false) return null
				const text = this.cleanFeedText(event.feed.text || '', event)
				if (!text || this.isBlockedFeedText(text)) return null
				const speaker = this.cleanFeedSpeaker(event.feed.speaker, event)
				if (!this.isAllowedFeedSpeaker(speaker)) return null
				return {
					id: event.id,
					tone: event.feed.tone || 'adventure',
					speaker,
					text
				}
			}
			if (!event || !event.message) return null
			if (event.actor !== this.goblinNameLabel && event.type === 'action' && event.action === 'move') return null
			if (event.type === 'validation') return null
			const speaker = this.feedSpeaker(event)
			const text = this.feedText(event, speaker)
			if (!text || this.isBlockedFeedText(text)) return null
			if (!this.isAllowedFeedSpeaker(speaker)) return null
			return {
				id: event.id,
				tone: this.feedTone(event),
				speaker,
				text
			}
		},
		feedSpeaker(event) {
			const messageSpeaker = this.feedMessageSpeaker(event)
			if (messageSpeaker) return messageSpeaker
			if (event.actor === this.goblinNameLabel) return 'Chatty'
			// The public feed is character voices only.
			if (event.actor === 'GoblinWorld') return ''
			return this.displayActorName(event.actor, event)
		},
		isAllowedFeedSpeaker(speaker) {
			return [
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
			].includes(String(speaker || '').trim())
		},
		cleanFeedSpeaker(speaker, event = {}) {
			const raw = String(speaker || '').trim()
			const systemSpeakers = ['Discovery', 'GoblinWorld', 'Narrator', 'Battle', 'Quest', 'Scene', 'Story', 'System']
			const isSystemSpeaker = systemSpeakers.some(systemSpeaker => systemSpeaker.toLowerCase() === raw.toLowerCase())
			if (!raw) return this.feedSpeaker(event || {})
			if (isSystemSpeaker) return ''
			return raw
		},
		cleanFeedText(text, event = {}) {
			let message = String(text || '').trim()
			if (event.type === 'scene') message = message.replace(/^Scene:\s*/i, '')
			if (event.type === 'phase') message = message.replace(/^Phase\s+\d+:\s*/i, '')
			return message
		},
		isBlockedFeedText(text) {
			const normalized = String(text || '').trim().toLowerCase()
			const oldListenFallback = normalized === ['i stop', 'and listen'].join(' ') || normalized === ['i stop', 'and listen.'].join(' ')
			return oldListenFallback ||
				/next lead|route recovery|objective changed|controller|validation|raw prompt|api key|story clue|story is speaking|piece of the story|current story|story beat|stay put and listen|sky-thought|feet choose anyway|roads after dawn|^day\\s+\\d+\\s*:/i.test(String(text || '')) ||
				/wanders|npc\s*\/\s*move/i.test(String(text || ''))
		},
		isSystemFeedEvent(event) {
			return Boolean(event && ['discovery', 'phase', 'quest', 'scene', 'story', 'system'].includes(String(event.type || '').toLowerCase()))
		},
		feedMessageSpeaker(event) {
			const match = String(event.message || '').match(/^([A-Z][A-Za-z ]{2,32}):\s+/)
			if (!match) return ''
			const knownSpeakers = [
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
			]
			const knownEnemies = [
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
			return knownSpeakers.includes(match[1]) || knownEnemies.includes(match[1]) ? match[1] : ''
		},
		feedText(event, speaker) {
			let message = String(event.message || '').trim()
			if (!message) return ''
			if (speaker && message.toLowerCase().startsWith(`${speaker.toLowerCase()}:`)) {
				message = message.slice(speaker.length + 1).trim()
			}
			if (speaker === 'Scene') {
				message = message.replace(/^Scene:\s*/i, '')
			}
			if (speaker === 'Narrator' || event.type === 'phase') {
				message = message.replace(/^Scene:\s*/i, '').replace(/^Phase\s+\d+:\s*/i, '')
			}
			message = message.replace(/\bNPC\b/g, speaker && speaker !== 'NPC' ? speaker : 'Villager')
			if (speaker && speaker !== 'Villager') {
				message = message.replace(/\bThe villager\b/g, speaker).replace(/\bthe villager\b/g, speaker)
			}
			message = message.replace(/\s+to\s+\d+,\d+\./gi, '.')
			return message
		},
		feedTone(event) {
			if (event.type === 'combat') return 'combat'
			if (event.type === 'dialogue' || event.type === 'speech') return 'speech'
			if (event.type === 'scene' || event.type === 'phase' || event.type === 'quest' || event.type === 'discovery') return 'story'
			if (event.type === 'thought') return 'thought'
			return 'adventure'
		},
		displayActorName(name, event = {}) {
			if (name && name !== 'NPC') return name
			const actor = this.findActorForEvent(event)
			const roleNames = {
				bartender: 'Bartender',
				mayor: 'Mayor Leonard',
				dwarf: 'Dwarf Bili',
				marketTrader: 'Market Trader',
				hoodedVillager: 'Hooded Villager',
				forestWanderer: 'Forest Wanderer',
				lanternKeeper: 'Lantern Keeper',
				stoneGuard: 'Stone Guard',
				hiddenGoblinOne: 'Hidden Goblin Pip',
				hiddenGoblinTwo: 'Hidden Goblin Muck',
				hiddenGoblinThree: 'Hidden Goblin Nib'
			}
			if (actor && roleNames[actor.spriteKey]) return roleNames[actor.spriteKey]
			if (actor && actor.dialog === 'BARTENDER') return 'Bartender'
			if (actor && actor.dialog === 'MAYOR_LEONARD') return 'Mayor Leonard'
			if (actor && actor.dialog === 'DWARF_BILI') return 'Dwarf Bili'
			return 'Villager'
		},
		findActorForEvent(event) {
			if (!this.snapshot || !this.snapshot.map || !Array.isArray(this.snapshot.map.actors)) return null
			const target = event.target || {}
			if (target.id) {
				const byId = this.snapshot.map.actors.find(actor => actor.id === target.id)
				if (byId) return byId
			}
			const position = event.position || target
			if (Number.isInteger(position.x) && Number.isInteger(position.y)) {
				return this.snapshot.map.actors.find(actor => actor.x === position.x && actor.y === position.y) || null
			}
			return null
		},
		scrollTerminalToBottom() {
			if (this.$refs.terminal) this.$refs.terminal.scrollTop = this.$refs.terminal.scrollHeight
		},
		questStatusLabel(task) {
			const status = task && task.status
			if (status === 'combat') return 'Battle objective'
			if (status === 'active') return 'Current quest'
			if (status === 'done') return 'Complete'
			if (status === 'failed') return 'Failed'
			return 'Locked objective'
		},
		questMarker(task) {
			const status = task && task.status
			if (status === 'combat') return '[!]'
			if (status === 'active') return '[>]'
			if (status === 'done') return '[x]'
			if (status === 'failed') return '[ ]'
			return '[-]'
		},
		questTypeLabel(task) {
			const kind = task && task.target && task.target.kind
			const labels = {
				dialogue: 'Talk',
				combat: 'Fight',
				inspect: 'Inspect',
				item: 'Recover',
				place: 'Travel',
				ally: 'Recruit',
				speech: 'Speak',
				goal: 'Decide',
				choice: 'Choice',
				rumor: 'Rumor',
				route: 'Route',
				defense: 'Defend',
				escort: 'Escort',
				discovery: 'Discover',
				self: 'Awaken'
			}
			return labels[kind] || 'Story'
		},
		questClass(task) {
			const status = task && task.status ? task.status : 'locked'
			return `gw-quest--${status}`
		}
	}
}
</script>

<style scoped>
/* ============================================================
   FOUNDATION  —  matches GoblinWorldLanding
   ============================================================ */
.gw {
	position: relative;
	min-height: 100vh;
	background: #000000;
	color: #7eff9a;
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 15px;
	line-height: 1.55;
	padding: 22px clamp(16px, 3vw, 36px) 32px;
	letter-spacing: 0;

	--bg: #000000;
	--bg-pane: rgba(8, 26, 14, 0.55);
	--green: #7eff9a;
	--green-bright: #c4ffc4;
	--green-dim: #3a8a5a;
	--green-mute: #1f4a30;
	--amber: #ffc56b;
	--amber-bright: #ffe199;
	--red: #ff6055;
	--violet: #c89aff;
	--cyan: #6ec8ff;
}

.gw::before {
	content: '';
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: 200;
	background: repeating-linear-gradient(0deg, rgba(126, 255, 154, 0.05) 0 1px, transparent 1px 3px);
	mix-blend-mode: screen;
}

.gw::after {
	content: '';
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: 199;
	background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.55) 100%);
}

/* ============================================================
   BLINK
   ============================================================ */
.gw-blink {
	display: inline-block;
	animation: gw-blink 0.85s steps(1) infinite;
}

@keyframes gw-blink {
	0%, 50% { opacity: 1; }
	50.01%, 100% { opacity: 0; }
}

/* ============================================================
   PAGE HEAD  —  thin shell prompt line
   ============================================================ */
.gw-page-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 6px 4px 14px;
	margin-bottom: 4px;
	border-bottom: 1px dashed var(--green-mute);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 11px;
	letter-spacing: 0;
}

.gw-brand {
	color: var(--amber);
	text-decoration: none;
	font-size: 12px;
	letter-spacing: 0;
	text-shadow: 0 0 8px rgba(255, 197, 107, 0.3);
}

.gw-brand:hover { color: var(--amber-bright); }

.gw-page-head__meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	font-size: 11px;
	color: var(--green);
}

.gw-page-head__dot {
	width: 8px;
	height: 8px;
	background: var(--green);
	box-shadow: 0 0 10px var(--green);
	margin-right: 4px;
}

.gw-page-head__k { color: var(--green-bright); text-transform: uppercase; letter-spacing: 0; }
.gw-page-head__v { color: var(--amber); }
.gw-page-head__sep { color: var(--green-dim); }
.gw-page-head__status { color: var(--green-bright); letter-spacing: 0; text-transform: lowercase; }

/* ============================================================
   ASCII WINDOW  —  shared with landing
   ============================================================ */
.gw-window {
	position: relative;
	background: var(--bg-pane);
	border: 1px solid var(--green);
	color: var(--green);
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	margin: 18px 0 0;
	box-shadow:
		inset 0 0 24px rgba(126, 255, 154, 0.06),
		0 0 14px rgba(126, 255, 154, 0.12);
}

.gw-window::before,
.gw-window::after {
	content: '+';
	position: absolute;
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	color: var(--green);
	line-height: 1;
	font-size: 16px;
	width: 8px;
	height: 8px;
	text-align: center;
	background: var(--bg);
	z-index: 2;
}

.gw-window::before { top: -7px; left: -5px; }
.gw-window::after  { bottom: -7px; right: -5px; }

.gw-window__title {
	position: absolute;
	top: -14px;
	left: 18px;
	z-index: 2;
	background: var(--bg);
	padding: 0 10px;
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 9px;
	letter-spacing: 0;
	color: var(--amber);
	text-transform: lowercase;
}

.gw-window__title::before { content: '─[ '; color: var(--green); }
.gw-window__title::after  { content: ' ]─'; color: var(--green); }

.gw-window__chip {
	position: absolute;
	top: -14px;
	right: 18px;
	z-index: 2;
	background: var(--bg);
	padding: 0 10px;
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 12px;
	letter-spacing: 0;
	color: var(--green-bright);
	text-transform: lowercase;
	max-width: 60%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.gw-window__chip::before { content: '─[ '; color: var(--green); }
.gw-window__chip::after  { content: ' ]─'; color: var(--green); }

.gw-window__body { padding: 22px 22px 20px; }

/* ============================================================
   LIVE GRID
   ============================================================ */
.gw-live-grid {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 400px;
	gap: 24px;
	margin-top: 22px;
	align-items: start;
}

.gw-world__body {
	padding: 0;
	position: relative;
}

.gw-world__canvas {
	min-height: 576px;
	background: #000000;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	box-shadow: inset 0 0 18px rgba(126, 255, 154, 0.08);
}

.gw-world__canvas canvas {
	width: 100%;
	max-width: 864px;
	height: auto;
	image-rendering: pixelated;
}

.gw-objective {
	position: absolute;
	left: 14px;
	bottom: 14px;
	z-index: 4;
	display: grid;
	gap: 4px;
	max-width: min(520px, calc(100% - 28px));
	padding: 10px 12px;
	border: 1px solid var(--amber);
	background: rgba(0, 0, 0, 0.78);
	box-shadow: inset 0 0 14px rgba(255, 197, 107, 0.08);
	pointer-events: none;
}

.gw-objective__k {
	color: var(--amber);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 8px;
	line-height: 1.3;
	text-transform: uppercase;
}

.gw-objective__v {
	color: var(--green-bright);
	font-size: 13px;
	line-height: 1.35;
	overflow-wrap: anywhere;
}

.gw-debug {
	position: absolute;
	right: 14px;
	bottom: 14px;
	z-index: 5;
	display: grid;
	gap: 4px;
	width: min(320px, calc(100% - 28px));
	padding: 10px 12px;
	border: 1px dashed var(--cyan);
	background: rgba(0, 0, 0, 0.82);
	color: var(--green-bright);
	font-size: 11px;
	line-height: 1.35;
	pointer-events: none;
}

.gw-debug div {
	display: grid;
	grid-template-columns: 70px 1fr;
	gap: 8px;
	min-width: 0;
	overflow-wrap: anywhere;
}

.gw-debug span {
	color: var(--cyan);
	text-transform: uppercase;
}

.gw-world__boot {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 6px;
	padding-left: 36px;
	color: var(--green);
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 15px;
	text-shadow: 0 0 10px rgba(126, 255, 154, 0.4);
	pointer-events: none;
}

.gw-world__boot p { margin: 0; }

.gw-world__error {
	color: var(--red);
}

.gw-world__retry {
	width: max-content;
	margin-top: 10px;
	padding: 6px 12px;
	background: var(--bg);
	border: 1px solid var(--amber);
	color: var(--amber);
	font: inherit;
	cursor: pointer;
}

/* ============================================================
   MIND  —  tabs + log
   ============================================================ */
.gw-mind {
	display: flex;
	flex-direction: column;
	gap: 14px;
	height: 650px;
	min-height: 0;
}

.gw-tabs {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 8px;
	padding: 0 0 0 0;
}

.gw-tab {
	background: var(--bg);
	border: 1px solid var(--green-dim);
	color: var(--green-dim);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 10px;
	letter-spacing: 0;
	text-transform: lowercase;
	padding: 8px 4px;
	cursor: pointer;
	transition: color 100ms steps(2), border-color 100ms steps(2), background 100ms steps(2);
}

.gw-tab__b { color: var(--green-mute); }

.gw-tab:hover {
	color: var(--green);
	border-color: var(--green);
}
.gw-tab:hover .gw-tab__b { color: var(--green); }

.gw-tab--active {
	color: var(--amber);
	border-color: var(--amber);
	box-shadow: inset 0 0 14px rgba(255, 197, 107, 0.18), 0 0 12px rgba(255, 197, 107, 0.15);
}
.gw-tab--active .gw-tab__b { color: var(--amber); }

.gw-window--panel {
	margin-top: 14px;
	min-height: 0;
}

.gw-panel-stack {
	display: grid;
	flex: 1;
	grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
	gap: 14px;
	height: 100%;
	min-height: 0;
}

.gw-panel-stack .gw-window--panel {
	display: flex;
	flex-direction: column;
	margin-top: 0;
	min-height: 0;
	overflow: hidden;
}

.gw-feed-panel {
	height: auto;
	min-height: 0;
}

.gw-quests-panel {
	height: auto;
	min-height: 0;
}

.gw-status-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
}

/* ============================================================
   TERMINAL LOG (live + quests)
   ============================================================ */
.gw-term__body {
	padding: 18px 18px 18px;
	min-height: 0;
	flex: 1;
}

.gw-term__body--scroll {
	max-height: none;
	overflow-y: auto;
}

.gw-term__body--scroll::-webkit-scrollbar { width: 8px; }
.gw-term__body--scroll::-webkit-scrollbar-track { background: var(--bg); }
.gw-term__body--scroll::-webkit-scrollbar-thumb { background: var(--green-mute); }

.gw-term__line {
	margin: 0 0 14px;
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 14px;
	line-height: 1.55;
	color: var(--green);
	display: grid;
	grid-template-columns: 16px auto auto 1fr;
	gap: 8px 10px;
	align-items: baseline;
	text-shadow: 0 0 6px rgba(126, 255, 154, 0.3);
}

.gw-term__line--cursor {
	grid-template-columns: 16px auto;
	color: var(--amber);
}

.gw-term__prompt { color: var(--amber); font-size: 14px; }

.gw-term__key {
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 9px;
	letter-spacing: 0;
	color: var(--green-bright);
	min-width: 80px;
}

.gw-term__key--thought    { color: var(--cyan); }
.gw-term__key--action     { color: var(--amber); }
.gw-term__key--speech     { color: var(--green-bright); }
.gw-term__key--dialogue   { color: var(--green-bright); }
.gw-term__key--discovery  { color: var(--cyan); }
.gw-term__key--combat     { color: var(--red); }
.gw-term__key--phase      { color: var(--amber-bright); }
.gw-term__key--validation { color: var(--red); }
.gw-term__key--battle     { color: var(--red); }
.gw-term__key--quest      { color: var(--amber); }

.gw-term__meta {
	color: var(--green-dim);
	font-size: 12px;
	letter-spacing: 0;
	text-transform: lowercase;
}

.gw-term__msg {
	grid-column: 4;
	color: var(--green);
}

.gw-term__why {
	grid-column: 4;
	color: var(--green-dim);
	font-size: 13px;
	margin-top: 2px;
}

.gw-feed-line {
	margin: 0 0 18px;
	display: grid;
	grid-template-columns: 16px minmax(88px, auto) 1fr;
	gap: 8px 12px;
	align-items: baseline;
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 14px;
	line-height: 1.55;
	color: var(--green-bright);
	text-shadow: 0 0 6px rgba(126, 255, 154, 0.3);
}

.gw-feed-line__speaker {
	color: var(--amber);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 8px;
	line-height: 1.8;
	text-transform: uppercase;
}

.gw-feed-line__text {
	min-width: 0;
	color: var(--green-bright);
	overflow-wrap: anywhere;
}

.gw-feed-line--speech .gw-feed-line__speaker { color: var(--green-bright); }
.gw-feed-line--thought .gw-feed-line__speaker { color: var(--cyan); }
.gw-feed-line--combat .gw-feed-line__speaker,
.gw-feed-line--combat .gw-feed-line__text { color: var(--red); }
.gw-feed-line--story .gw-feed-line__speaker { color: var(--amber-bright); }

/* ============================================================
   QUEST LOG
   ============================================================ */
.gw-questlog {
	padding: 18px;
	min-height: 0;
	flex: 1;
}

.gw-questlog__empty {
	display: flex;
	gap: 10px;
	color: var(--amber);
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 14px;
}

.gw-questlog__featured {
	padding: 14px 14px 16px;
	margin-bottom: 12px;
	border: 1px solid var(--amber);
	background: rgba(255, 197, 107, 0.08);
	box-shadow: inset 0 0 18px rgba(255, 197, 107, 0.08);
}

.gw-questlog__eyebrow {
	margin-bottom: 8px;
	color: var(--amber);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 9px;
	letter-spacing: 0;
	text-transform: uppercase;
}

.gw-questlog__featured h2 {
	margin: 0 0 8px;
	color: var(--amber-bright);
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 15px;
	line-height: 1.25;
	letter-spacing: 0;
}

.gw-questlog__featured p {
	margin: 0;
	color: var(--green-bright);
	font-size: 13px;
	line-height: 1.45;
}

.gw-combat-readout {
	display: grid;
	gap: 5px;
	margin-top: 12px;
	padding-top: 10px;
	border-top: 1px dashed rgba(255, 96, 85, 0.45);
	color: var(--red);
	font-size: 12px;
	line-height: 1.35;
	text-transform: lowercase;
}

.gw-questlog__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 10px;
}

.gw-quest {
	display: grid;
	grid-template-columns: 36px 1fr;
	gap: 10px;
	padding: 9px 0;
	border-bottom: 1px dashed var(--green-mute);
	color: var(--green);
}

.gw-quest:last-child { border-bottom: 0; }

.gw-quest__marker {
	color: var(--green-dim);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 9px;
	padding-top: 4px;
}

.gw-quest__copy {
	min-width: 0;
}

.gw-quest__topline {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 4px;
	font-size: 11px;
	text-transform: uppercase;
}

.gw-quest__status {
	color: var(--amber);
	font-family: 'Press Start 2P', 'IBM Plex Mono', monospace;
	font-size: 8px;
}

.gw-quest__type {
	color: var(--green-dim);
	font-size: 11px;
}

.gw-quest__title {
	color: var(--green-bright);
	font-size: 14px;
	line-height: 1.35;
}

.gw-quest__hint {
	margin-top: 4px;
	color: var(--green-dim);
	font-size: 12px;
	line-height: 1.4;
}

.gw-quest--active .gw-quest__marker,
.gw-quest--active .gw-quest__title,
.gw-quest--combat .gw-quest__marker,
.gw-quest--combat .gw-quest__title {
	color: var(--amber-bright);
}

.gw-quest--combat .gw-quest__status {
	color: var(--red);
}

.gw-quest--done {
	opacity: 0.72;
}

.gw-quest--done .gw-quest__marker,
.gw-quest--done .gw-quest__status {
	color: var(--green-bright);
}

.gw-quest--failed .gw-quest__marker,
.gw-quest--failed .gw-quest__status {
	color: var(--red);
}

.gw-quest--locked {
	opacity: 0.5;
}

/* ============================================================
   STATUS (world tab)
   ============================================================ */
.gw-status {
	font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
	font-size: 14px;
	line-height: 1.4;
	padding: 22px 22px 20px;
}

.gw-status__row {
	display: grid;
	grid-template-columns: 110px 22px 1fr;
	align-items: baseline;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px dashed var(--green-mute);
}

.gw-status__row:last-child { border-bottom: 0; }

.gw-status__row--block {
	grid-template-columns: 110px 22px 1fr;
	align-items: start;
}

.gw-status__k {
	color: var(--green-bright);
	letter-spacing: 0;
	text-transform: uppercase;
}

.gw-status__c { color: var(--green-dim); }

.gw-status__v {
	color: var(--amber);
	text-shadow: 0 0 6px rgba(255, 197, 107, 0.35);
}

.gw-status__v--wrap {
	white-space: normal;
	word-break: break-word;
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 1100px) {
	.gw-live-grid { grid-template-columns: 1fr; }
	.gw-mind { height: auto; min-height: 0; }
	.gw-panel-stack { height: auto; grid-template-rows: minmax(220px, 32vh) minmax(280px, auto); }
	.gw-term__body--scroll { max-height: 460px; }
}

@media (max-width: 640px) {
	.gw { padding: 12px; }
	.gw-page-head { flex-direction: column; align-items: flex-start; }
	.gw-world__canvas { min-height: 360px; }
	.gw-term__line { grid-template-columns: 14px auto 1fr; }
	.gw-term__key { font-size: 16px; }
}
</style>

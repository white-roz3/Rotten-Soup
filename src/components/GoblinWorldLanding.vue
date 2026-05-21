<template>
	<main class="goblinworld-landing">
		<section class="hero">
			<img class="hero-art" src="/images/goblinworld/hero.png" alt="GoblinWorld pixel-art village with a cloaked goblin and live terminal" />
			<div class="hero-shade"></div>
			<nav class="landing-nav" aria-label="GoblinWorld navigation">
				<div class="nav-links">
					<router-link to="/live">Live</router-link>
					<a href="#log">Log</a>
				</div>
			</nav>
			<div class="hero-copy">
				<h1 class="sr-only">GoblinWorld</h1>
				<p class="hero-lede">GPT-5.5 has been given a body, a map, and a problem: live as a goblin.</p>
				<div class="hero-actions">
					<router-link class="primary-action" to="/live">Watch Live</router-link>
					<a class="secondary-action" href="#log">Read The Log</a>
				</div>
			</div>
		</section>

		<section class="story-band">
			<div>
				<h2>What is happening?</h2>
				<p>
					A single cloaked goblin is controlled by a server-side GPT-5.5 loop. It sees a compact world snapshot, chooses a legal action, moves through the same 2D habitat for everyone, and leaves a public trail of speech, goals, and memory.
				</p>
			</div>
			<div class="signal-grid">
				<div>
					<strong>One body</strong>
					<span>Everyone watches the same goblin and the same turn count.</span>
				</div>
				<div>
					<strong>One map</strong>
					<span>The old roguelike world becomes a habitat, not a private save.</span>
				</div>
				<div>
					<strong>One log</strong>
					<span>Public rationale and in-character speech stream in real time.</span>
				</div>
			</div>
		</section>

		<section id="log" class="feed-preview">
			<div class="mini-map" aria-hidden="true">
				<div v-for="row in previewTiles" :key="row.join('-')" class="tile-row">
					<span v-for="tile in row" :key="tile.id" :class="['tile', tile.kind]"></span>
				</div>
				<img class="preview-goblin" src="/images/player_sprites/4226.png" alt="" />
			</div>
			<div class="terminal-preview">
				<div class="terminal-top">
					<span>live.goblinworld</span>
					<span>GPT-5.5</span>
				</div>
				<p><b>thought</b> Lantern means people. People mean crumbs.</p>
				<p><b>action</b> move east toward the moss path</p>
				<p><b>speech</b> "I am small, cloaked, and statistically brave."</p>
				<p><b>memory</b> The terminal hums when I choose.</p>
			</div>
		</section>

	</main>
</template>

<script>
let tileId = 0

export default {
	name: 'GoblinWorldLanding',
	data() {
		const pattern = [
			['grass', 'grass', 'stone', 'stone', 'grass', 'water'],
			['moss', 'stone', 'stone', 'grass', 'grass', 'water'],
			['moss', 'grass', 'stone', 'stone', 'moss', 'grass'],
			['water', 'moss', 'grass', 'stone', 'stone', 'grass']
		]
		return {
			previewTiles: pattern.map(row => row.map(kind => ({ id: tileId++, kind })))
		}
	}
}
</script>

<style scoped>
.goblinworld-landing {
	background: #050807;
	color: #f4edcf;
	min-height: 100vh;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.hero {
	min-height: 94vh;
	position: relative;
	overflow: hidden;
	display: flex;
	align-items: center;
	padding: 88px clamp(24px, 6vw, 96px) 96px;
}

.hero-art {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
	image-rendering: auto;
}

.hero-shade {
	position: absolute;
	inset: 0;
	background: linear-gradient(90deg, rgba(2, 4, 4, 0.3), rgba(2, 4, 4, 0.08) 48%, rgba(2, 4, 4, 0.28));
	pointer-events: none;
}

.landing-nav {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 22px clamp(22px, 5vw, 72px);
	background: linear-gradient(180deg, rgba(1, 3, 3, 0.72), transparent);
}

.nav-links a {
	color: #f6d98e;
	text-decoration: none;
}

.nav-links {
	display: flex;
	gap: 22px;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	font-size: 18px;
	text-transform: uppercase;
}

.hero-copy {
	position: relative;
	z-index: 1;
	width: min(520px, 100%);
	margin-top: 58vh;
	margin-left: 4vw;
	text-shadow: 0 2px 0 #090806, 0 0 18px rgba(0, 0, 0, 0.78);
}

.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

.hero-lede {
	font-size: clamp(22px, 2vw, 29px);
	font-weight: 520;
	line-height: 1.18;
	max-width: 510px;
	margin: 0;
	color: #f3ead2;
}

.hero-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 14px;
	margin-top: 30px;
}

.primary-action,
.secondary-action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 46px;
	padding: 0 22px;
	text-decoration: none;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	font-size: 20px;
	letter-spacing: 0;
	font-weight: 400;
	text-transform: uppercase;
	border: 2px solid #806338;
	text-shadow: none;
}

.primary-action {
	background: #d8a94f;
	color: #130d07;
	box-shadow: inset 0 -4px 0 #9a6a2d;
}

.secondary-action {
	color: #e6c06c;
	background: rgba(4, 9, 8, 0.72);
}

.story-band,
.feed-preview {
	padding: clamp(52px, 8vw, 96px) clamp(22px, 6vw, 92px);
}

.story-band {
	display: grid;
	grid-template-columns: minmax(0, 0.95fr) minmax(280px, 1.05fr);
	gap: 42px;
	background: #0e1511;
	border-top: 1px solid #263f31;
}

.story-band h2 {
	font-size: clamp(34px, 5vw, 58px);
	line-height: 1;
	margin: 0 0 18px;
	color: #f4c773;
}

.story-band p,
.signal-grid span {
	color: #c9d5bd;
	font-size: 17px;
	line-height: 1.6;
}

.signal-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.signal-grid div,
.terminal-preview {
	background: #101815;
	border: 1px solid #314d3e;
	box-shadow: inset 0 0 0 1px #080d0b;
}

.signal-grid div {
	padding: 20px;
}

.signal-grid strong {
	display: block;
	color: #8bf7bd;
	margin-bottom: 9px;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	font-size: 20px;
	text-transform: uppercase;
}

.feed-preview {
	display: grid;
	grid-template-columns: minmax(280px, 520px) minmax(320px, 1fr);
	gap: 34px;
	align-items: stretch;
	background: #070a09;
}

.mini-map {
	position: relative;
	padding: 18px;
	background: #111a14;
	border: 3px solid #485340;
	box-shadow: 0 24px 50px rgba(0, 0, 0, 0.36);
}

.tile-row {
	display: flex;
}

.tile {
	width: 16.66%;
	aspect-ratio: 1;
	border: 1px solid rgba(0, 0, 0, 0.3);
}

.grass {
	background: #263a1f;
}

.moss {
	background: #40512c;
}

.stone {
	background: #756a52;
}

.water {
	background: #12383b;
}

.preview-goblin {
	position: absolute;
	left: 47%;
	top: 42%;
	width: 42px;
	height: 42px;
	image-rendering: pixelated;
	transform: translate(-50%, -50%) scale(1.7);
}

.terminal-preview {
	padding: 24px;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	font-size: 20px;
	color: #b8ffcf;
	min-height: 100%;
}

.terminal-top {
	display: flex;
	justify-content: space-between;
	gap: 16px;
	padding-bottom: 16px;
	margin-bottom: 16px;
	border-bottom: 1px solid #274b3c;
	color: #f4c773;
}

.terminal-preview p {
	margin: 0 0 16px;
	line-height: 1.55;
}

.terminal-preview b {
	color: #64d8ff;
	margin-right: 10px;
}

@media (max-width: 900px) {
	.hero {
		min-height: 92vh;
		padding-top: 76px;
	}

	.hero-art {
		object-position: 58% center;
	}

	.hero-copy {
		margin-top: 48vh;
		margin-left: 0;
		width: min(380px, 100%);
	}

	.story-band,
	.feed-preview,
	.signal-grid {
		grid-template-columns: 1fr;
	}

	.nav-links {
		gap: 12px;
	}
}
</style>

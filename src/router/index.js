import Vue from 'vue'
import Router from 'vue-router'
import Game from '@/components/Game'
import GoblinWorldLanding from '@/components/GoblinWorldLanding'
import GoblinWorldLive from '@/components/GoblinWorldLive'
import DialogueGraphVisualizer from '@/components/DialogueGraphVisualizer'
import ASCIIMapConversion from '@/components/ASCIIMapConversion'
import VoronoiVisualizer from '@/components/VoronoiVisualizer'
import Playground from '@/components/Playground'
Vue.use(Router)

const router = new Router({
	mode: 'history',
	scrollBehavior() {
		return { x: 0, y: 0 }
	},
	routes: [
		{
			path: '/',
			name: 'GoblinWorld',
			component: GoblinWorldLanding,
			meta: { footer: false }
		},
		{
			path: '/live',
			name: 'GoblinWorld - Live',
			component: GoblinWorldLive,
			meta: { footer: false }
		},
		{
			path: '/playground',
			name: 'GoblinWorld - Playground',
			component: Playground
		},
		{
			path: '/dungeonvis',
			name: 'GoblinWorld - ASCII Dungeon Viewer',
			component: ASCIIMapConversion

		},
		{
			path: '/graphvis',
			name: 'GoblinWorld - Dialogue Visualizer',
			component: DialogueGraphVisualizer
		},
		{
			path: '/play',
			name: 'GoblinWorld - Classic Game',
			component: Game
		},
		{
			path: '/voronoi',
			name: 'GoblinWorld - Map Generator',
			component: VoronoiVisualizer
		},
		{
			path: '*',
			redirect: '/'
		}
	]
})

export default router

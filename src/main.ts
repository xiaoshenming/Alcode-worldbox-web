import { Game } from './game/Game'

const game = new Game()
game.start()

// Expose for debugging
;(window as any).__game = game

console.log('🎮 WorldBox Web started!')

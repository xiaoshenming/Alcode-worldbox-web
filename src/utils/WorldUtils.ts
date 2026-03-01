import { World } from '../game/World'

/**
 * Check if any of the 8 adjacent tiles matches the given tile type.
 * Shared utility extracted from 52+ Spring system implementations.
 */
export function hasAdjacentTile(world: World, x: number, y: number, tileType: number): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue
      if (world.getTile(x + dx, y + dy) === tileType) return true
    }
  }
  return false
}

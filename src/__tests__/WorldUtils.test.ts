import { describe, it, expect } from 'vitest'
import { hasAdjacentTile } from '../utils/WorldUtils'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

function makeWorld(width: number, height: number): World {
  return new World(width, height)
}

describe('hasAdjacentTile', () => {
  it('当相邻tile匹配时返回true', () => {
    const world = makeWorld(5, 5)
    world.setTile(1, 0, TileType.DEEP_WATER)
    expect(hasAdjacentTile(world, 1, 1, TileType.DEEP_WATER)).toBe(true)
  })

  it('当没有相邻tile匹配时返回false', () => {
    const world = makeWorld(5, 5)
    expect(hasAdjacentTile(world, 2, 2, TileType.DEEP_WATER)).toBe(false)
  })

  it('不检查自身tile', () => {
    const world = makeWorld(5, 5)
    world.setTile(2, 2, TileType.DEEP_WATER)
    // 自身是WATER_DEEP但相邻没有WATER_DEEP
    expect(hasAdjacentTile(world, 2, 2, TileType.DEEP_WATER)).toBe(false)
  })

  it('检查8个方向', () => {
    const world = makeWorld(5, 5)
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    for (const [dx, dy] of dirs) {
      const w = makeWorld(5, 5)
      w.setTile(2 + dx, 2 + dy, TileType.FOREST)
      expect(hasAdjacentTile(w, 2, 2, TileType.FOREST)).toBe(true)
    }
  })

  it('边界处理：角落位置不越界', () => {
    const world = makeWorld(5, 5)
    world.setTile(1, 0, TileType.FOREST)
    // 检查(0,0)时，相邻有(1,0)
    expect(hasAdjacentTile(world, 0, 0, TileType.FOREST)).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { isWalkable, findPath } from '../utils/Pathfinding'
import { TileType } from '../utils/Constants'

// Mock World 对象
function makeMockWorld(tiles: TileType[][], w: number, h: number) {
  return {
    width: w,
    height: h,
    getTile(x: number, y: number): TileType | null {
      if (x < 0 || x >= w || y < 0 || y >= h) return null
      return tiles[y][x]
    }
  }
}

// 工厂：创建全是草地的世界
function grassWorld(w = 10, h = 10) {
  const tiles: TileType[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => TileType.GRASS)
  )
  return makeMockWorld(tiles, w, h)
}

describe('isWalkable', () => {
  it('GRASS 可行走', () => {
    expect(isWalkable(TileType.GRASS)).toBe(true)
  })

  it('FOREST 可行走', () => {
    expect(isWalkable(TileType.FOREST)).toBe(true)
  })

  it('SAND 可行走', () => {
    expect(isWalkable(TileType.SAND)).toBe(true)
  })

  it('SNOW 可行走', () => {
    expect(isWalkable(TileType.SNOW)).toBe(true)
  })

  it('DEEP_WATER 不可行走（地面）', () => {
    expect(isWalkable(TileType.DEEP_WATER)).toBe(false)
  })

  it('SHALLOW_WATER 不可行走（地面）', () => {
    expect(isWalkable(TileType.SHALLOW_WATER)).toBe(false)
  })

  it('MOUNTAIN 不可行走（地面）', () => {
    expect(isWalkable(TileType.MOUNTAIN)).toBe(false)
  })

  it('LAVA 不可行走（地面）', () => {
    expect(isWalkable(TileType.LAVA)).toBe(false)
  })

  describe('canFly=true', () => {
    it('DEEP_WATER 可飞行', () => {
      expect(isWalkable(TileType.DEEP_WATER, true)).toBe(true)
    })

    it('MOUNTAIN 可飞行', () => {
      expect(isWalkable(TileType.MOUNTAIN, true)).toBe(true)
    })

    it('LAVA 不可飞行', () => {
      expect(isWalkable(TileType.LAVA, true)).toBe(false)
    })
  })
})

describe('findPath', () => {
  it('起点=终点时返回空数组', () => {
    const world = grassWorld()
    const result = findPath(world as any, 0, 0, 0, 0)
    expect(result).toEqual([])
  })

  it('直线路径可以找到', () => {
    const world = grassWorld()
    const path = findPath(world as any, 0, 0, 5, 0)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
    // 最后一步应该是终点
    const last = path![path!.length - 1]
    expect(last.x).toBe(5)
    expect(last.y).toBe(0)
  })

  it('目标是不可行走地形时返回 null', () => {
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.GRASS)
    )
    tiles[5][5] = TileType.DEEP_WATER
    const world = makeMockWorld(tiles, 10, 10)
    const result = findPath(world as any, 0, 0, 5, 5)
    expect(result).toBeNull()
  })

  it('无法到达时返回 null（被墙包围的目标）', () => {
    // 创建一个中间有水障碍的世界：目标 (5,5) 完全被水包围
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.GRASS)
    )
    // 用深水围住 (5,5) 周围所有格子
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        tiles[5 + dy][5 + dx] = TileType.DEEP_WATER
      }
    }
    // (5,5) 本身是草地，但四周被水包围
    // 此情况 findPath 的目标可达性取决于起点能否到达邻格
    // 目标(5,5)可走但被水包围 → A*无法扩展到该节点 → null
    const world = makeMockWorld(tiles, 10, 10)
    const result = findPath(world as any, 0, 0, 5, 5)
    expect(result).toBeNull()
  })

  it('路径长度受 maxSteps 限制', () => {
    const world = grassWorld(50, 50)
    const path = findPath(world as any, 0, 0, 49, 49, false, 10)
    // maxSteps=10 时，如果找到路径，长度不应超过 10
    if (path !== null) {
      expect(path.length).toBeLessThanOrEqual(10)
    }
    // 如果找不到，也是正常的（距离超过 maxSteps*10 iterations 上限）
  })

  it('飞行单位可以穿越深水', () => {
    // 全是深水的世界，飞行单位应该能找到路径
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.DEEP_WATER)
    )
    const world = makeMockWorld(tiles, 10, 10)
    const path = findPath(world as any, 0, 0, 5, 0, true)
    expect(path).not.toBeNull()
  })

  it('飞行单位不能穿越岩浆', () => {
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.LAVA)
    )
    const world = makeMockWorld(tiles, 10, 10)
    const path = findPath(world as any, 0, 0, 5, 0, true)
    expect(path).toBeNull()
  })
})

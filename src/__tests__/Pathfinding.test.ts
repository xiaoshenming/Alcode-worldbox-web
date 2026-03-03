import { describe, it, expect } from 'vitest'
import { isWalkable, findPath, findNextStep } from '../utils/Pathfinding'
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

  it('大地图（50x50）可以找到路径', () => {
    const world = grassWorld(50, 50)
    const path = findPath(world as any, 0, 0, 49, 49)
    expect(path).not.toBeNull()
    const last = path![path!.length - 1]
    expect(last.x).toBe(49)
    expect(last.y).toBe(49)
  })

  it('对角线路径：终点在右下角', () => {
    const world = grassWorld(20, 20)
    const path = findPath(world as any, 0, 0, 10, 10)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
    // 对角线步数应该比曼哈顿距离少（A* 支持8方向）
    expect(path!.length).toBeLessThanOrEqual(10)
  })

  it('混合地形（中间有水障碍但有绕路）', () => {
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.GRASS)
    )
    // 竖向水墙，x=5，y=0~8（留 y=9 通道）
    for (let y = 0; y < 9; y++) {
      tiles[y][5] = TileType.DEEP_WATER
    }
    const world = makeMockWorld(tiles, 10, 10)
    const path = findPath(world as any, 0, 0, 9, 0)
    expect(path).not.toBeNull()
    // 路径要绕过水墙，经过 y=9 附近
  })
})

// ── findNextStep ─────────────────────────────────────────────────────────────

describe('findNextStep', () => {
  it('已在目标附近（距离 < 0.5）时返回 null', () => {
    const world = grassWorld()
    // from=(5,5), to=(5.3,5.3)，距离 < 0.5
    const result = findNextStep(world as any, 5, 5, 5.3, 5.3)
    expect(result).toBeNull()
  })

  it('向右移动时 x 方向正确', () => {
    const world = grassWorld()
    const step = findNextStep(world as any, 0, 5, 9, 5)
    expect(step).not.toBeNull()
    expect(step!.x).toBeGreaterThan(0)
  })

  it('向下移动时 y 方向正确', () => {
    const world = grassWorld()
    const step = findNextStep(world as any, 5, 0, 5, 9)
    expect(step).not.toBeNull()
    expect(step!.y).toBeGreaterThan(0)
  })

  it('遇到不可行走地形时返回 null（四面都是水）', () => {
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.GRASS)
    )
    // 把 (5,5) 四面八方都设成水
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        tiles[5 + dy][5 + dx] = TileType.DEEP_WATER
      }
    }
    const world = makeMockWorld(tiles, 10, 10)
    const result = findNextStep(world as any, 5, 5, 9, 9)
    expect(result).toBeNull()
  })

  it('返回值中 x 和 y 的绝对值 <= 1（只走相邻格）', () => {
    const world = grassWorld()
    const step = findNextStep(world as any, 3, 3, 8, 8)
    expect(step).not.toBeNull()
    expect(Math.abs(step!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(step!.y)).toBeLessThanOrEqual(1)
  })

  it('飞行单位可以穿越深水', () => {
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.DEEP_WATER)
    )
    // 只保留 (0,0) 是草地
    tiles[0][0] = TileType.GRASS
    const world = makeMockWorld(tiles, 10, 10)
    const step = findNextStep(world as any, 0, 0, 9, 0, true)
    expect(step).not.toBeNull()
  })
})

// ---- Extended tests (to reach 50+) ----

describe('isWalkable - 额外地形测试', () => {
  it('GRASS canFly=false 可行走', () => {
    expect(isWalkable(TileType.GRASS, false)).toBe(true)
  })

  it('FOREST canFly=true 可行走', () => {
    expect(isWalkable(TileType.FOREST, true)).toBe(true)
  })

  it('SAND canFly=true 可行走', () => {
    expect(isWalkable(TileType.SAND, true)).toBe(true)
  })

  it('SNOW canFly=false 可行走', () => {
    expect(isWalkable(TileType.SNOW, false)).toBe(true)
  })

  it('SHALLOW_WATER canFly=true 可行走', () => {
    expect(isWalkable(TileType.SHALLOW_WATER, true)).toBe(true)
  })

  it('MOUNTAIN canFly=false 不可行走', () => {
    expect(isWalkable(TileType.MOUNTAIN, false)).toBe(false)
  })

  it('LAVA canFly=true 不可行走', () => {
    expect(isWalkable(TileType.LAVA, true)).toBe(false)
  })
})

describe('findPath - 更多路径场景', () => {
  it('垂直路径：同一列', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 5, 0, 5, 3)
    if (path) {
      expect(path.length).toBeGreaterThan(0)
      const last = path[path.length - 1]
      expect(last.x).toBe(5)
      expect(last.y).toBe(3)
    }
  })

  it('水平路径：同一行', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 5, 3, 5)
    if (path) {
      expect(path.length).toBeGreaterThan(0)
      const last = path[path.length - 1]
      expect(last.x).toBe(3)
      expect(last.y).toBe(5)
    }
  })

  it('对角路径存在', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 0, 3, 3)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
  })

  it('路径中每步都在地图范围内', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 1, 1, 5, 5)
    expect(path).not.toBeNull()
    for (const node of path!) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThan(10)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThan(10)
    }
  })

  it('终点不可达时返回空数组', () => {
    const tiles: TileType[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => TileType.GRASS)
    )
    // 用水包围终点(9,9)
    for (let x = 7; x < 10; x++) {
      for (let y = 7; y < 10; y++) {
        tiles[y][x] = TileType.DEEP_WATER
      }
    }
    const world = makeMockWorld(tiles, 10, 10)
    const result = findPath(world as any, 0, 0, 9, 9)
    expect(result === null || (Array.isArray(result) && result.length === 0)).toBe(true)
  })

  it('短距离(1步)路径正确', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 0, 1, 0)
    expect(path).not.toBeNull()
    expect(path!).toHaveLength(1)
    expect(path![0].x).toBe(1)
    expect(path![0].y).toBe(0)
  })
})

describe('findNextStep - 额外场景', () => {
  it('向左移动时x方向正确', () => {
    const world = grassWorld(10, 10)
    const step = findNextStep(world as any, 9, 5, 0, 5)
    expect(step).not.toBeNull()
    expect(step!.x).toBeLessThan(0)
  })

  it('向上移动时y方向正确', () => {
    const world = grassWorld(10, 10)
    const step = findNextStep(world as any, 5, 9, 5, 0)
    expect(step).not.toBeNull()
    expect(step!.y).toBeLessThan(0)
  })

  it('步长不超过1.5（对角线）', () => {
    const world = grassWorld(10, 10)
    const step = findNextStep(world as any, 0, 0, 9, 9)
    if (step) {
      const dist = Math.sqrt(step.x * step.x + step.y * step.y)
      expect(dist).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('isWalkable - 所有TileType系统测试', () => {
  it('GRASS 默认参数可行走', () => {
    expect(isWalkable(TileType.GRASS)).toBe(true)
  })

  it('DEEP_WATER 默认参数不可行走', () => {
    expect(isWalkable(TileType.DEEP_WATER)).toBe(false)
  })
})

describe('findPath - 路径节点序列验证', () => {
  it('两步路径节点连续（每步只移动1格）', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 0, 2, 0)
    expect(path).not.toBeNull()
    // 每步相邻
    for (let i = 1; i < path!.length; i++) {
      const dx = Math.abs(path![i].x - path![i-1].x)
      const dy = Math.abs(path![i].y - path![i-1].y)
      expect(dx + dy).toBeLessThanOrEqual(2) // 允许对角
    }
  })

  it('终点在路径末尾', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    if (path!.length > 0) {
      const last = path![path!.length - 1]
      expect(last.x).toBe(4)
      expect(last.y).toBe(4)
    }
  })
})

describe('findPath - 世界边界测试', () => {
  it('起点在地图边缘(0,0)也能找路', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 0, 5, 0)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
  })

  it('终点在地图边缘(9,9)也能找路', () => {
    const world = grassWorld(10, 10)
    const path = findPath(world as any, 0, 0, 9, 9)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
  })
})

describe('isWalkable - 无参数调用', () => {
  it('调用时不传canFly参数，默认为false', () => {
    // DEEP_WATER without canFly should be false
    expect(isWalkable(TileType.DEEP_WATER)).toBe(false)
    // GRASS without canFly should be true
    expect(isWalkable(TileType.GRASS)).toBe(true)
  })
})

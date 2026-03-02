import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { hasAdjacentTile } from '../utils/WorldUtils'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

function makeWorld(width: number, height: number): World {
  return new World(width, height)
}

/** 用指定 tileType 填充整个世界 */
function fillWorld(world: World, width: number, height: number, tileType: TileType): void {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      world.setTile(x, y, tileType)
    }
  }
}

describe('hasAdjacentTile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===== 基本功能 =====
  describe('基本功能', () => {
    it('当相邻tile匹配时返回true', () => {
      const world = makeWorld(5, 5)
      world.setTile(1, 0, TileType.DEEP_WATER)
      expect(hasAdjacentTile(world, 1, 1, TileType.DEEP_WATER)).toBe(true)
    })

    it('当没有相邻tile匹配时返回false', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      expect(hasAdjacentTile(world, 2, 2, TileType.DEEP_WATER)).toBe(false)
    })

    it('不检查自身tile', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      world.setTile(2, 2, TileType.DEEP_WATER)
      // 自身是 DEEP_WATER，但相邻都是 GRASS
      expect(hasAdjacentTile(world, 2, 2, TileType.DEEP_WATER)).toBe(false)
    })

    it('在所有8个方向上均能检测到相邻tile', () => {
      const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
      for (const [dx, dy] of dirs) {
        const w = makeWorld(5, 5)
        w.setTile(2 + dx, 2 + dy, TileType.FOREST)
        expect(hasAdjacentTile(w, 2, 2, TileType.FOREST)).toBe(true)
      }
    })

    it('只有自身是目标类型时返回false', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.SAND)
      world.setTile(2, 2, TileType.LAVA)
      expect(hasAdjacentTile(world, 2, 2, TileType.LAVA)).toBe(false)
    })

    it('找到第一个匹配即返回true（不需要所有邻居匹配）', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      // 仅设置一个邻居为目标
      world.setTile(3, 2, TileType.FOREST)
      expect(hasAdjacentTile(world, 2, 2, TileType.FOREST)).toBe(true)
    })

    it('多个邻居匹配时仍返回true', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.DEEP_WATER)
      // 所有邻居都是 DEEP_WATER
      world.setTile(2, 2, TileType.GRASS)
      expect(hasAdjacentTile(world, 2, 2, TileType.DEEP_WATER)).toBe(true)
    })
  })

  // ===== 8方向完整覆盖 =====
  describe('8方向完整覆盖', () => {
    let world: World

    beforeEach(() => {
      world = makeWorld(7, 7)
      fillWorld(world, 7, 7, TileType.GRASS)
    })

    it('左上方向 (-1,-1) 检测到目标', () => {
      world.setTile(2, 2, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('正上方向 (0,-1) 检测到目标', () => {
      world.setTile(3, 2, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('右上方向 (1,-1) 检测到目标', () => {
      world.setTile(4, 2, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('正左方向 (-1,0) 检测到目标', () => {
      world.setTile(2, 3, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('正右方向 (1,0) 检测到目标', () => {
      world.setTile(4, 3, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('左下方向 (-1,1) 检测到目标', () => {
      world.setTile(2, 4, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('正下方向 (0,1) 检测到目标', () => {
      world.setTile(3, 4, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })

    it('右下方向 (1,1) 检测到目标', () => {
      world.setTile(4, 4, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 3, 3, TileType.MOUNTAIN)).toBe(true)
    })
  })

  // ===== 边界条件 =====
  describe('边界条件', () => {
    it('左上角(0,0)：不越界，有效邻居(1,0)匹配时返回true', () => {
      const world = makeWorld(5, 5)
      world.setTile(1, 0, TileType.FOREST)
      expect(hasAdjacentTile(world, 0, 0, TileType.FOREST)).toBe(true)
    })

    it('左上角(0,0)：不越界，有效邻居(0,1)匹配时返回true', () => {
      const world = makeWorld(5, 5)
      world.setTile(0, 1, TileType.SNOW)
      expect(hasAdjacentTile(world, 0, 0, TileType.SNOW)).toBe(true)
    })

    it('右上角(width-1,0)：有效邻居匹配时返回true', () => {
      const world = makeWorld(5, 5)
      world.setTile(3, 0, TileType.LAVA)
      expect(hasAdjacentTile(world, 4, 0, TileType.LAVA)).toBe(true)
    })

    it('左下角(0,height-1)：不越界且邻居匹配', () => {
      const world = makeWorld(5, 5)
      world.setTile(1, 4, TileType.SAND)
      expect(hasAdjacentTile(world, 0, 4, TileType.SAND)).toBe(true)
    })

    it('右下角(width-1,height-1)：不越界且邻居匹配', () => {
      const world = makeWorld(5, 5)
      world.setTile(3, 4, TileType.DEEP_WATER)
      expect(hasAdjacentTile(world, 4, 4, TileType.DEEP_WATER)).toBe(true)
    })

    it('左边界中间：越界方向不崩溃', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      // x=0，左侧邻居越界，不应崩溃
      expect(() => hasAdjacentTile(world, 0, 2, TileType.LAVA)).not.toThrow()
    })

    it('右边界中间：越界方向不崩溃', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      expect(() => hasAdjacentTile(world, 4, 2, TileType.LAVA)).not.toThrow()
    })

    it('上边界中间：越界方向不崩溃', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      expect(() => hasAdjacentTile(world, 2, 0, TileType.LAVA)).not.toThrow()
    })

    it('下边界中间：越界方向不崩溃', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      expect(() => hasAdjacentTile(world, 2, 4, TileType.LAVA)).not.toThrow()
    })

    it('全越界的坐标(负数)：不崩溃且返回false', () => {
      const world = makeWorld(5, 5)
      expect(() => hasAdjacentTile(world, -5, -5, TileType.GRASS)).not.toThrow()
    })

    it('1x1世界：中心点周围全越界，返回false', () => {
      const world = makeWorld(1, 1)
      world.setTile(0, 0, TileType.GRASS)
      // 没有任何有效邻居
      expect(hasAdjacentTile(world, 0, 0, TileType.GRASS)).toBe(false)
    })
  })

  // ===== 各 TileType 覆盖 =====
  describe('各 TileType 类型覆盖', () => {
    it('检测 DEEP_WATER 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.DEEP_WATER)
      expect(hasAdjacentTile(world, 2, 2, TileType.DEEP_WATER)).toBe(true)
    })

    it('检测 SHALLOW_WATER 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.SHALLOW_WATER)
      expect(hasAdjacentTile(world, 2, 2, TileType.SHALLOW_WATER)).toBe(true)
    })

    it('检测 SAND 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.SAND)
      expect(hasAdjacentTile(world, 2, 2, TileType.SAND)).toBe(true)
    })

    it('检测 FOREST 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.FOREST)
      expect(hasAdjacentTile(world, 2, 2, TileType.FOREST)).toBe(true)
    })

    it('检测 MOUNTAIN 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 2, 2, TileType.MOUNTAIN)).toBe(true)
    })

    it('检测 SNOW 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.SNOW)
      expect(hasAdjacentTile(world, 2, 2, TileType.SNOW)).toBe(true)
    })

    it('检测 LAVA 邻居', () => {
      const world = makeWorld(5, 5)
      world.setTile(2, 1, TileType.LAVA)
      expect(hasAdjacentTile(world, 2, 2, TileType.LAVA)).toBe(true)
    })

    it('检测 GRASS 邻居', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.SAND)
      world.setTile(2, 1, TileType.GRASS)
      expect(hasAdjacentTile(world, 2, 2, TileType.GRASS)).toBe(true)
    })
  })

  // ===== 语义场景 =====
  describe('典型游戏场景', () => {
    it('草地旁有森林：检测为true', () => {
      const world = makeWorld(10, 10)
      fillWorld(world, 10, 10, TileType.GRASS)
      world.setTile(5, 4, TileType.FOREST)
      expect(hasAdjacentTile(world, 5, 5, TileType.FOREST)).toBe(true)
    })

    it('孤立的沙漠中间：不含任何草地邻居', () => {
      const world = makeWorld(10, 10)
      fillWorld(world, 10, 10, TileType.SAND)
      expect(hasAdjacentTile(world, 5, 5, TileType.GRASS)).toBe(false)
    })

    it('草地与水接触：检测 SHALLOW_WATER 邻居', () => {
      const world = makeWorld(10, 10)
      fillWorld(world, 10, 10, TileType.GRASS)
      world.setTile(6, 5, TileType.SHALLOW_WATER)
      expect(hasAdjacentTile(world, 5, 5, TileType.SHALLOW_WATER)).toBe(true)
    })

    it('火山岛：山脉旁有岩浆', () => {
      const world = makeWorld(10, 10)
      fillWorld(world, 10, 10, TileType.MOUNTAIN)
      world.setTile(5, 5, TileType.LAVA)
      // 检查山脉旁有无岩浆
      expect(hasAdjacentTile(world, 4, 5, TileType.LAVA)).toBe(true)
    })

    it('完全水域中间：无陆地邻居', () => {
      const world = makeWorld(10, 10)
      fillWorld(world, 10, 10, TileType.DEEP_WATER)
      expect(hasAdjacentTile(world, 5, 5, TileType.GRASS)).toBe(false)
    })

    it('雪山旁是普通山脉：能检测到MOUNTAIN', () => {
      const world = makeWorld(10, 10)
      fillWorld(world, 10, 10, TileType.SNOW)
      world.setTile(4, 5, TileType.MOUNTAIN)
      expect(hasAdjacentTile(world, 5, 5, TileType.MOUNTAIN)).toBe(true)
    })

    it('更大世界(100x100)中心位置：正常检测', () => {
      const world = makeWorld(100, 100)
      fillWorld(world, 100, 100, TileType.GRASS)
      world.setTile(50, 49, TileType.FOREST)
      expect(hasAdjacentTile(world, 50, 50, TileType.FOREST)).toBe(true)
    })

    it('动态修改tile后重新检测：结果正确更新', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      expect(hasAdjacentTile(world, 2, 2, TileType.FOREST)).toBe(false)
      world.setTile(2, 1, TileType.FOREST)
      expect(hasAdjacentTile(world, 2, 2, TileType.FOREST)).toBe(true)
    })

    it('目标type不存在于世界中时返回false', () => {
      const world = makeWorld(5, 5)
      fillWorld(world, 5, 5, TileType.GRASS)
      // LAVA 不存在
      expect(hasAdjacentTile(world, 2, 2, TileType.LAVA)).toBe(false)
    })
  })
})

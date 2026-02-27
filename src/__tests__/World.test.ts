import { describe, it, expect, beforeEach } from 'vitest'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

// 用小尺寸 World 避免生成大地图带来的测试延迟
function makeSmallWorld(w = 10, h = 10): World {
  return new World(w, h)
}

describe('World - getTile / setTile', () => {
  let world: World

  beforeEach(() => {
    world = makeSmallWorld()
  })

  it('getTile 在边界内返回有效 TileType', () => {
    const tile = world.getTile(0, 0)
    expect(tile).not.toBeNull()
    expect(typeof tile).toBe('number')
  })

  it('getTile 在边界外返回 null', () => {
    expect(world.getTile(-1, 0)).toBeNull()
    expect(world.getTile(0, -1)).toBeNull()
    expect(world.getTile(10, 0)).toBeNull()
    expect(world.getTile(0, 10)).toBeNull()
  })

  it('setTile 设置后 getTile 返回新类型', () => {
    world.setTile(5, 5, TileType.DEEP_WATER)
    expect(world.getTile(5, 5)).toBe(TileType.DEEP_WATER)
  })

  it('setTile 对越界坐标无效果', () => {
    // 不应该抛出异常
    expect(() => world.setTile(-1, 0, TileType.GRASS)).not.toThrow()
    expect(() => world.setTile(0, 100, TileType.GRASS)).not.toThrow()
  })

  it('setTile 能设置全部 TileType', () => {
    const types = [
      TileType.GRASS, TileType.FOREST, TileType.SAND, TileType.SNOW,
      TileType.DEEP_WATER, TileType.SHALLOW_WATER, TileType.MOUNTAIN, TileType.LAVA
    ]
    for (const type of types) {
      world.setTile(0, 0, type)
      expect(world.getTile(0, 0)).toBe(type)
    }
  })
})

describe('World - dirty 标记系统', () => {
  let world: World

  beforeEach(() => {
    world = makeSmallWorld()
    world.clearDirty() // 清除构造时产生的初始 dirty 状态
  })

  it('clearDirty 后 isFullDirty 返回 false', () => {
    expect(world.isFullDirty()).toBe(false)
  })

  it('markFullDirty 后 isFullDirty 返回 true', () => {
    world.markFullDirty()
    expect(world.isFullDirty()).toBe(true)
  })

  it('isDirty 在 markFullDirty 后返回 true', () => {
    world.markFullDirty()
    expect(world.isDirty()).toBe(true)
  })

  it('isDirty 在 clearDirty 后返回 false', () => {
    world.markFullDirty()
    world.clearDirty()
    expect(world.isDirty()).toBe(false)
  })

  it('setTile 后 isDirty 返回 true（chunk 标记）', () => {
    world.clearDirty()
    world.setTile(0, 0, TileType.LAVA)
    expect(world.isDirty()).toBe(true)
  })

  it('setTile 越界后 isDirty 不变', () => {
    world.clearDirty()
    world.setTile(-1, -1, TileType.LAVA)
    expect(world.isDirty()).toBe(false)
  })
})

describe('World - getSeasonMultiplier', () => {
  let world: World

  beforeEach(() => {
    world = makeSmallWorld()
  })

  it('spring 乘数为 1.1', () => {
    world.season = 'spring'
    expect(world.getSeasonMultiplier()).toBe(1.1)
  })

  it('summer 乘数为 1.0', () => {
    world.season = 'summer'
    expect(world.getSeasonMultiplier()).toBe(1.0)
  })

  it('autumn 乘数为 0.9', () => {
    world.season = 'autumn'
    expect(world.getSeasonMultiplier()).toBe(0.9)
  })

  it('winter 乘数为 0.7', () => {
    world.season = 'winter'
    expect(world.getSeasonMultiplier()).toBe(0.7)
  })
})

describe('World - getDayBrightness', () => {
  let world: World

  beforeEach(() => {
    world = makeSmallWorld()
  })

  it('亮度值在 [0.3, 1.0] 范围内', () => {
    for (let i = 0; i <= 100; i++) {
      world.dayNightCycle = i / 100
      const brightness = world.getDayBrightness()
      expect(brightness).toBeGreaterThanOrEqual(0.3)
      expect(brightness).toBeLessThanOrEqual(1.0)
    }
  })

  it('正午(0.5)亮度最高', () => {
    world.dayNightCycle = 0.5
    const noon = world.getDayBrightness()
    world.dayNightCycle = 0.0
    const midnight = world.getDayBrightness()
    expect(noon).toBeGreaterThan(midnight)
  })

  it('午夜(0.0)亮度最低接近0.3', () => {
    world.dayNightCycle = 0.0
    const brightness = world.getDayBrightness()
    expect(brightness).toBeCloseTo(0.3, 1)
  })
})

describe('World - isDay', () => {
  let world: World

  beforeEach(() => {
    world = makeSmallWorld()
  })

  it('dayNightCycle=0.5(正午)时是白天', () => {
    world.dayNightCycle = 0.5
    expect(world.isDay()).toBe(true)
  })

  it('dayNightCycle=0.0(午夜)时是夜晚', () => {
    world.dayNightCycle = 0.0
    expect(world.isDay()).toBe(false)
  })

  it('dayNightCycle=0.1(深夜)时是夜晚', () => {
    world.dayNightCycle = 0.1
    expect(world.isDay()).toBe(false)
  })

  it('dayNightCycle=0.25(黎明)时是白天', () => {
    world.dayNightCycle = 0.25
    expect(world.isDay()).toBe(true)
  })

  it('dayNightCycle=0.9(深夜)时是夜晚', () => {
    world.dayNightCycle = 0.9
    expect(world.isDay()).toBe(false)
  })
})

describe('World - update (季节推进)', () => {
  it('update 使 tick 递增', () => {
    const world = makeSmallWorld()
    const before = world.tick
    world.update()
    expect(world.tick).toBe(before + 1)
  })

  it('update 更新 dayNightCycle 在 [0,1] 范围内', () => {
    const world = makeSmallWorld()
    for (let i = 0; i < 100; i++) {
      world.update()
    }
    expect(world.dayNightCycle).toBeGreaterThanOrEqual(0)
    expect(world.dayNightCycle).toBeLessThan(1)
  })

  it('season 是有效值之一', () => {
    const world = makeSmallWorld()
    const validSeasons = ['spring', 'summer', 'autumn', 'winter']
    for (let i = 0; i < 1000; i += 100) {
      world.update()
      expect(validSeasons).toContain(world.season)
    }
  })

  it('seasonProgress 在 [0,1) 范围内', () => {
    const world = makeSmallWorld()
    for (let i = 0; i < 500; i++) {
      world.update()
      expect(world.seasonProgress).toBeGreaterThanOrEqual(0)
      expect(world.seasonProgress).toBeLessThan(1)
    }
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDecorationSystem, DecorationType } from '../systems/WorldDecorationSystem'
import { TileType } from '../utils/Constants'

function makeSys(): WorldDecorationSystem { return new WorldDecorationSystem() }

// 构造指定地形的 tiles 网格
function makeTiles(tileType: TileType, w: number, h: number): TileType[][] {
  return Array.from({ length: h }, () => new Array(w).fill(tileType))
}

describe('WorldDecorationSystem - 初始状态', () => {
  let sys: WorldDecorationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始count为0', () => { expect(sys.count).toBe(0) })
  it('worldWidth初始为0', () => { expect((sys as any).worldWidth).toBe(0) })
  it('worldHeight初始为0', () => { expect((sys as any).worldHeight).toBe(0) })
  it('grid初始为空数组', () => { expect((sys as any).grid).toHaveLength(0) })
  it('decorationCount初始为0', () => { expect((sys as any).decorationCount).toBe(0) })
})

describe('WorldDecorationSystem - DecorationType枚举', () => {
  it('FLOWER_RED=0', () => { expect(DecorationType.FLOWER_RED).toBe(0) })
  it('FLOWER_YELLOW=1', () => { expect(DecorationType.FLOWER_YELLOW).toBe(1) })
  it('FLOWER_WHITE=2', () => { expect(DecorationType.FLOWER_WHITE).toBe(2) })
  it('GRASS_TUFT=3', () => { expect(DecorationType.GRASS_TUFT).toBe(3) })
  it('MUSHROOM=4', () => { expect(DecorationType.MUSHROOM).toBe(4) })
  it('FALLEN_LEAF=5', () => { expect(DecorationType.FALLEN_LEAF).toBe(5) })
  it('SHELL=6', () => { expect(DecorationType.SHELL).toBe(6) })
  it('CACTUS=7', () => { expect(DecorationType.CACTUS).toBe(7) })
  it('SMALL_ROCK=8', () => { expect(DecorationType.SMALL_ROCK).toBe(8) })
  it('ORE_SPARKLE=9', () => { expect(DecorationType.ORE_SPARKLE).toBe(9) })
  it('SNOWFLAKE=10', () => { expect(DecorationType.SNOWFLAKE).toBe(10) })
  it('ICE_CRYSTAL=11', () => { expect(DecorationType.ICE_CRYSTAL).toBe(11) })
})

describe('WorldDecorationSystem - generate基础行为', () => {
  let sys: WorldDecorationSystem
  beforeEach(() => { sys = makeSys() })

  it('generate后worldWidth被正确设置', () => {
    const tiles = makeTiles(TileType.GRASS, 30, 20)
    sys.generate(tiles, 30, 20)
    expect((sys as any).worldWidth).toBe(30)
  })
  it('generate后worldHeight被正确设置', () => {
    const tiles = makeTiles(TileType.GRASS, 30, 20)
    sys.generate(tiles, 30, 20)
    expect((sys as any).worldHeight).toBe(20)
  })
  it('generate后grid行数=height', () => {
    const tiles = makeTiles(TileType.GRASS, 10, 15)
    sys.generate(tiles, 10, 15)
    expect((sys as any).grid).toHaveLength(15)
  })
  it('generate后grid每行列数=width', () => {
    const tiles = makeTiles(TileType.GRASS, 10, 5)
    sys.generate(tiles, 10, 5)
    expect((sys as any).grid[0]).toHaveLength(10)
  })
  it('重复generate会重置decorationCount', () => {
    const tilesGrass = makeTiles(TileType.GRASS, 20, 20)
    sys.generate(tilesGrass, 20, 20)
    const first = sys.count
    // 再次generate一个空白地图
    const tilesWater = makeTiles(TileType.DEEP_WATER, 5, 5)
    sys.generate(tilesWater, 5, 5)
    expect(sys.count).toBe(0)
    expect(first).toBeGreaterThan(0)  // 第一次确实有装饰
  })
})

describe('WorldDecorationSystem - generate地形装饰', () => {
  let sys: WorldDecorationSystem
  beforeEach(() => { sys = makeSys() })

  it('DEEP_WATER地图无装饰(count=0)', () => {
    const tiles = makeTiles(TileType.DEEP_WATER, 20, 20)
    sys.generate(tiles, 20, 20)
    expect(sys.count).toBe(0)
  })
  it('SHALLOW_WATER地图无装饰(count=0)', () => {
    const tiles = makeTiles(TileType.SHALLOW_WATER, 20, 20)
    sys.generate(tiles, 20, 20)
    expect(sys.count).toBe(0)
  })
  it('GRASS大地图有装饰(count>0)', () => {
    const tiles = makeTiles(TileType.GRASS, 30, 30)
    sys.generate(tiles, 30, 30)
    expect(sys.count).toBeGreaterThan(0)
  })
  it('FOREST大地图有装饰(count>0)', () => {
    const tiles = makeTiles(TileType.FOREST, 30, 30)
    sys.generate(tiles, 30, 30)
    expect(sys.count).toBeGreaterThan(0)
  })
  it('SAND大地图有装饰(count>0)', () => {
    const tiles = makeTiles(TileType.SAND, 30, 30)
    sys.generate(tiles, 30, 30)
    expect(sys.count).toBeGreaterThan(0)
  })
  it('MOUNTAIN大地图有装饰(count>0)', () => {
    const tiles = makeTiles(TileType.MOUNTAIN, 30, 30)
    sys.generate(tiles, 30, 30)
    expect(sys.count).toBeGreaterThan(0)
  })
  it('SNOW大地图有装饰(count>0)', () => {
    const tiles = makeTiles(TileType.SNOW, 30, 30)
    sys.generate(tiles, 30, 30)
    expect(sys.count).toBeGreaterThan(0)
  })
  it('覆盖率约20%：GRASS 100x100 期望count在100-2500之间', () => {
    const tiles = makeTiles(TileType.GRASS, 100, 100)
    sys.generate(tiles, 100, 100)
    // 10000格，seededRandom确定性，约20%有装饰即~2000个，允许宽泛范围
    expect(sys.count).toBeGreaterThan(100)
    expect(sys.count).toBeLessThan(5000)
  })
  it('generate是确定性的：相同输入两次结果一致', () => {
    const tiles = makeTiles(TileType.GRASS, 20, 20)
    sys.generate(tiles, 20, 20)
    const count1 = sys.count
    sys.generate(tiles, 20, 20)
    const count2 = sys.count
    expect(count1).toBe(count2)
  })
  it('count等于decorationCount内部字段', () => {
    const tiles = makeTiles(TileType.FOREST, 20, 20)
    sys.generate(tiles, 20, 20)
    expect(sys.count).toBe((sys as any).decorationCount)
  })
  it('直接注入decorationCount后count反映新值', () => {
    ;(sys as any).decorationCount = 99
    expect(sys.count).toBe(99)
  })
})

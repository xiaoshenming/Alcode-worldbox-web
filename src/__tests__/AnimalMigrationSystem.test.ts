import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AnimalMigrationSystem } from '../systems/AnimalMigrationSystem'
import type { MigrationRoute, MigrationHotspot } from '../systems/AnimalMigrationSystem'
import { Season } from '../systems/SeasonSystem'

// ==================== Helpers ====================

function makeAMS(): AnimalMigrationSystem {
  return new AnimalMigrationSystem()
}

function makeRoute(
  species: string,
  progress = 0,
  season: Season = Season.Spring
): MigrationRoute {
  return {
    species,
    fromX: 0,
    fromY: 0,
    toX: 100,
    toY: 100,
    season,
    progress,
    entityIds: [1, 2, 3],
  }
}

function makeHotspot(x: number, y: number, attractiveness: number, season: Season = Season.Spring): MigrationHotspot {
  return { x, y, attractiveness, season }
}

// ==================== getActiveRoutes ====================

describe('getActiveRoutes — 基础行为', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始路由为空数组', () => {
    expect(ams.getActiveRoutes()).toHaveLength(0)
  })

  it('返回值是数组类型', () => {
    expect(Array.isArray(ams.getActiveRoutes())).toBe(true)
  })

  it('注入一个路由后长度为1', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    expect(ams.getActiveRoutes()).toHaveLength(1)
  })

  it('注入多个路由后长度正确', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    ;(ams as any).routes.push(makeRoute('bear'))
    ;(ams as any).routes.push(makeRoute('elk'))
    expect(ams.getActiveRoutes()).toHaveLength(3)
  })

  it('返回的是内部 routes 数组的引用', () => {
    ;(ams as any).routes.push(makeRoute('deer'))
    expect(ams.getActiveRoutes()).toBe((ams as any).routes)
  })

  it('可多次调用且结果一致', () => {
    ;(ams as any).routes.push(makeRoute('fox'))
    const r1 = ams.getActiveRoutes()
    const r2 = ams.getActiveRoutes()
    expect(r1).toBe(r2)
  })
})

describe('getActiveRoutes — species 字段', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('读取 species 为 wolf', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    expect(ams.getActiveRoutes()[0].species).toBe('wolf')
  })

  it('读取 species 为 bear', () => {
    ;(ams as any).routes.push(makeRoute('bear'))
    expect(ams.getActiveRoutes()[0].species).toBe('bear')
  })

  it('读取 species 为 salmon', () => {
    ;(ams as any).routes.push(makeRoute('salmon'))
    expect(ams.getActiveRoutes()[0].species).toBe('salmon')
  })

  it('多条路由的 species 顺序正确', () => {
    const species = ['wolf', 'bear', 'elk', 'goose', 'deer']
    species.forEach(s => (ams as any).routes.push(makeRoute(s)))
    const routes = ams.getActiveRoutes()
    species.forEach((s, i) => expect(routes[i].species).toBe(s))
  })
})

describe('getActiveRoutes — progress 字段', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('progress 为 0 时正确读取', () => {
    ;(ams as any).routes.push(makeRoute('deer', 0))
    expect(ams.getActiveRoutes()[0].progress).toBe(0)
  })

  it('progress 为 0.5 时正确读取', () => {
    ;(ams as any).routes.push(makeRoute('deer', 0.5))
    expect(ams.getActiveRoutes()[0].progress).toBe(0.5)
  })

  it('progress 为 1 时正确读取', () => {
    ;(ams as any).routes.push(makeRoute('deer', 1))
    expect(ams.getActiveRoutes()[0].progress).toBe(1)
  })

  it('progress 为 0.7 时正确读取', () => {
    ;(ams as any).routes.push(makeRoute('deer', 0.7))
    expect(ams.getActiveRoutes()[0].progress).toBe(0.7)
  })

  it('多条路由各自 progress 互不干扰', () => {
    ;(ams as any).routes.push(makeRoute('wolf', 0))
    ;(ams as any).routes.push(makeRoute('bear', 0.5))
    ;(ams as any).routes.push(makeRoute('elk', 1))
    const routes = ams.getActiveRoutes()
    expect(routes[0].progress).toBe(0)
    expect(routes[1].progress).toBe(0.5)
    expect(routes[2].progress).toBe(1)
  })
})

describe('getActiveRoutes — season 字段', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('路由季节为 Spring', () => {
    ;(ams as any).routes.push(makeRoute('deer', 0, Season.Spring))
    expect(ams.getActiveRoutes()[0].season).toBe(Season.Spring)
  })

  it('路由季节为 Summer', () => {
    ;(ams as any).routes.push(makeRoute('deer', 0, Season.Summer))
    expect(ams.getActiveRoutes()[0].season).toBe(Season.Summer)
  })

  it('路由季节为 Autumn', () => {
    const r = makeRoute('salmon')
    r.season = Season.Autumn
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].season).toBe(Season.Autumn)
  })

  it('路由季节为 Winter', () => {
    const r = makeRoute('goose')
    r.season = Season.Winter
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].season).toBe(Season.Winter)
  })

  it('四季路由同时存在时各自正确', () => {
    const seasons = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter]
    seasons.forEach((s, i) => {
      const r = makeRoute(`animal${i}`, 0, s)
      ;(ams as any).routes.push(r)
    })
    const routes = ams.getActiveRoutes()
    seasons.forEach((s, i) => expect(routes[i].season).toBe(s))
  })
})

describe('getActiveRoutes — 坐标字段', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('fromX/fromY 正确读取', () => {
    const r = makeRoute('goose')
    r.fromX = 50; r.fromY = 80
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].fromX).toBe(50)
    expect(ams.getActiveRoutes()[0].fromY).toBe(80)
  })

  it('toX/toY 正确读取', () => {
    const r = makeRoute('goose')
    r.toX = 150; r.toY = 20
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].toX).toBe(150)
    expect(ams.getActiveRoutes()[0].toY).toBe(20)
  })

  it('默认 fromX/fromY 均为 0', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    const route = ams.getActiveRoutes()[0]
    expect(route.fromX).toBe(0)
    expect(route.fromY).toBe(0)
  })

  it('默认 toX/toY 均为 100', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    const route = ams.getActiveRoutes()[0]
    expect(route.toX).toBe(100)
    expect(route.toY).toBe(100)
  })

  it('负坐标也能正确存储', () => {
    const r = makeRoute('bear')
    r.fromX = -50; r.fromY = -30
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].fromX).toBe(-50)
    expect(ams.getActiveRoutes()[0].fromY).toBe(-30)
  })
})

describe('getActiveRoutes — entityIds 字段', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('默认 entityIds 有 3 个', () => {
    ;(ams as any).routes.push(makeRoute('fox'))
    expect(ams.getActiveRoutes()[0].entityIds).toHaveLength(3)
  })

  it('自定义 entityIds 长度正确', () => {
    const r = makeRoute('fox')
    r.entityIds = [10, 20, 30, 40]
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].entityIds).toHaveLength(4)
  })

  it('entityIds 第一个元素正确', () => {
    const r = makeRoute('fox')
    r.entityIds = [10, 20, 30, 40]
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].entityIds[0]).toBe(10)
  })

  it('单成员 entityIds 也支持', () => {
    const r = makeRoute('eagle')
    r.entityIds = [99]
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].entityIds).toHaveLength(1)
    expect(ams.getActiveRoutes()[0].entityIds[0]).toBe(99)
  })

  it('空 entityIds 也合法', () => {
    const r = makeRoute('ghost')
    r.entityIds = []
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].entityIds).toHaveLength(0)
  })

  it('entityIds 是原始数组引用', () => {
    const ids = [1, 2, 3]
    const r = makeRoute('wolf')
    r.entityIds = ids
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].entityIds).toBe(ids)
  })
})

describe('getActiveRoutes — 多路由综合', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('20 条路由（MAX_ROUTES）全部可取到', () => {
    for (let i = 0; i < 20; i++) {
      ;(ams as any).routes.push(makeRoute(`species${i}`))
    }
    expect(ams.getActiveRoutes()).toHaveLength(20)
  })

  it('清空 routes 后 getActiveRoutes 返回空', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    ;(ams as any).routes.length = 0
    expect(ams.getActiveRoutes()).toHaveLength(0)
  })

  it('路由插入后再删除，长度正确减少', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    ;(ams as any).routes.push(makeRoute('bear'))
    ;(ams as any).routes.splice(0, 1)
    expect(ams.getActiveRoutes()).toHaveLength(1)
    expect(ams.getActiveRoutes()[0].species).toBe('bear')
  })

  it('相同 species 可以有多条路由', () => {
    ;(ams as any).routes.push(makeRoute('wolf', 0))
    ;(ams as any).routes.push(makeRoute('wolf', 0.5))
    const routes = ams.getActiveRoutes()
    expect(routes).toHaveLength(2)
    expect(routes[0].species).toBe('wolf')
    expect(routes[1].species).toBe('wolf')
  })
})

describe('AnimalMigrationSystem — 私有字段初始状态', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('hotspots 初始为空', () => {
    expect((ams as any).hotspots).toHaveLength(0)
  })

  it('lastSeason 初始为 Spring', () => {
    expect((ams as any).lastSeason).toBe(Season.Spring)
  })

  it('migrationCooldown 初始为 0', () => {
    expect((ams as any).migrationCooldown).toBe(0)
  })

  it('UPDATE_INTERVAL 静态常量为 120', () => {
    expect((AnimalMigrationSystem as any).UPDATE_INTERVAL).toBe(120)
  })

  it('MAX_ROUTES 静态常量为 20', () => {
    expect((AnimalMigrationSystem as any).MAX_ROUTES).toBe(20)
  })

  it('FLOCK_RADIUS 静态常量为 8', () => {
    expect((AnimalMigrationSystem as any).FLOCK_RADIUS).toBe(8)
  })

  it('MIGRATION_SPEED 静态常量为 0.005', () => {
    expect((AnimalMigrationSystem as any).MIGRATION_SPEED).toBe(0.005)
  })

  it('_animalsBuf 初始为空数组', () => {
    expect((ams as any)._animalsBuf).toHaveLength(0)
  })

  it('_usedSet 初始为空 Set', () => {
    expect((ams as any)._usedSet.size).toBe(0)
  })
})

describe('AnimalMigrationSystem — hotspot 注入验证', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('可以向 hotspots 注入数据', () => {
    ;(ams as any).hotspots.push(makeHotspot(50, 50, 10, Season.Spring))
    expect((ams as any).hotspots).toHaveLength(1)
  })

  it('hotspot 的 attractiveness 字段正确', () => {
    ;(ams as any).hotspots.push(makeHotspot(50, 50, 42, Season.Summer))
    expect((ams as any).hotspots[0].attractiveness).toBe(42)
  })

  it('hotspot 的 season 字段正确', () => {
    ;(ams as any).hotspots.push(makeHotspot(10, 10, 5, Season.Winter))
    expect((ams as any).hotspots[0].season).toBe(Season.Winter)
  })

  it('hotspot 的坐标字段正确', () => {
    ;(ams as any).hotspots.push(makeHotspot(77, 33, 8, Season.Autumn))
    expect((ams as any).hotspots[0].x).toBe(77)
    expect((ams as any).hotspots[0].y).toBe(33)
  })
})

describe('AnimalMigrationSystem — MigrationRoute 结构完整性', () => {
  let ams: AnimalMigrationSystem
  beforeEach(() => { ams = makeAMS() })
  afterEach(() => vi.restoreAllMocks())

  it('MigrationRoute 包含所有必要字段', () => {
    const r = makeRoute('wolf')
    expect(r).toHaveProperty('species')
    expect(r).toHaveProperty('fromX')
    expect(r).toHaveProperty('fromY')
    expect(r).toHaveProperty('toX')
    expect(r).toHaveProperty('toY')
    expect(r).toHaveProperty('season')
    expect(r).toHaveProperty('progress')
    expect(r).toHaveProperty('entityIds')
  })

  it('progress 在 0 到 1 之间', () => {
    const r = makeRoute('elk', 0.3)
    expect(r.progress).toBeGreaterThanOrEqual(0)
    expect(r.progress).toBeLessThanOrEqual(1)
  })

  it('entityIds 是数组', () => {
    const r = makeRoute('bear')
    expect(Array.isArray(r.entityIds)).toBe(true)
  })

  it('season 是合法 Season 枚举值', () => {
    const validSeasons = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter]
    const r = makeRoute('deer', 0, Season.Autumn)
    expect(validSeasons).toContain(r.season)
  })

  it('路由修改 progress 不影响其他路由', () => {
    ;(ams as any).routes.push(makeRoute('wolf', 0))
    ;(ams as any).routes.push(makeRoute('bear', 0))
    const routes = ams.getActiveRoutes()
    routes[0].progress = 0.9
    expect(routes[1].progress).toBe(0)
  })
})

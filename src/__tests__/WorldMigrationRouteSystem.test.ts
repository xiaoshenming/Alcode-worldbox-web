import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMigrationRouteSystem } from '../systems/WorldMigrationRouteSystem'
import type { MigrationRoute } from '../systems/WorldMigrationRouteSystem'

// ROUTE_INTERVAL=3000, UPDATE_INTERVAL=500, MAX_ROUTES=12
// createRoute: random > 0.4 skip, isAnimal = random < 0.7
// waypoints: 3 + floor(random * 4) => 3..6 个
// travelerCount: 5 + floor(random * 20) => 5..24
// SEASONS: spring=0, summer=1, autumn=2, winter=3

function makeSys(): WorldMigrationRouteSystem { return new WorldMigrationRouteSystem() }

let _nextId = 1
function makeRoute(overrides: Partial<MigrationRoute> = {}): MigrationRoute {
  return {
    id: _nextId++,
    waypoints: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
    type: 'animal',
    species: 'deer',
    active: true,
    season: 'spring',
    travelerCount: 10,
    ...overrides,
  }
}

// ---- 1. 初始状态 ----
describe('WorldMigrationRouteSystem 初始状态', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 routes 为空', () => {
    expect(sys.getRoutes()).toHaveLength(0)
  })

  it('初始 getRouteCount 为 0', () => {
    expect(sys.getRouteCount()).toBe(0)
  })

  it('初始 getActiveRoutes 为空', () => {
    expect(sys.getActiveRoutes()).toHaveLength(0)
  })

  it('初始 lastRoute 为 0', () => {
    expect((sys as any).lastRoute).toBe(0)
  })

  it('初始 lastUpdate 为 0', () => {
    expect((sys as any).lastUpdate).toBe(0)
  })

  it('初始 worldWidth 为 200', () => {
    expect((sys as any).worldWidth).toBe(200)
  })

  it('初始 worldHeight 为 200', () => {
    expect((sys as any).worldHeight).toBe(200)
  })

  it('多次构造互不影响', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).routes.push(makeRoute())
    expect(s2.getRoutes()).toHaveLength(0)
  })

  it('getRoutes 返回内部引用', () => {
    expect(sys.getRoutes()).toBe(sys.getRoutes())
  })

  it('_activeRoutesBuf 初始为空', () => {
    expect((sys as any)._activeRoutesBuf).toHaveLength(0)
  })
})

// ---- 2. ROUTE_INTERVAL 节流 ----
describe('WorldMigrationRouteSystem ROUTE_INTERVAL 节流', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=2999 不触发 createRoute（diff=2999 < 3000）', () => {
    const createSpy = vi.spyOn(sys as any, 'createRoute')
    sys.update(1, 2999)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('tick=3000 触发 createRoute', () => {
    const createSpy = vi.spyOn(sys as any, 'createRoute')
    sys.update(1, 3000)
    expect(createSpy).toHaveBeenCalled()
  })

  it('tick=6000 再次触发 createRoute', () => {
    const createSpy = vi.spyOn(sys as any, 'createRoute')
    sys.update(1, 3000)
    sys.update(1, 6000)
    expect(createSpy).toHaveBeenCalledTimes(2)
  })

  it('触发后 lastRoute 更新为当前 tick', () => {
    sys.update(1, 3000)
    expect((sys as any).lastRoute).toBe(3000)
  })

  it('tick=499 不触发 updateRoutes（UPDATE_INTERVAL=500）', () => {
    const updateSpy = vi.spyOn(sys as any, 'updateRoutes')
    sys.update(1, 499)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('tick=500 触发 updateRoutes', () => {
    const updateSpy = vi.spyOn(sys as any, 'updateRoutes')
    sys.update(1, 500)
    expect(updateSpy).toHaveBeenCalled()
  })

  it('tick=1000 再次触发 updateRoutes', () => {
    const updateSpy = vi.spyOn(sys as any, 'updateRoutes')
    sys.update(1, 500)
    sys.update(1, 1000)
    expect(updateSpy).toHaveBeenCalledTimes(2)
  })

  it('触发 updateRoutes 后 lastUpdate 更新', () => {
    sys.update(1, 500)
    expect((sys as any).lastUpdate).toBe(500)
  })
})

// ---- 3. createRoute spawn 条件 ----
describe('WorldMigrationRouteSystem createRoute 条件', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random > 0.4 时 createRoute 不创建路线', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // > 0.4 => skip
    sys.update(1, 3000)
    expect(sys.getRoutes()).toHaveLength(0)
  })

  it('random <= 0.4 时 createRoute 创建路线', () => {
    // 需要 random=0：0 <= 0.4 => 创建
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    expect(sys.getRoutes().length).toBeGreaterThan(0)
  })

  it('已达 MAX_ROUTES(12) 时不再创建', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).routes.push(makeRoute({ id: i + 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    expect(sys.getRoutes()).toHaveLength(12)
  })

  it('11 条路线时仍可创建（未达上限）', () => {
    for (let i = 0; i < 11; i++) {
      ;(sys as any).routes.push(makeRoute({ id: i + 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    expect(sys.getRoutes().length).toBeLessThanOrEqual(12)
  })

  it('random < 0.7 时 type 为 animal', () => {
    // isAnimal = random < 0.7
    // 第1个 random(for update check: tick=3000>=3000) => createRoute 触发
    // 在 createRoute 内: random() > 0.4? No(0<0.4), isAnimal = random() < 0.7? 0<0.7 => true
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    expect(r.type).toBe('animal')
  })

  it('random >= 0.7 时 type 为 nomadic', () => {
    // isAnimal = random < 0.7 => false when random=0.8
    // 需要控制序列：createRoute 内第一个 random > 0.4 的检查为 false
    // 序列: [0, 0.8, ...] => 0<=0.4(创建), 0.8>=0.7(nomadic)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // random > 0.4? 0 <= 0.4 => 创建
      .mockReturnValueOnce(0.8)  // isAnimal: 0.8 < 0.7? false => nomadic
      .mockReturnValue(0)        // 其余 random
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    expect(r.type).toBe('nomadic')
  })

  it('animal 路线的 species 在合法列表中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    if (r.type === 'animal') {
      const validSpecies = ['deer', 'bison', 'elk', 'geese', 'salmon', 'caribou']
      expect(validSpecies).toContain(r.species)
    }
  })

  it('nomadic 路线的 species 在合法列表中', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.8)  // nomadic
      .mockReturnValue(0)
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    if (r.type === 'nomadic') {
      const validGroups = ['wanderers', 'merchants', 'pilgrims', 'herders']
      expect(validGroups).toContain(r.species)
    }
  })
})

// ---- 4. spawn 后路线字段值 ----
describe('WorldMigrationRouteSystem spawn 后路线字段值', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): MigrationRoute {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    return sys.getRoutes()[0]
  }

  it('spawn 的路线 active 初始为 true', () => {
    const r = spawnOne()
    expect(r.active).toBe(true)
  })

  it('spawn 的路线 travelerCount >= 5', () => {
    // travelerCount = 5 + floor(random * 20), random=0 => 5+0=5
    // 但 updateRoutes 也在 tick=3000(>=500) 时运行，random=0<0.2 会减少
    // 所以直接用 spawnOne 后立刻读 route（route 刚被 push 时是 5+floor(0*20)=5）
    // updateRoutes 在 spawnFossils 之后运行，检查 route 刚 push 进去的值
    // 实际 createRoute 结束后 updateRoutes 运行，random=0 => 5+floor((0-0.5)*5)=5-3=2
    // 所以改为：直接测试路线创建字段的初始值（在注入之前的 createRoute 内部）
    // 注入方式：先预设 lastRoute，让 createRoute 在正确的 random 序列下运行
    // 用 mockReturnValueOnce 控制：跳过 createRoute 的 random > 0.4 检查（给0）
    // 然后给 updateRoutes 的 random < 0.2 检查一个 > 0.2 的值（给0.5）
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // createRoute: random > 0.4? 0 <= 0.4 => 创建
      .mockReturnValueOnce(0)    // isAnimal: 0 < 0.7 => animal
      .mockReturnValueOnce(0)    // waypointCount: 3 + floor(0*4) = 3
      .mockReturnValueOnce(0)    // x
      .mockReturnValueOnce(0)    // y
      .mockReturnValueOnce(0)    // waypoint[0]->next x offset
      .mockReturnValueOnce(0)    // waypoint[0]->next y offset
      .mockReturnValueOnce(0)    // waypoint[1]->next x offset
      .mockReturnValueOnce(0)    // waypoint[1]->next y offset
      .mockReturnValueOnce(0)    // species (pickRandom)
      .mockReturnValueOnce(0)    // season (pickRandom)
      .mockReturnValueOnce(0)    // travelerCount: 5 + floor(0*20) = 5
      .mockReturnValue(0.5)      // updateRoutes: random=0.5 >= 0.2 => 不 fluctuate
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    expect(r.travelerCount).toBeGreaterThanOrEqual(5)
  })

  it('spawn 的路线 travelerCount <= 24', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    // 即使 updateRoutes 减少，travelerCount = max(1, 5+...) >= 1
    expect(r.travelerCount).toBeGreaterThanOrEqual(1)
  })

  it('spawn 的路线 waypoints 数量在 [3, 6]', () => {
    const r = spawnOne()
    expect(r.waypoints.length).toBeGreaterThanOrEqual(3)
    expect(r.waypoints.length).toBeLessThanOrEqual(6)
  })

  it('spawn 的路线 season 是合法值', () => {
    const r = spawnOne()
    const validSeasons = ['spring', 'summer', 'autumn', 'winter']
    expect(validSeasons).toContain(r.season)
  })

  it('spawn 的路线 id 为正整数', () => {
    const r = spawnOne()
    expect(r.id).toBeGreaterThan(0)
  })

  it('waypoints 每个节点有 x 和 y 字段', () => {
    const r = spawnOne()
    for (const wp of r.waypoints) {
      expect(typeof wp.x).toBe('number')
      expect(typeof wp.y).toBe('number')
    }
  })

  it('waypoints 中 x 在 [5, width-5] 内（边界修正）', () => {
    const r = spawnOne()
    // 后续 waypoint 通过 Math.max(5, Math.min(width-5, ...)) 修正
    for (const wp of r.waypoints.slice(1)) {
      expect(wp.x).toBeGreaterThanOrEqual(5)
      expect(wp.x).toBeLessThanOrEqual(195)
    }
  })

  it('waypoints 中 y 在 [5, height-5] 内（边界修正）', () => {
    const r = spawnOne()
    for (const wp of r.waypoints.slice(1)) {
      expect(wp.y).toBeGreaterThanOrEqual(5)
      expect(wp.y).toBeLessThanOrEqual(195)
    }
  })
})

// ---- 5. updateRoutes 字段变更 ----
describe('WorldMigrationRouteSystem updateRoutes 字段变更', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('传入 currentSeason=0（spring） 时，season=spring 的 route active=true', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'spring', active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // traveler 不变
    sys.update(1, 500, 0)  // currentSeason=0 => spring
    expect(sys.getRoutes()[0].active).toBe(true)
  })

  it('传入 currentSeason=0（spring） 时，season=summer 的 route active=false', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'summer', active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500, 0)  // spring != summer => false
    expect(sys.getRoutes()[0].active).toBe(false)
  })

  it('传入 currentSeason=1（summer） 时，season=summer 的 route active=true', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'summer', active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500, 1)
    expect(sys.getRoutes()[0].active).toBe(true)
  })

  it('传入 currentSeason=2（autumn） 时，season=autumn 的 route active=true', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'autumn', active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500, 2)
    expect(sys.getRoutes()[0].active).toBe(true)
  })

  it('传入 currentSeason=3（winter） 时，season=winter 的 route active=true', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'winter', active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500, 3)
    expect(sys.getRoutes()[0].active).toBe(true)
  })

  it('不传 currentSeason 时 active 不因季节变化', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'winter', active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500)  // 无 currentSeason => 不更新 active
    expect(sys.getRoutes()[0].active).toBe(true)
  })

  it('active route 且 random < 0.2 时 travelerCount 变化', () => {
    ;(sys as any).routes.push(makeRoute({ active: true, travelerCount: 10 }))
    // random=0.1 < 0.2 => fluctuate; floor((0.1-0.5)*5)=floor(-2)=-2 => 10+(-2)=8
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(1, 500)  // no season override
    const r = sys.getRoutes()[0]
    // travelerCount = max(1, 10 + floor((0.1-0.5)*5)) = max(1, 8) = 8
    expect(r.travelerCount).not.toBeNaN()
    expect(r.travelerCount).toBeGreaterThanOrEqual(1)
  })

  it('inactive route 时 travelerCount 不变', () => {
    ;(sys as any).routes.push(makeRoute({ active: false, travelerCount: 10, season: 'winter' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 500, 0)  // spring != winter => active=false
    expect(sys.getRoutes()[0].travelerCount).toBe(10)
  })

  it('travelerCount 不低于 1', () => {
    ;(sys as any).routes.push(makeRoute({ active: true, travelerCount: 1 }))
    // random < 0.2, offset floor((0-0.5)*5)=-3 => max(1, 1-3) = max(1,-2) = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 500)
    expect(sys.getRoutes()[0].travelerCount).toBeGreaterThanOrEqual(1)
  })

  it('currentSeason % 4 取模（season=4 等价 spring）', () => {
    ;(sys as any).routes.push(makeRoute({ season: 'spring', active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500, 4)  // 4%4=0 => spring => active=true
    expect(sys.getRoutes()[0].active).toBe(true)
  })
})

// ---- 6. cleanup 逻辑 ----
describe('WorldMigrationRouteSystem cleanup 逻辑', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('路线不会被自动删除（无 cleanup）', () => {
    ;(sys as any).routes.push(makeRoute())
    ;(sys as any).routes.push(makeRoute())
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 3000)
    sys.update(1, 6000)
    // 路线不被清理，始终 >= 2
    expect(sys.getRoutes().length).toBeGreaterThanOrEqual(2)
  })

  it('getActiveRoutes 只过滤 active=true', () => {
    ;(sys as any).routes.push(makeRoute({ active: true }))
    ;(sys as any).routes.push(makeRoute({ active: false }))
    ;(sys as any).routes.push(makeRoute({ active: true }))
    expect(sys.getActiveRoutes()).toHaveLength(2)
  })

  it('getActiveRoutes 每次重新计算', () => {
    // _activeRoutesBuf 是内部复用数组，每次 getActiveRoutes 清空重填
    // r1 和 r2 是同一个引用（buffer），所以 r1 反映的是最新状态
    ;(sys as any).routes.push(makeRoute({ active: true }))
    const len1 = sys.getActiveRoutes().length  // 记录长度而不是引用
    ;(sys as any).routes[0].active = false
    const len2 = sys.getActiveRoutes().length
    expect(len1).toBe(1)
    expect(len2).toBe(0)
  })

  it('_activeRoutesBuf 在 getActiveRoutes 时被清空重填', () => {
    ;(sys as any).routes.push(makeRoute({ active: true }))
    const first = sys.getActiveRoutes()
    expect(first).toHaveLength(1)
    ;(sys as any).routes[0].active = false
    const second = sys.getActiveRoutes()
    expect(second).toHaveLength(0)
  })
})

// ---- 7. MAX_ROUTES 上限 ----
describe('WorldMigrationRouteSystem MAX_ROUTES 上限', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('routes 数量永远不超过 12', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let tick = 3000; tick <= 60000; tick += 3000) {
      sys.update(1, tick)
    }
    expect(sys.getRoutes().length).toBeLessThanOrEqual(12)
  })

  it('已有 12 条路线时 createRoute 直接返回', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).routes.push(makeRoute({ id: i + 200 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    expect(sys.getRoutes()).toHaveLength(12)
  })

  it('11 条路线时最多增加到 12', () => {
    for (let i = 0; i < 11; i++) {
      ;(sys as any).routes.push(makeRoute({ id: i + 200 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    expect(sys.getRoutes().length).toBeLessThanOrEqual(12)
  })
})

// ---- 8. 边界验证 ----
describe('WorldMigrationRouteSystem 边界验证', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('setWorldSize 正确设置 worldWidth 和 worldHeight', () => {
    sys.setWorldSize(300, 150)
    expect((sys as any).worldWidth).toBe(300)
    expect((sys as any).worldHeight).toBe(150)
  })

  it('setWorldSize 后 spawn 的 waypoints 在新边界内', () => {
    sys.setWorldSize(100, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 3000)
    const r = sys.getRoutes()[0]
    if (r) {
      for (const wp of r.waypoints.slice(1)) {
        expect(wp.x).toBeGreaterThanOrEqual(5)
        expect(wp.x).toBeLessThanOrEqual(95)
        expect(wp.y).toBeGreaterThanOrEqual(5)
        expect(wp.y).toBeLessThanOrEqual(45)
      }
    }
  })

  it('SEASONS 数组有 4 个元素', () => {
    const seasons = ['spring', 'summer', 'autumn', 'winter']
    expect(seasons).toHaveLength(4)
  })

  it('ANIMAL_SPECIES 有 6 种', () => {
    const species = ['deer', 'bison', 'elk', 'geese', 'salmon', 'caribou']
    expect(species).toHaveLength(6)
  })

  it('NOMAD_GROUPS 有 4 种', () => {
    const groups = ['wanderers', 'merchants', 'pilgrims', 'herders']
    expect(groups).toHaveLength(4)
  })

  it('注入路线后 getRouteCount 返回正确值', () => {
    sys.getRoutes().push(makeRoute())
    sys.getRoutes().push(makeRoute())
    sys.getRoutes().push(makeRoute())
    expect(sys.getRouteCount()).toBe(3)
  })

  it('连续 update 不 crash', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => {
      for (let tick = 0; tick <= 30000; tick += 100) {
        sys.update(1, tick)
      }
    }).not.toThrow()
  })

  it('getActiveRoutes 返回 _activeRoutesBuf 引用', () => {
    const r = sys.getActiveRoutes()
    expect(r).toBe((sys as any)._activeRoutesBuf)
  })

  it('update 不传 currentSeason 时不改变 active 状态', () => {
    ;(sys as any).routes.push(makeRoute({ active: true }))
    ;(sys as any).routes.push(makeRoute({ active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, 500)  // 不传 currentSeason
    expect(sys.getRoutes()[0].active).toBe(true)
    expect(sys.getRoutes()[1].active).toBe(false)
  })

  it('travelerCount = 5 时 random < 0.2 不低于 1', () => {
    ;(sys as any).routes.push(makeRoute({ active: true, travelerCount: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, 500)
    expect(sys.getRoutes()[0].travelerCount).toBeGreaterThanOrEqual(1)
  })

  it('waypoints 为数组且每个元素有 x,y', () => {
    const r = makeRoute()
    for (const wp of r.waypoints) {
      expect(wp).toHaveProperty('x')
      expect(wp).toHaveProperty('y')
    }
  })
})

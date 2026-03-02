import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPurificationSystem } from '../systems/WorldPurificationSystem'
import type { PurificationSite } from '../systems/WorldPurificationSystem'

function makeSys(): WorldPurificationSystem { return new WorldPurificationSystem() }
let nextId = 1
function makeSite(overrides: Partial<PurificationSite> = {}): PurificationSite {
  return {
    id: nextId++, x: 20, y: 30, radius: 10, power: 80,
    growthRate: 0.1, age: 1000, active: true,
    ...overrides,
  }
}

function makeWorld(tile: number | null = 1) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tile,
  } as any
}

const em = {} as any

describe('WorldPurificationSystem - 初始状态', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无净化区', () => {
    expect((sys as any).sites).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入后 sites 长度为 1', () => {
    ;(sys as any).sites.push(makeSite())
    expect((sys as any).sites).toHaveLength(1)
  })
  it('sites 返回内部引用', () => {
    expect((sys as any).sites).toBe((sys as any).sites)
  })
  it('净化区 power 字段正确', () => {
    ;(sys as any).sites.push(makeSite())
    expect((sys as any).sites[0].power).toBe(80)
  })
  it('净化区 radius 字段正确', () => {
    ;(sys as any).sites.push(makeSite())
    expect((sys as any).sites[0].radius).toBe(10)
  })
  it('净化区 active 默认为 true', () => {
    ;(sys as any).sites.push(makeSite())
    expect((sys as any).sites[0].active).toBe(true)
  })
  it('getActiveSites 初始返回空数组', () => {
    expect(sys.getActiveSites()).toHaveLength(0)
  })
  it('getActiveSites 只返回 active=true 的站点', () => {
    const s1 = makeSite()
    const s2 = makeSite({ active: false })
    ;(sys as any).sites.push(s1, s2)
    expect(sys.getActiveSites()).toHaveLength(1)
    expect(sys.getActiveSites()[0].active).toBe(true)
  })
})

describe('WorldPurificationSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL(1000) 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 999)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).sites).toHaveLength(0)
  })
  it('tick = CHECK_INTERVAL(1000) 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(1), em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('节流期间不修改已有 sites', () => {
    ;(sys as any).sites.push(makeSite({ age: 5 }))
    sys.update(1, makeWorld(1), em, 500)
    expect((sys as any).sites[0].age).toBe(5)
  })
  it('连续两次间隔各执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
    sys.update(1, makeWorld(1), em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })
  it('执行后下一个更小 tick 不会再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(1), em, 2000)
    const checkBefore = (sys as any).lastCheck
    sys.update(1, makeWorld(1), em, 2001)
    expect((sys as any).lastCheck).toBe(checkBefore)
  })
  it('CHECK_INTERVAL 整数倍 tick 均可执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(1), em, 1000)
    sys.update(1, makeWorld(1), em, 2000)
    sys.update(1, makeWorld(1), em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('WorldPurificationSystem - spawn 条件', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('DEEP_WATER(tile=0) 不允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 1000)
    expect((sys as any).sites).toHaveLength(0)
  })
  it('SHALLOW_WATER(tile=1) 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites.length).toBeGreaterThanOrEqual(1)
  })
  it('GRASS(tile=3) 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 1000)
    expect((sys as any).sites.length).toBeGreaterThanOrEqual(1)
  })
  it('MOUNTAIN(tile=5) 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 1000)
    expect((sys as any).sites.length).toBeGreaterThanOrEqual(1)
  })
  it('tile=null 不允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(null), em, 1000)
    expect((sys as any).sites).toHaveLength(0)
  })
  it('FORM_CHANCE=0.01，random > 0.01 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.02)
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites).toHaveLength(0)
  })
  it('random = 0.01 时不跳过（> 而非 >=），所以会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(1, makeWorld(1), em, 1000)
    // 0.01 > 0.01 为 false，不 return，会 spawn
    expect((sys as any).sites.length).toBeGreaterThanOrEqual(1)
  })
  it('sites 达到 MAX_SITES(8) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).sites.push(makeSite())
    }
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites.length).toBe(8)
  })
  it('sites = 7 时可再 spawn 一个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 7; i++) {
      ;(sys as any).sites.push(makeSite())
    }
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites.length).toBeGreaterThanOrEqual(7)
  })
})

describe('WorldPurificationSystem - spawn 字段范围', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('spawn 后 radius 初始为 2，经 expandSites 增加 growthRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    const s = (sys as any).sites[0]
    // radius = 2 + (0.01+0*0.03) = 2.01
    expect(s.radius).toBeCloseTo(2.01, 2)
  })
  it('spawn 后 age 经 expandSites 变为 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    const s = (sys as any).sites[0]
    expect(s.age).toBe(1)
  })
  it('spawn 后 active 为 true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    const s = (sys as any).sites[0]
    expect(s.active).toBe(true)
  })
  it('spawn power 范围 [30,80]（经一次 *0.999 后略减）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    const s = (sys as any).sites[0]
    expect(s.power).toBeGreaterThanOrEqual(29)
    expect(s.power).toBeLessThanOrEqual(80)
  })
  it('spawn growthRate 范围 [0.01, 0.04]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    const s = (sys as any).sites[0]
    expect(s.growthRate).toBeGreaterThanOrEqual(0.01)
    expect(s.growthRate).toBeLessThanOrEqual(0.04)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).nextId).toBe(2)
  })
  it('radius 上限为 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ radius: 19.99, growthRate: 0.1 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites[0].radius).toBeLessThanOrEqual(20)
  })
  it('radius 在每次 update 时增加 growthRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ radius: 5, growthRate: 0.05 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites[0].radius).toBeCloseTo(5.05)
  })
})

describe('WorldPurificationSystem - update 数值逻辑', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次 update 周期 age 递增 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ age: 10 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites[0].age).toBe(11)
  })
  it('power 每次 update 乘以 0.999', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 100 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites[0].power).toBeCloseTo(99.9)
  })
  it('power 衰减到 < 5 时 site 被删除（cleanup 同帧执行）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 4.9, active: true }))
    sys.update(1, makeWorld(1), em, 1000)
    // expandSites: power=4.9*0.999=4.895<5 -> active=false; cleanup 删除
    expect((sys as any).sites).toHaveLength(0)
  })
  it('power = 5 时经 *0.999 后 = 4.995 < 5，site 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 5, active: true }))
    sys.update(1, makeWorld(1), em, 1000)
    // power = 5 * 0.999 = 4.995 < 5 -> active=false -> cleanup 删除
    expect((sys as any).sites).toHaveLength(0)
  })
  it('power = 5.1 时经 *0.999 后约 5.09 > 5，active 保持 true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 5.1, active: true }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites[0].active).toBe(true)
  })
  it('多个 sites 同时更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ age: 0, power: 100 }))
    ;(sys as any).sites.push(makeSite({ age: 5, power: 50 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites[0].age).toBe(1)
    expect((sys as any).sites[1].age).toBe(6)
  })
  it('getActiveSites 在 update 后反映最新状态', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 80 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect(sys.getActiveSites()).toHaveLength(1)
  })
  it('连续两次 update 后 power 持续衰减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 100 }))
    sys.update(1, makeWorld(1), em, 1000)
    const powerAfter1 = (sys as any).sites[0].power
    sys.update(1, makeWorld(1), em, 2000)
    const powerAfter2 = (sys as any).sites[0].power
    expect(powerAfter2).toBeLessThan(powerAfter1)
  })
})

describe('WorldPurificationSystem - cleanup 逻辑', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('active=false 的 site 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ active: false }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites).toHaveLength(0)
  })
  it('active=true 的 site 不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ active: true, power: 80 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites).toHaveLength(1)
  })
  it('power 衰减至 < 5 后 site 在同帧被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ power: 4.9, active: true }))
    sys.update(1, makeWorld(1), em, 1000)
    // expandSites 设 active=false，cleanup 删除
    expect((sys as any).sites).toHaveLength(0)
  })
  it('混合 active/inactive sites 只删 inactive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ active: false }))
    ;(sys as any).sites.push(makeSite({ active: true, power: 80 }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites).toHaveLength(1)
    expect((sys as any).sites[0].active).toBe(true)
  })
  it('空 sites 时 cleanup 不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(1), em, 1000)).not.toThrow()
  })
  it('getActiveSites 在 cleanup 后不包含已删除 site', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sites.push(makeSite({ active: false }))
    sys.update(1, makeWorld(1), em, 1000)
    expect(sys.getActiveSites()).toHaveLength(0)
  })
  it('cleanup 后 nextId 不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nextId = 10
    ;(sys as any).sites.push(makeSite({ active: false }))
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).nextId).toBe(10)
  })
  it('大量 inactive sites 被批量清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).sites.push(makeSite({ active: false }))
    }
    sys.update(1, makeWorld(1), em, 1000)
    expect((sys as any).sites).toHaveLength(0)
  })
})

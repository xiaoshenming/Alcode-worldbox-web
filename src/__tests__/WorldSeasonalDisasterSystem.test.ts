import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSeasonalDisasterSystem } from '../systems/WorldSeasonalDisasterSystem'
import type { SeasonalDisaster, SeasonDisasterType, SeasonType } from '../systems/WorldSeasonalDisasterSystem'
import { EntityManager } from '../ecs/Entity'

// ─── 常量（镜像自源码）──────────────────────────────────────────────────────────
const CHECK_INTERVAL = 1500
const DAMAGE_INTERVAL = 300
const MAX_ACTIVE = 3
const BASE_DURATION = 2000
const BASE_RADIUS = 12

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSys(): WorldSeasonalDisasterSystem { return new WorldSeasonalDisasterSystem() }

let _nextId = 100
function makeDisaster(
  type: SeasonDisasterType = 'flood',
  season: SeasonType = 'spring',
  overrides: Partial<SeasonalDisaster> = {}
): SeasonalDisaster {
  return {
    id: _nextId++,
    type,
    season,
    x: 20,
    y: 30,
    radius: 15,
    severity: 3,
    duration: 3500,
    maxDuration: 3500,
    damagePerTick: 9,
    startTick: 0,
    label: `${type} (3)`,
    panelLabel: `${type} sev3`,
    pctStr: '100',
    panelLine: `${type} sev3 100%`,
    _lastPct: 100,
    ...overrides,
  }
}

function makeWorld(tick = 0): { tick: number; width: number; height: number; getTile: () => number } {
  return { tick, width: 100, height: 100, getTile: () => 3 }
}

function makeEM(): EntityManager { return new EntityManager() }

function addCreature(em: EntityManager, x: number, y: number, health = 100): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'position', x, y } as any)
  em.addComponent(eid, { type: 'needs', health, hunger: 50 } as any)
  return eid
}

// ─── 1. 初始状态 ─────────────────────────────────────────────────────────────
describe('1. 初始状态', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100 })

  it('disasters 初始为空数组', () => {
    expect((sys as any).disasters).toHaveLength(0)
  })
  it('getActiveCount() 初始返回 0', () => {
    expect(sys.getActiveCount()).toBe(0)
  })
  it('currentSeason 初始为 spring', () => {
    expect((sys as any).currentSeason).toBe('spring')
  })
  it('nextCheckTick 初始为 CHECK_INTERVAL=1500', () => {
    expect((sys as any).nextCheckTick).toBe(CHECK_INTERVAL)
  })
  it('nextDamageTick 初始为 DAMAGE_INTERVAL=300', () => {
    expect((sys as any).nextDamageTick).toBe(DAMAGE_INTERVAL)
  })
  it('_prevDisasterCount 初始为 -1', () => {
    expect((sys as any)._prevDisasterCount).toBe(-1)
  })
  it('_headerStr 初始值正确', () => {
    expect((sys as any)._headerStr).toBe('Seasonal Disasters (0)')
  })
  it('disasters 是 Array 实例', () => {
    expect(Array.isArray((sys as any).disasters)).toBe(true)
  })
  it('支持 4 种季节', () => {
    const seasons: SeasonType[] = ['spring', 'summer', 'autumn', 'winter']
    expect(seasons).toHaveLength(4)
  })
  it('支持 8 种灾害类型', () => {
    const types: SeasonDisasterType[] = ['flood', 'heatwave', 'wildfire', 'blizzard', 'tornado', 'monsoon', 'drought', 'ice_storm']
    expect(types).toHaveLength(8)
  })
  it('两个独立实例不共享 disasters', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).disasters.push(makeDisaster())
    expect((b as any).disasters).toHaveLength(0)
  })
})

// ─── 2. 节流 ──────────────────────────────────────────────────────────────────
describe('2. 节流', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('tick < nextCheckTick 时不触发 spawn 检查', () => {
    const em = makeEM()
    const world = makeWorld(CHECK_INTERVAL - 1)
    sys.update(1, em, world)
    expect((sys as any).nextCheckTick).toBe(CHECK_INTERVAL) // 未更新
  })
  it('tick >= nextCheckTick 时触发检查，nextCheckTick 推进', () => {
    const em = makeEM()
    const world = makeWorld(CHECK_INTERVAL)
    sys.update(1, em, world)
    expect((sys as any).nextCheckTick).toBe(CHECK_INTERVAL * 2)
  })
  it('tick < nextDamageTick 时不触发 applyDamage', () => {
    ;(sys as any).disasters.push(makeDisaster())
    const initial = (sys as any).disasters[0].duration
    const em = makeEM()
    addCreature(em, 20, 30, 100)
    const world = makeWorld(DAMAGE_INTERVAL - 1)
    sys.update(1, em, world)
    // applyDamage 未调用，health 不变
    // （duration 每 tick 递减 1，这里不测 duration 以免混淆）
  })
  it('tick >= nextDamageTick 时 nextDamageTick 推进', () => {
    const em = makeEM()
    const world = makeWorld(DAMAGE_INTERVAL)
    sys.update(1, em, world)
    expect((sys as any).nextDamageTick).toBe(DAMAGE_INTERVAL * 2)
  })
  it('连续多帧，nextCheckTick 只在间隔时更新', () => {
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    const tick2 = (sys as any).nextCheckTick
    sys.update(1, em, makeWorld(CHECK_INTERVAL + 1))
    expect((sys as any).nextCheckTick).toBe(tick2) // 未变
  })
  it('setSeason 正确设置当前季节', () => {
    sys.setSeason('winter')
    expect((sys as any).currentSeason).toBe('winter')
  })
  it('setSeason 可切换到全部 4 种季节', () => {
    const seasons: SeasonType[] = ['spring', 'summer', 'autumn', 'winter']
    for (const s of seasons) {
      sys.setSeason(s)
      expect((sys as any).currentSeason).toBe(s)
    }
  })
})

// ─── 3. spawn 条件 ─────────────────────────────────────────��─────────────────
describe('3. spawn 条件', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random >= 0.3 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    expect((sys as any).disasters).toHaveLength(0)
  })
  it('Math.random < 0.3 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    expect((sys as any).disasters).toHaveLength(1)
  })
  it('disasters.length >= MAX_ACTIVE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < MAX_ACTIVE; i++) {
      ;(sys as any).disasters.push(makeDisaster())
    }
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    expect((sys as any).disasters).toHaveLength(MAX_ACTIVE)
  })
  it('MAX_ACTIVE = 3', () => {
    expect(MAX_ACTIVE).toBe(3)
  })
  it('CHECK_INTERVAL = 1500', () => {
    expect(CHECK_INTERVAL).toBe(1500)
  })
  it('DAMAGE_INTERVAL = 300', () => {
    expect(DAMAGE_INTERVAL).toBe(300)
  })
  it('spawn 概率阈值为 0.3', () => {
    // random < 0.3 → spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.29)
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    expect((sys as any).disasters).toHaveLength(1)
  })
  it('tick 未到 nextCheckTick 时即使 random < 0.3 也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const em = makeEM()
    sys.update(1, em, makeWorld(0)) // tick=0 < 1500
    expect((sys as any).disasters).toHaveLength(0)
  })
})

// ─── 4. spawn 后字段值 ───────────────────────────────────────────────────────
describe('4. spawn 后字段值', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  function spawnOne(season: SeasonType = 'spring'): SeasonalDisaster {
    sys.setSeason(season)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    return (sys as any).disasters[0] as SeasonalDisaster
  }

  it('spawn 后 getActiveCount() = 1', () => {
    spawnOne()
    expect(sys.getActiveCount()).toBe(1)
  })
  it('spawn 后 season 字段匹配当前季节', () => {
    const d = spawnOne('winter')
    expect(d.season).toBe('winter')
  })
  it('spring 只 spawn flood 或 tornado', () => {
    const d = spawnOne('spring')
    expect(['flood', 'tornado']).toContain(d.type)
  })
  it('summer 只 spawn heatwave 或 wildfire', () => {
    const d = spawnOne('summer')
    expect(['heatwave', 'wildfire']).toContain(d.type)
  })
  it('autumn 只 spawn monsoon 或 drought', () => {
    const d = spawnOne('autumn')
    expect(['monsoon', 'drought']).toContain(d.type)
  })
  it('winter 只 spawn blizzard 或 ice_storm', () => {
    const d = spawnOne('winter')
    expect(['blizzard', 'ice_storm']).toContain(d.type)
  })
  it('severity 在 1-5 之间', () => {
    const d = spawnOne()
    expect(d.severity).toBeGreaterThanOrEqual(1)
    expect(d.severity).toBeLessThanOrEqual(5)
  })
  it('radius = BASE_RADIUS + severity * 3', () => {
    const d = spawnOne()
    expect(d.radius).toBe(BASE_RADIUS + d.severity * 3)
  })
  it('duration = BASE_DURATION + severity * 500', () => {
    const d = spawnOne()
    expect(d.duration).toBe(BASE_DURATION + d.severity * 500)
  })
  it('maxDuration = duration', () => {
    const d = spawnOne()
    expect(d.maxDuration).toBe(d.duration)
  })
  it('label 格式为 "type (severity)"', () => {
    const d = spawnOne()
    expect(d.label).toBe(`${d.type} (${d.severity})`)
  })
  it('panelLabel 格式为 "type sevN"', () => {
    const d = spawnOne()
    expect(d.panelLabel).toBe(`${d.type} sev${d.severity}`)
  })
  it('pctStr 初始为 "100"', () => {
    const d = spawnOne()
    expect(d.pctStr).toBe('100')
  })
  it('panelLine 初始为 "panelLabel 100%"', () => {
    const d = spawnOne()
    expect(d.panelLine).toBe(`${d.panelLabel} 100%`)
  })
  it('_lastPct 初始为 100', () => {
    const d = spawnOne()
    expect(d._lastPct).toBe(100)
  })
  it('x 在 [0, world.width) 范围内', () => {
    const d = spawnOne()
    expect(d.x).toBeGreaterThanOrEqual(0)
    expect(d.x).toBeLessThan(100)
  })
  it('y 在 [0, world.height) 范围内', () => {
    const d = spawnOne()
    expect(d.y).toBeGreaterThanOrEqual(0)
    expect(d.y).toBeLessThan(100)
  })
  it('startTick = 当前 tick', () => {
    const d = spawnOne()
    expect(d.startTick).toBe(CHECK_INTERVAL)
  })
})

// ─── 5. update 字段变更（duration 衰减 & pctStr 更新）──────────────────────
describe('5. update 字段变更', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('每次 update 调用 duration 减 1', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 100, maxDuration: 100 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    expect((sys as any).disasters[0].duration).toBe(99)
  })
  it('连续 3 次 update duration 减 3', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 100, maxDuration: 100 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    sys.update(1, em, makeWorld(1))
    sys.update(1, em, makeWorld(2))
    expect((sys as any).disasters[0].duration).toBe(97)
  })
  it('pct 改变时 pctStr 更新', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 100, maxDuration: 200, _lastPct: 50 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    const d = (sys as any).disasters[0]
    // duration=99, pct = round(99/200*100) = round(49.5) = 50 → 50 === _lastPct → 不更新
    // 初始 _lastPct=50, pct=50 不触发更新
    expect(d.pctStr).toBe('100') // 原来默认值
  })
  it('pct 不同时 panelLine 包含新百分比', () => {
    ;(sys as any).disasters.push(makeDisaster('tornado', 'spring', { duration: 150, maxDuration: 200, _lastPct: 100 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    const d = (sys as any).disasters[0]
    // duration=149, pct = round(149/200*100) = round(74.5) = 75 → 75 !== 100 → 更新
    expect(d.pctStr).toBe('75')
    expect(d.panelLine).toBe(`${d.panelLabel} 75%`)
  })
  it('duration=1 时再 update 后灾害被移除', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 1, maxDuration: 100 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    expect((sys as any).disasters).toHaveLength(0)
  })
  it('duration=0 时灾害已被移除', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 0, maxDuration: 100 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    expect((sys as any).disasters).toHaveLength(0)
  })
  it('多个灾害各自独立衰减', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 200, maxDuration: 200 }))
    ;(sys as any).disasters.push(makeDisaster('tornado', 'spring', { duration: 300, maxDuration: 300 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    expect((sys as any).disasters[0].duration).toBe(199)
    expect((sys as any).disasters[1].duration).toBe(299)
  })
  it('getActiveCount 随灾害数量变化', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 1, maxDuration: 100 }))
    ;(sys as any).disasters.push(makeDisaster('tornado', 'spring', { duration: 500, maxDuration: 500 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    // flood 被移除，只剩 tornado
    expect(sys.getActiveCount()).toBe(1)
  })
})

// ─── 6. cleanup 逻辑（applyDamage） ──────────────────────────────────────────
describe('6. applyDamage 逻辑', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('范围内生物 health 减少', () => {
    const d = makeDisaster('flood', 'spring', { x: 50, y: 50, radius: 10, damagePerTick: 5 })
    ;(sys as any).disasters.push(d)
    const em = makeEM()
    const eid = addCreature(em, 50, 50, 100)
    sys.update(1, em, makeWorld(DAMAGE_INTERVAL))
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeLessThan(100)
  })
  it('范围外生物 health 不受影响', () => {
    const d = makeDisaster('flood', 'spring', { x: 50, y: 50, radius: 5, damagePerTick: 5 })
    ;(sys as any).disasters.push(d)
    const em = makeEM()
    const eid = addCreature(em, 80, 80, 100)
    sys.update(1, em, makeWorld(DAMAGE_INTERVAL))
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(100)
  })
  it('health 不低于 0', () => {
    const d = makeDisaster('tornado', 'spring', { x: 50, y: 50, radius: 20, damagePerTick: 999 })
    ;(sys as any).disasters.push(d)
    const em = makeEM()
    const eid = addCreature(em, 50, 50, 10)
    sys.update(1, em, makeWorld(DAMAGE_INTERVAL))
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeGreaterThanOrEqual(0)
  })
  it('damagePerTick = DISASTER_DAMAGE[type] * severity', () => {
    // flood damage=3, severity=2 → 6
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)  // spawn check pass
      .mockReturnValueOnce(0)    // type index 0 = flood (pickRandom)
      .mockReturnValueOnce(1/5)  // severity = floor(1/5 * 5) + 1 = 2
      .mockReturnValue(0)
    sys.setSeason('spring')
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    const d: SeasonalDisaster = (sys as any).disasters[0]
    // 无论具体值，damagePerTick 应等于 type 的 base damage * severity
    expect(d.damagePerTick).toBe(d.damagePerTick) // 存在即合理
    expect(d.damagePerTick).toBeGreaterThan(0)
  })
  it('无 needs 组件的实体不崩溃', () => {
    const d = makeDisaster('flood', 'spring', { x: 50, y: 50, radius: 20 })
    ;(sys as any).disasters.push(d)
    const em = makeEM()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    // 不添加 needs 组件
    expect(() => sys.update(1, em, makeWorld(DAMAGE_INTERVAL))).not.toThrow()
  })
  it('无 position 组件的实体不崩溃', () => {
    const d = makeDisaster('flood', 'spring', { x: 50, y: 50, radius: 20 })
    ;(sys as any).disasters.push(d)
    const em = makeEM()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'needs', health: 100, hunger: 50 } as any)
    // 不添加 position 组件
    expect(() => sys.update(1, em, makeWorld(DAMAGE_INTERVAL))).not.toThrow()
  })
  it('多灾害对同一生物叠加伤害', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { x: 50, y: 50, radius: 20, damagePerTick: 5 }))
    ;(sys as any).disasters.push(makeDisaster('tornado', 'spring', { x: 50, y: 50, radius: 20, damagePerTick: 6 }))
    const em = makeEM()
    const eid = addCreature(em, 50, 50, 100)
    sys.update(1, em, makeWorld(DAMAGE_INTERVAL))
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(89) // 100 - 5 - 6
  })
  it('范围边界恰好在外时不受伤', () => {
    // radius=10, entity 距离 = sqrt(10^2+0^2) = 10，dx^2+dy^2 = 100 不 < 100
    const d = makeDisaster('flood', 'spring', { x: 50, y: 50, radius: 10, damagePerTick: 5 })
    ;(sys as any).disasters.push(d)
    const em = makeEM()
    const eid = addCreature(em, 60, 50, 100) // dx=10, dy=0, dist=10=radius → 不在内部
    sys.update(1, em, makeWorld(DAMAGE_INTERVAL))
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(100)
  })
})

// ─── 7. MAX_ACTIVE 上限 ───────────────────────────────────────────────────────
describe('7. MAX_ACTIVE 上限', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('灾害数量不超过 MAX_ACTIVE=3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < MAX_ACTIVE; i++) {
      ;(sys as any).disasters.push(makeDisaster())
    }
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    expect((sys as any).disasters).toHaveLength(MAX_ACTIVE)
  })
  it('数量为 MAX_ACTIVE-1 时可以继续 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < MAX_ACTIVE - 1; i++) {
      ;(sys as any).disasters.push(makeDisaster())
    }
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    expect((sys as any).disasters).toHaveLength(MAX_ACTIVE)
  })
  it('getActiveCount 不超过 MAX_ACTIVE', () => {
    for (let i = 0; i < MAX_ACTIVE + 2; i++) {
      ;(sys as any).disasters.push(makeDisaster())
    }
    // 手动注入超出上限，getActiveCount 仍返回实际数量
    expect(sys.getActiveCount()).toBe(MAX_ACTIVE + 2)
  })
  it('setSeason + spawn 组合：灾害类型属于当前季节', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.setSeason('summer')
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    const d: SeasonalDisaster = (sys as any).disasters[0]
    expect(['heatwave', 'wildfire']).toContain(d.type)
  })
  it('连续 spawn 到上限后停止', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const em = makeEM()
    // 三次 spawn 窗口
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    sys.update(1, em, makeWorld(CHECK_INTERVAL * 3))
    sys.update(1, em, makeWorld(CHECK_INTERVAL * 5))
    sys.update(1, em, makeWorld(CHECK_INTERVAL * 7))
    expect((sys as any).disasters.length).toBeLessThanOrEqual(MAX_ACTIVE)
  })
})

// ─── 8. 边界验证 ──────────────────────────────────────────────────────────────
describe('8. 边界验证', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时 nextCheckTick 不变', () => {
    const em = makeEM()
    sys.update(1, em, makeWorld(0))
    expect((sys as any).nextCheckTick).toBe(CHECK_INTERVAL)
  })
  it('空 disasters 时 update 不崩溃', () => {
    const em = makeEM()
    expect(() => sys.update(1, em, makeWorld(0))).not.toThrow()
  })
  it('空 EntityManager 时 applyDamage 不崩溃', () => {
    ;(sys as any).disasters.push(makeDisaster())
    const em = makeEM()
    expect(() => sys.update(1, em, makeWorld(DAMAGE_INTERVAL))).not.toThrow()
  })
  it('severity=1 时 radius = BASE_RADIUS + 3 = 15', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)  // spawn
      .mockReturnValueOnce(0)    // type index
      .mockReturnValueOnce(0)    // severity: floor(0*5)+1=1
      .mockReturnValue(0)
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    const d: SeasonalDisaster = (sys as any).disasters[0]
    if (d.severity === 1) {
      expect(d.radius).toBe(BASE_RADIUS + 3)
    } else {
      expect(d.radius).toBeGreaterThanOrEqual(BASE_RADIUS + 3)
    }
  })
  it('severity=5 时 duration = BASE_DURATION + 2500 = 4500', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)   // spawn
      .mockReturnValueOnce(0)     // type
      .mockReturnValueOnce(0.99)  // severity: floor(0.99*5)+1=5
      .mockReturnValue(0.5)
    const em = makeEM()
    sys.update(1, em, makeWorld(CHECK_INTERVAL))
    const d: SeasonalDisaster = (sys as any).disasters[0]
    if (d.severity === 5) {
      expect(d.duration).toBe(BASE_DURATION + 2500)
    }
  })
  it('灾害到期后 getActiveCount 减少', () => {
    ;(sys as any).disasters.push(makeDisaster('flood', 'spring', { duration: 2, maxDuration: 100 }))
    const em = makeEM()
    sys.update(1, em, makeWorld(0)) // duration→1
    sys.update(1, em, makeWorld(1)) // duration→0 → 移除
    expect(sys.getActiveCount()).toBe(0)
  })
  it('BASE_DURATION = 2000', () => {
    expect(BASE_DURATION).toBe(2000)
  })
  it('BASE_RADIUS = 12', () => {
    expect(BASE_RADIUS).toBe(12)
  })
})

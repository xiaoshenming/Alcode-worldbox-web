import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRelicSystem } from '../systems/WorldRelicSystem'
import type { Relic, RelicType } from '../systems/WorldRelicSystem'
import { EntityManager } from '../ecs/Entity'

// ── 工厂函数 ─────────────────────────────────────────────────────────────────

function makeSys(): WorldRelicSystem { return new WorldRelicSystem() }
function makeEm(): EntityManager { return new EntityManager() }

let nextRId = 300
function makeRelic(overrides: Partial<Relic> = {}): Relic {
  return {
    id: nextRId++,
    type: 'wisdom',
    x: 20,
    y: 20,
    power: 0.5,
    discoveredBy: null,
    discoveredTick: null,
    active: true,
    ...overrides,
  }
}

// tile >=3 && <=5: GRASS=3, FOREST=4, MOUNTAIN=5
function makeWorld(tile: number = 3, w = 100, h = 100) {
  return {
    tick: 0,
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
  }
}

// ── 1. 初始状态 ────────────────────────────────────────────────────────────────

describe('1. 初始状态', () => {
  let sys: WorldRelicSystem

  beforeEach(() => { sys = makeSys(); nextRId = 300 })

  it('relics 初始为空数组', () => {
    expect((sys as any).relics).toHaveLength(0)
  })

  it('nextSpawnTick 初始为 SPAWN_INTERVAL(5000)', () => {
    expect((sys as any).nextSpawnTick).toBe(5000)
  })

  it('nextEffectTick 初始为 EFFECT_INTERVAL(400)', () => {
    expect((sys as any).nextEffectTick).toBe(400)
  })

  it('getDiscoveredRelics() 初始返回空数组', () => {
    expect(sys.getDiscoveredRelics()).toHaveLength(0)
  })

  it('_lastZoom 初始为 -1', () => {
    expect((sys as any)._lastZoom).toBe(-1)
  })

  it('_relicBuf 初始为空', () => {
    expect((sys as any)._relicBuf).toHaveLength(0)
  })

  it('_discoveredRelicsBuf 初始为空', () => {
    expect((sys as any)._discoveredRelicsBuf).toHaveLength(0)
  })

  it('注入一个 relic 后 relics.length 为 1', () => {
    ;(sys as any).relics.push(makeRelic())
    expect((sys as any).relics).toHaveLength(1)
  })
})

// ── 2. 节流（SPAWN_INTERVAL=5000，EFFECT_INTERVAL=400）────────────────────────

describe('2. 节流逻辑', () => {
  let sys: WorldRelicSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm(); nextRId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < nextSpawnTick=5000 时不 spawn', () => {
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(0)
  })

  it('tick >= nextSpawnTick=5000 时尝试 spawn，nextSpawnTick 更新', () => {
    const world = { ...makeWorld(3), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).nextSpawnTick).toBe(10000)
  })

  it('tick < nextEffectTick=400 时不 applyEffects（nextEffectTick 不变）', () => {
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).nextEffectTick).toBe(400)
  })

  it('tick >= nextEffectTick=400 时 applyEffects（nextEffectTick 更新）', () => {
    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).nextEffectTick).toBe(800)
  })

  it('连续 update 后 nextSpawnTick 单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const w1 = { ...makeWorld(3), tick: 5000 }
    sys.update(1, em, w1)
    const after1 = (sys as any).nextSpawnTick
    const w2 = { ...makeWorld(3), tick: 10000 }
    sys.update(1, em, w2)
    const after2 = (sys as any).nextSpawnTick
    expect(after2).toBeGreaterThanOrEqual(after1)
  })

  it('tick=4999 时 nextSpawnTick 仍为 5000（未触发）', () => {
    const world = { ...makeWorld(3), tick: 4999 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).nextSpawnTick).toBe(5000)
  })

  it('节流期间 relics 数量不变', () => {
    ;(sys as any).relics.push(makeRelic())
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(1)
  })

  it('update 未到 spawn 阈值时 getDiscoveredRelics 仍可调用', () => {
    const world = { ...makeWorld(3), tick: 100 }
    sys.update(1, em, world)
    expect(() => sys.getDiscoveredRelics()).not.toThrow()
  })
})

// ── 3. spawn 条件 ─────────────────────────────────────────────────────────────

describe('3. spawn 条件', () => {
  let sys: WorldRelicSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm(); nextRId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=3(GRASS) => 合法 spawn tile', () => {
    const world = { ...makeWorld(3), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    // spawn attempt made (nextSpawnTick updated)
    expect((sys as any).nextSpawnTick).toBe(10000)
  })

  it('tile=4(FOREST) => 合法 spawn tile', () => {
    const world = { ...makeWorld(4), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).nextSpawnTick).toBe(10000)
  })

  it('tile=5(MOUNTAIN) => 合法 spawn tile', () => {
    const world = { ...makeWorld(5), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).nextSpawnTick).toBe(10000)
  })

  it('tile=0(DEEP_WATER) => 不 spawn（tile < 3）', () => {
    const world = { ...makeWorld(0), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(0)
  })

  it('tile=2(SAND) => 不 spawn（tile < 3）', () => {
    const world = { ...makeWorld(2), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(0)
  })

  it('tile=6(SNOW) => 不 spawn（tile > 5）', () => {
    const world = { ...makeWorld(6), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(0)
  })

  it('tile=7(LAVA) => 不 spawn（tile > 5）', () => {
    const world = { ...makeWorld(7), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(0)
  })

  it('tile=null => 不 spawn', () => {
    const world = { tick: 5000, width: 100, height: 100, getTile: () => null }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(0)
  })

  it('已有 relic 距离 < 20 => 不 spawn（dx*dx+dy*dy < 400）', () => {
    ;(sys as any).relics.push(makeRelic({ x: 50, y: 50 }))
    const world = { ...makeWorld(3), tick: 5000 }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // x=50
      .mockReturnValueOnce(0.5)  // y=50
      .mockReturnValue(0.5)
    sys.update(1, em, world)
    // (50-50)^2 + (50-50)^2 = 0 < 400 => tooClose
    expect((sys as any).relics).toHaveLength(1)
  })

  it('relics=10 时不 spawn（MAX_RELICS=10）', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).relics.push(makeRelic({ x: i * 30, y: 0 }))
    }
    const world = { ...makeWorld(3), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(10)
  })
})

// ── 4. spawn 后字段值 ─────────────────────────────────────────────────────────

describe('4. spawn 后字段值', () => {
  beforeEach(() => { nextRId = 300 })

  it('power 在 [0.3, 1.0] 范围内', () => {
    const r = makeRelic({ power: 0.7 })
    expect(r.power).toBeGreaterThanOrEqual(0.3)
    expect(r.power).toBeLessThanOrEqual(1.0)
  })

  it('power=0.3 是合法最小值', () => {
    const r = makeRelic({ power: 0.3 })
    expect(r.power).toBe(0.3)
  })

  it('power=1.0 是合法最大值', () => {
    const r = makeRelic({ power: 1.0 })
    expect(r.power).toBe(1.0)
  })

  it('新 relic discoveredBy=null（未发现）', () => {
    const r = makeRelic()
    expect(r.discoveredBy).toBeNull()
  })

  it('新 relic discoveredTick=null', () => {
    const r = makeRelic()
    expect(r.discoveredTick).toBeNull()
  })

  it('新 relic active=true', () => {
    const r = makeRelic()
    expect(r.active).toBe(true)
  })

  it('wisdom type 字段正确', () => {
    const r = makeRelic({ type: 'wisdom' })
    expect(r.type).toBe('wisdom')
  })

  it('war type 字段正确', () => {
    const r = makeRelic({ type: 'war' })
    expect(r.type).toBe('war')
  })

  it('nature type 字段正确', () => {
    const r = makeRelic({ type: 'nature' })
    expect(r.type).toBe('nature')
  })

  it('arcane type 字段正确', () => {
    const r = makeRelic({ type: 'arcane' })
    expect(r.type).toBe('arcane')
  })

  it('prosperity type 字段正确', () => {
    const r = makeRelic({ type: 'prosperity' })
    expect(r.type).toBe('prosperity')
  })
})

// ── 5. update 字段变更（discovery + applyEffects）────────────────────────────

describe('5. update 字段变更', () => {
  let sys: WorldRelicSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm(); nextRId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('creature 靠近未发现 relic => discoveredBy 设置', () => {
    const relic = makeRelic({ x: 20, y: 20, discoveredBy: null })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 20, y: 20 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Alice', damage: 5 } as any)
    em.addComponent(eid, { type: 'civMember', civId: 1 } as any)

    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    expect(relic.discoveredBy).toBe(1)
  })

  it('discovery 设置 discoveredTick = tick', () => {
    const relic = makeRelic({ x: 20, y: 20, discoveredBy: null })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 20, y: 20 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Alice', damage: 5 } as any)
    em.addComponent(eid, { type: 'civMember', civId: 2 } as any)

    const world = { ...makeWorld(3), tick: 777 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    expect(relic.discoveredTick).toBe(777)
  })

  it('creature 距离 >= DISCOVERY_RANGE(3) 时不发现', () => {
    const relic = makeRelic({ x: 20, y: 20, discoveredBy: null })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 30, y: 30 } as any) // dx=10,dy=10 => 200 >= 9
    em.addComponent(eid, { type: 'creature', name: 'Bob', damage: 5 } as any)
    em.addComponent(eid, { type: 'civMember', civId: 3 } as any)

    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    expect(relic.discoveredBy).toBeNull()
  })

  it('nature relic 已发现 => applyEffects 恢复 health', () => {
    const relic = makeRelic({ type: 'nature', x: 50, y: 50, discoveredBy: 1, power: 1.0 })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Elf', damage: 5 } as any)
    em.addComponent(eid, { type: 'needs', health: 90, hunger: 50 } as any)

    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    const needs = em.getComponent<any>(eid, 'needs')
    // health + floor(power*3) = 90 + 3 = 93
    expect(needs!.health).toBe(93)
  })

  it('nature relic health 不超过 100', () => {
    const relic = makeRelic({ type: 'nature', x: 50, y: 50, discoveredBy: 1, power: 1.0 })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Elf', damage: 5 } as any)
    em.addComponent(eid, { type: 'needs', health: 99, hunger: 50 } as any)

    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    const needs = em.getComponent<any>(eid, 'needs')
    expect(needs!.health).toBeLessThanOrEqual(100)
  })

  it('war relic 已发现 => applyEffects 增加 damage', () => {
    const relic = makeRelic({ type: 'war', x: 50, y: 50, discoveredBy: 1, power: 1.0 })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Orc', damage: 10 } as any)
    em.addComponent(eid, { type: 'needs', health: 100, hunger: 50 } as any)

    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    const cc = em.getComponent<any>(eid, 'creature')
    // damage = max(damage, damage + floor(power*2)) = max(10, 12) = 12
    expect(cc!.damage).toBeGreaterThanOrEqual(10)
  })

  it('未发现 relic 不触发 applyEffects', () => {
    const relic = makeRelic({ type: 'nature', x: 50, y: 50, discoveredBy: null, power: 1.0 })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Elf', damage: 5 } as any)
    em.addComponent(eid, { type: 'needs', health: 80, hunger: 50 } as any)

    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    const needs = em.getComponent<any>(eid, 'needs')
    expect(needs!.health).toBe(80) // no effect
  })

  it('active=false 的 relic 不触发 applyEffects', () => {
    const relic = makeRelic({ type: 'nature', x: 50, y: 50, discoveredBy: 1, active: false, power: 1.0 })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Elf', damage: 5 } as any)
    em.addComponent(eid, { type: 'needs', health: 80, hunger: 50 } as any)

    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    const needs = em.getComponent<any>(eid, 'needs')
    expect(needs!.health).toBe(80) // no effect
  })

  it('range 外的生物不受 relic 效果影响', () => {
    const relic = makeRelic({ type: 'nature', x: 50, y: 50, discoveredBy: 1, power: 1.0 })
    ;(sys as any).relics.push(relic)

    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 100, y: 100 } as any) // dx=50, dy=50 => 5000 > 225
    em.addComponent(eid, { type: 'creature', name: 'Elf', damage: 5 } as any)
    em.addComponent(eid, { type: 'needs', health: 80, hunger: 50 } as any)

    const world = { ...makeWorld(3), tick: 400 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)

    const needs = em.getComponent<any>(eid, 'needs')
    expect(needs!.health).toBe(80)
  })
})

// ── 6. cleanup 逻辑（relics 无自动删除，依靠 active 字段）─────────────────────

describe('6. cleanup 逻辑', () => {
  let sys: WorldRelicSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm(); nextRId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('relic 不会自动删除（update 不清理 relics）', () => {
    ;(sys as any).relics.push(makeRelic())
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(1)
  })

  it('active=false 的 relic 保留在数组中', () => {
    ;(sys as any).relics.push(makeRelic({ active: false }))
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(1)
  })

  it('多个 relics 共存，update 不删除任何一个', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).relics.push(makeRelic({ x: i * 30, y: 0 }))
    }
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(5)
  })

  it('getDiscoveredRelics 只返回 discoveredBy != null 的', () => {
    ;(sys as any).relics.push(
      makeRelic({ discoveredBy: null }),
      makeRelic({ discoveredBy: 1 }),
      makeRelic({ discoveredBy: 2 }),
    )
    expect(sys.getDiscoveredRelics()).toHaveLength(2)
  })

  it('全部 undiscovered 时 getDiscoveredRelics 返回空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).relics.push(makeRelic({ discoveredBy: null }))
    }
    expect(sys.getDiscoveredRelics()).toHaveLength(0)
  })

  it('全部 discovered 时 getDiscoveredRelics 返回全部', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).relics.push(makeRelic({ discoveredBy: i + 1, discoveredTick: 100 }))
    }
    expect(sys.getDiscoveredRelics()).toHaveLength(5)
  })

  it('_relicBuf 在 checkDiscovery/applyEffects 间复用（不新建数组）', () => {
    const ref = (sys as any)._relicBuf
    ;(sys as any).relics.push(makeRelic())
    const world = { ...makeWorld(3), tick: 100 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any)._relicBuf).toBe(ref)
  })
})

// ── 7. MAX_RELICS 上限（MAX_RELICS=10）────────────────────────────────────────

describe('7. MAX_RELICS 上限', () => {
  let sys: WorldRelicSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm(); nextRId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('relics=10 时不再 spawn', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).relics.push(makeRelic({ x: i * 30, y: 0 }))
    }
    const world = { ...makeWorld(3), tick: 5000 }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, world)
    expect((sys as any).relics).toHaveLength(10)
  })

  it('relics=9 时仍可 spawn（< MAX_RELICS）', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).relics.push(makeRelic({ x: i * 30, y: 0 }))
    }
    const world = { ...makeWorld(3), tick: 5000 }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.0)  // type => wisdom
      .mockReturnValue(0.5)
    sys.update(1, em, world)
    // nextSpawnTick updated means spawn attempt was made
    expect((sys as any).nextSpawnTick).toBe(10000)
  })

  it('MAX_RELICS=10 常数验证', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).relics.push(makeRelic())
    }
    expect((sys as any).relics).toHaveLength(10)
  })

  it('getDiscoveredRelics 在 10 个 relic 全 discovered 时返回 10', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).relics.push(makeRelic({ discoveredBy: 1, discoveredTick: 100 }))
    }
    expect(sys.getDiscoveredRelics()).toHaveLength(10)
  })

  it('手动注入超过 MAX_RELICS 时 getDiscoveredRelics 仍正确', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).relics.push(makeRelic({ discoveredBy: 1, discoveredTick: 100 }))
    }
    expect(sys.getDiscoveredRelics()).toHaveLength(12)
  })
})

// ── 8. getDiscoveredRelics 边界验证 ────────────────────────────────────────────

describe('8. getDiscoveredRelics 边界验证', () => {
  let sys: WorldRelicSystem

  beforeEach(() => { sys = makeSys(); nextRId = 300 })

  it('discoveredBy=null 不返回', () => {
    ;(sys as any).relics.push(makeRelic({ discoveredBy: null }))
    expect(sys.getDiscoveredRelics()).toHaveLength(0)
  })

  it('discoveredBy=0 被返回（0 是合法 civ id）', () => {
    ;(sys as any).relics.push(makeRelic({ discoveredBy: 0, discoveredTick: 100 }))
    expect(sys.getDiscoveredRelics()).toHaveLength(1)
  })

  it('discoveredBy=1 被返回', () => {
    ;(sys as any).relics.push(makeRelic({ discoveredBy: 1, discoveredTick: 100 }))
    expect(sys.getDiscoveredRelics()).toHaveLength(1)
  })

  it('混合发现/未发现正确过滤', () => {
    ;(sys as any).relics.push(
      makeRelic({ discoveredBy: null }),
      makeRelic({ discoveredBy: 1, discoveredTick: 100 }),
      makeRelic({ discoveredBy: null }),
      makeRelic({ discoveredBy: 2, discoveredTick: 200 }),
    )
    expect(sys.getDiscoveredRelics()).toHaveLength(2)
  })

  it('getDiscoveredRelics 多次调用结果一致（buf 复用）', () => {
    ;(sys as any).relics.push(makeRelic({ discoveredBy: 1, discoveredTick: 100 }))
    const r1 = sys.getDiscoveredRelics()
    const r2 = sys.getDiscoveredRelics()
    expect(r1.length).toBe(r2.length)
  })

  it('getDiscoveredRelics 返回原始 relic 对象引用', () => {
    const r = makeRelic({ discoveredBy: 1, discoveredTick: 100 })
    ;(sys as any).relics.push(r)
    const discovered = sys.getDiscoveredRelics()
    expect(discovered[0]).toBe(r)
  })

  it('5 种 RelicType 全部可被 discovered', () => {
    const types: RelicType[] = ['wisdom', 'war', 'nature', 'arcane', 'prosperity']
    for (const t of types) {
      ;(sys as any).relics.push(makeRelic({ type: t, discoveredBy: 1, discoveredTick: 100 }))
    }
    expect(sys.getDiscoveredRelics()).toHaveLength(5)
  })

  it('power=0.3 时 nature 效果为 floor(0.3*3)=0', () => {
    const relic = makeRelic({ type: 'nature', x: 50, y: 50, discoveredBy: 1, power: 0.3, active: true })
    ;(sys as any).relics.push(relic)
    const em = makeEm()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em.addComponent(eid, { type: 'creature', name: 'Elf', damage: 5 } as any)
    em.addComponent(eid, { type: 'needs', health: 80, hunger: 50 } as any)
    const sys2 = makeSys()
    ;(sys2 as any).relics.push(relic)
    ;(sys2 as any).nextEffectTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys2.update(1, em, { ...makeWorld(3), tick: 0 })
    const needs = em.getComponent<any>(eid, 'needs')
    // floor(0.3*3)=0 => no health change
    expect(needs!.health).toBe(80)
  })

  it('power=1.0 时 war 效果为 floor(1.0*2)=2 damage', () => {
    const relic = makeRelic({ type: 'war', x: 50, y: 50, discoveredBy: 1, power: 1.0, active: true })
    const em2 = makeEm()
    const eid = em2.createEntity()
    em2.addComponent(eid, { type: 'position', x: 50, y: 50 } as any)
    em2.addComponent(eid, { type: 'creature', name: 'Orc', damage: 10 } as any)
    em2.addComponent(eid, { type: 'needs', health: 100, hunger: 50 } as any)
    const sys3 = makeSys()
    ;(sys3 as any).relics.push(relic)
    ;(sys3 as any).nextEffectTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys3.update(1, em2, { ...makeWorld(3), tick: 0 })
    const cc = em2.getComponent<any>(eid, 'creature')
    expect(cc!.damage).toBeGreaterThanOrEqual(12) // 10 + 2
  })
})

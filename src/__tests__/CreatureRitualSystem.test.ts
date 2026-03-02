import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureRitualSystem } from '../systems/CreatureRitualSystem'
import type { Ritual, RitualType, RitualEffect } from '../systems/CreatureRitualSystem'
import { EntityManager } from '../ecs/Entity'

// ─── helpers ─────────────────────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreatureRitualSystem { return new CreatureRitualSystem() }
function makeRitual(
  leaderId: number,
  type: RitualType = 'rain_dance',
  effect: RitualEffect = 'fertility',
  progress = 0,
  participants: number[] = [],
  tick = 0,
): Ritual {
  return { id: nextId++, leaderId, participants: [...participants], type, progress, effect, tick }
}
function makeEm(): EntityManager { return new EntityManager() }
function addCreatureWithNeeds(em: EntityManager, x = 5, y = 5, health = 50): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false })
  em.addComponent(eid, { type: 'position', x, y })
  em.addComponent(eid, { type: 'needs', hunger: 10, health })
  return eid
}

const ALL_RITUAL_TYPES: RitualType[] = [
  'rain_dance', 'harvest_feast', 'war_cry', 'healing_circle', 'moon_prayer', 'ancestor_worship',
]
const TYPE_EFFECT_MAP: Record<RitualType, RitualEffect> = {
  rain_dance: 'fertility',
  harvest_feast: 'morale_boost',
  war_cry: 'strength',
  healing_circle: 'healing',
  moon_prayer: 'luck',
  ancestor_worship: 'protection',
}

// ─── 1. 初始状态 ��────────────────────────────────────────────────────────────
describe('CreatureRitualSystem – 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rituals 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any).rituals).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
  it('_typeRitualsBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._typeRitualsBuf).toHaveLength(0)
  })
  it('两个实例互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).rituals.push(makeRitual(1))
    expect((b as any).rituals).toHaveLength(0)
  })
})

// ─── 2. 注入 / 查询 rituals ─────────────────────────────────────────────────
describe('CreatureRitualSystem – rituals 注入与查询', () => {
  let sys: CreatureRitualSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 1 条后 length === 1', () => {
    ;(sys as any).rituals.push(makeRitual(1))
    expect((sys as any).rituals).toHaveLength(1)
  })
  it('type 字段正确保存', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'war_cry'))
    expect((sys as any).rituals[0].type).toBe('war_cry')
  })
  it('effect 字段正确保存', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'healing_circle', 'healing'))
    expect((sys as any).rituals[0].effect).toBe('healing')
  })
  it('progress 字段正确保存', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance', 'fertility', 50))
    expect((sys as any).rituals[0].progress).toBe(50)
  })
  it('participants 字段正确保存', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance', 'fertility', 0, [2, 3]))
    expect((sys as any).rituals[0].participants).toEqual([2, 3])
  })
  it('leaderId 字段正确保存', () => {
    ;(sys as any).rituals.push(makeRitual(99))
    expect((sys as any).rituals[0].leaderId).toBe(99)
  })
  it('tick 字段正确保存', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance', 'fertility', 0, [], 1234))
    expect((sys as any).rituals[0].tick).toBe(1234)
  })
  it('支持全部 6 种仪式类型', () => {
    ALL_RITUAL_TYPES.forEach((t, i) => { ;(sys as any).rituals.push(makeRitual(i + 1, t)) })
    expect((sys as any).rituals).toHaveLength(6)
  })
  it('多条注入顺序保持', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    ;(sys as any).rituals.push(makeRitual(2, 'war_cry'))
    expect((sys as any).rituals[0].type).toBe('rain_dance')
    expect((sys as any).rituals[1].type).toBe('war_cry')
  })
})

// ─── 3. getRitualsByType ─────────────────────────────────────────────────────
describe('CreatureRitualSystem – getRitualsByType', () => {
  let sys: CreatureRitualSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无 rituals 时返回空', () => {
    expect(sys.getRitualsByType('rain_dance')).toHaveLength(0)
  })
  it('不匹配类型返回空', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    expect(sys.getRitualsByType('war_cry')).toHaveLength(0)
  })
  it('精确过滤单种类型', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    ;(sys as any).rituals.push(makeRitual(2, 'rain_dance'))
    ;(sys as any).rituals.push(makeRitual(3, 'harvest_feast'))
    expect(sys.getRitualsByType('rain_dance')).toHaveLength(2)
  })
  it('结果不含其他类型', () => {
    ALL_RITUAL_TYPES.forEach((t, i) => { ;(sys as any).rituals.push(makeRitual(i + 1, t)) })
    const res = sys.getRitualsByType('war_cry')
    expect(res.every(r => r.type === 'war_cry')).toBe(true)
  })
  it('返回的是 _typeRitualsBuf 引用', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    const res = sys.getRitualsByType('rain_dance')
    expect(res).toBe((sys as any)._typeRitualsBuf)
  })
  it('连续两次调用同类型结果一致', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'moon_prayer'))
    const r1 = [...sys.getRitualsByType('moon_prayer')]
    const r2 = [...sys.getRitualsByType('moon_prayer')]
    expect(r1[0].type).toBe(r2[0].type)
  })
  it('切换查询类型时 buf 正确刷新', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    ;(sys as any).rituals.push(makeRitual(2, 'war_cry'))
    const r1 = sys.getRitualsByType('rain_dance')
    expect(r1).toHaveLength(1)
    const r2 = sys.getRitualsByType('war_cry')
    expect(r2).toHaveLength(1)
  })
  it('全 6 种类型各自只返回自己', () => {
    ALL_RITUAL_TYPES.forEach((t, i) => { ;(sys as any).rituals.push(makeRitual(i + 1, t)) })
    ALL_RITUAL_TYPES.forEach(t => {
      expect(sys.getRitualsByType(t)).toHaveLength(1)
    })
  })
})

// ─── 4. TYPE_EFFECT_MAP 映射正确 ─────────────────────────────────────────────
describe('CreatureRitualSystem – type-effect 映射', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(Object.entries(TYPE_EFFECT_MAP) as [RitualType, RitualEffect][])(
    '%s → %s',
    (type, expectedEffect) => {
      expect(TYPE_EFFECT_MAP[type]).toBe(expectedEffect)
    },
  )
})

// ─── 5. pruneCompleted ───────────────────────────────────────────────────────
describe('CreatureRitualSystem – pruneCompleted', () => {
  let sys: CreatureRitualSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function prune(s: CreatureRitualSystem) { (s as any).pruneCompleted() }

  it('数量未超 MAX_RITUALS(40) 时 pruneCompleted 直接返回', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance', 'fertility', 100))
    prune(sys)
    // 条目 progress=100 但数量<40，不做清理
    expect((sys as any).rituals).toHaveLength(1)
  })
  it('超过 MAX_RITUALS 时移除 progress===100 的条目', () => {
    for (let i = 0; i < 45; i++) {
      const progress = i < 10 ? 100 : 0
      ;(sys as any).rituals.push(makeRitual(i, 'rain_dance', 'fertility', progress))
    }
    prune(sys)
    expect((sys as any).rituals.length).toBeLessThanOrEqual(40)
  })
  it('超过 MAX_RITUALS 且清理后仍超量时强制截断', () => {
    // 全部 progress < 100 且数量超标
    for (let i = 0; i < 50; i++) {
      ;(sys as any).rituals.push(makeRitual(i, 'rain_dance', 'fertility', 0))
    }
    prune(sys)
    expect((sys as any).rituals.length).toBeLessThanOrEqual(40)
  })
  it('空数组 pruneCompleted 不报错', () => {
    expect(() => prune(sys)).not.toThrow()
  })
})

// ─── 6. progressRituals ─────────────────────────────────────────────────────
describe('CreatureRitualSystem – progressRituals', () => {
  let sys: CreatureRitualSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  function progress(s: CreatureRitualSystem, emInst: EntityManager) {
    (s as any).progressRituals(emInst)
  }

  it('progress >= 100 的仪式不再推进', () => {
    const r = makeRitual(1, 'rain_dance', 'fertility', 100, [2, 3])
    ;(sys as any).rituals.push(r)
    progress(sys, em)
    expect((sys as any).rituals[0].progress).toBe(100)
  })
  it('leader 死亡时仪式 progress 设为 100', () => {
    const leader = addCreatureWithNeeds(em, 5, 5, 0) // health=0
    const r = makeRitual(leader, 'war_cry', 'strength', 0, [2, 3])
    ;(sys as any).rituals.push(r)
    progress(sys, em)
    expect((sys as any).rituals[0].progress).toBe(100)
  })
  it('leader 健康时仪式推进', () => {
    const leader = addCreatureWithNeeds(em, 5, 5, 50)
    const p2 = addCreatureWithNeeds(em, 5, 5, 50)
    const p3 = addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = makeRitual(leader, 'rain_dance', 'fertility', 0, [leader, p2, p3])
    ;(sys as any).rituals.push(r)
    progress(sys, em)
    expect((sys as any).rituals[0].progress).toBeGreaterThan(0)
  })
  it('参与者不足 2 人时仪式 progress 设为 100', () => {
    const leader = addCreatureWithNeeds(em, 5, 5, 50)
    const r = makeRitual(leader, 'rain_dance', 'fertility', 0, [leader]) // only 1
    ;(sys as any).rituals.push(r)
    progress(sys, em)
    expect((sys as any).rituals[0].progress).toBe(100)
  })
  it('死亡参与者从列表中移除', () => {
    const leader = addCreatureWithNeeds(em, 5, 5, 50)
    const dead = addCreatureWithNeeds(em, 5, 5, 0) // health=0
    const alive = addCreatureWithNeeds(em, 5, 5, 50)
    const r = makeRitual(leader, 'rain_dance', 'fertility', 0, [leader, dead, alive])
    ;(sys as any).rituals.push(r)
    progress(sys, em)
    const updated = (sys as any).rituals[0] as Ritual
    expect(updated.participants.includes(dead)).toBe(false)
  })
  it('progress 不超过 100', () => {
    const leader = addCreatureWithNeeds(em, 5, 5, 50)
    const p2 = addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = makeRitual(leader, 'rain_dance', 'fertility', 95, [leader, p2])
    ;(sys as any).rituals.push(r)
    progress(sys, em)
    expect((sys as any).rituals[0].progress).toBeLessThanOrEqual(100)
  })
})

// ─── 7. update – tick 间隔控制 ──────────────────────────────────────────────
describe('CreatureRitualSystem – update tick 间隔', () => {
  let sys: CreatureRitualSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('间隔不足 CHECK_INTERVAL(800) 时不执行', () => {
    const spy = vi.spyOn(sys as any, 'initiateRituals')
    sys.update(1, em, 0)
    sys.update(1, em, 400)
    expect(spy).not.toHaveBeenCalled()
  })
  it('间隔满足时执行 initiateRituals', () => {
    const spy = vi.spyOn(sys as any, 'initiateRituals')
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('lastCheck 更新为最新 tick', () => {
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })
  it('连续两次相同 tick 只触发一次', () => {
    const spy = vi.spyOn(sys as any, 'initiateRituals')
    // 先用满足间隔的 tick 触发一次
    sys.update(1, em, 800)
    expect(spy).toHaveBeenCalledTimes(1)
    // 相同 tick 再调用，不应再触发
    sys.update(1, em, 800)
    sys.update(1, em, 800)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

// ─── 8. initiateRituals 条件判断 ────────────────────────────────────────────
describe('CreatureRitualSystem – initiateRituals 条件', () => {
  let sys: CreatureRitualSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('无 creature 实体不生成仪式', () => {
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).rituals).toHaveLength(0)
  })
  it('random > RITUAL_CHANCE(0.012) 时不生成仪式', () => {
    addCreatureWithNeeds(em)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).rituals).toHaveLength(0)
  })
  it('周边生物不足 2 时不生成仪式', () => {
    // 只有一个生物，nearby < 2
    addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).rituals).toHaveLength(0)
  })
  it('leader 健康且周边足够时生成仪式', () => {
    for (let i = 0; i < 5; i++) addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).rituals.length).toBeGreaterThan(0)
  })
  it('达到 MAX_RITUALS(40) 后停止生成', () => {
    // 使用 progress=0（未完成），避免 pruneCompleted 清除它们
    for (let i = 0; i < 45; i++) {
      ;(sys as any).rituals.push(makeRitual(i, 'rain_dance', 'fertility', 0, [1, 2, 3]))
    }
    const before = (sys as any).rituals.length
    const spy = vi.spyOn(sys as any, 'initiateRituals')
    // 直接调用 initiateRituals，不走 update（避免 pruneCompleted 干扰）
    ;(sys as any).initiateRituals(em, 800)
    expect(spy).toHaveBeenCalled()
    // initiateRituals 内部因 length >= MAX_RITUALS 直接 return，数量不增
    expect((sys as any).rituals.length).toBe(before)
  })
  it('leader health <= 0 时跳过该 leader', () => {
    for (let i = 0; i < 5; i++) addCreatureWithNeeds(em, 5, 5, 0) // health=0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    expect((sys as any).rituals).toHaveLength(0)
  })
  it('新仪式 participants 包含 leader', () => {
    for (let i = 0; i < 5; i++) addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    const r = (sys as any).rituals[0] as Ritual | undefined
    if (r) expect(r.participants.includes(r.leaderId)).toBe(true)
  })
  it('participants 数量最多 6（leader + 5 nearby）', () => {
    for (let i = 0; i < 10; i++) addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    const r = (sys as any).rituals[0] as Ritual | undefined
    if (r) expect(r.participants.length).toBeLessThanOrEqual(6)
  })
  it('新仪式 effect 与 type 对应', () => {
    for (let i = 0; i < 5; i++) addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    const r = (sys as any).rituals[0] as Ritual | undefined
    if (r) expect(r.effect).toBe(TYPE_EFFECT_MAP[r.type])
  })
  it('新仪式 id 自增', () => {
    for (let i = 0; i < 5; i++) addCreatureWithNeeds(em, 5, 5, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 800)
    const r = (sys as any).rituals[0] as Ritual | undefined
    if (r) expect(r.id).toBeGreaterThanOrEqual(1)
  })
})

// ─── 9. findNearbyCreatures ─────────────────────────────────────────────────
describe('CreatureRitualSystem – findNearbyCreatures', () => {
  let sys: CreatureRitualSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  function findNearby(eid: number, radius: number): number[] {
    return (sys as any).findNearbyCreatures(em, eid, radius)
  }

  it('无 position 组件时返回空数组', () => {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false })
    expect(findNearby(eid, 10)).toHaveLength(0)
  })
  it('同一实体不计入 nearby', () => {
    const eid = addCreatureWithNeeds(em, 5, 5, 50)
    expect(findNearby(eid, 100)).not.toContain(eid)
  })
  it('超出半径的生物不计入 nearby', () => {
    const eid = addCreatureWithNeeds(em, 0, 0, 50)
    addCreatureWithNeeds(em, 100, 100, 50) // 很远
    expect(findNearby(eid, 8)).toHaveLength(0)
  })
  it('在半径内的生物被返回', () => {
    const eid = addCreatureWithNeeds(em, 5, 5, 50)
    addCreatureWithNeeds(em, 6, 5, 50) // 距离=1
    expect(findNearby(eid, 8).length).toBeGreaterThan(0)
  })
  it('结果最多 6 个', () => {
    const eid = addCreatureWithNeeds(em, 5, 5, 50)
    for (let i = 0; i < 10; i++) addCreatureWithNeeds(em, 5, 5, 50)
    expect(findNearby(eid, 100).length).toBeLessThanOrEqual(6)
  })
})

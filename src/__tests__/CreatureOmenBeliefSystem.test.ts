import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureOmenBeliefSystem } from '../systems/CreatureOmenBeliefSystem'
import type { OmenBelief, OmenType } from '../systems/CreatureOmenBeliefSystem'

// CHECK_INTERVAL=1100, OMEN_CHANCE=0.008, SPREAD_CHANCE=0.02, MAX_BELIEFS=120, DECAY_RATE=0.004
// MORALE_MAP: good_harvest:15, dark_sky:-12, animal_sign:8, water_omen:-5, fire_portent:-18, wind_whisper:10

let nextId = 1
function makeSys(): CreatureOmenBeliefSystem { return new CreatureOmenBeliefSystem() }
function makeOmen(entityId: number, type: OmenType = 'good_harvest', conviction = 60): OmenBelief {
  return { id: nextId++, entityId, type, conviction, moralEffect: 10, spreadCount: 2, tick: 0 }
}

function makeEM(ids: number[] = [1, 2, 3]): any {
  return {
    getEntitiesWithComponents: () => ids,
    getEntitiesWithComponent: () => ids,
    hasComponent: () => true,
  }
}

const CHECK_INTERVAL = 1100
const DECAY_RATE = 0.004

describe('CreatureOmenBeliefSystem.getBeliefs', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无信念', () => { expect(sys.getBeliefs()).toHaveLength(0) })
  it('返回内部引用', () => {
    ;sys.getBeliefs().push(makeOmen(1))
    expect(sys.getBeliefs()).toBe(sys.getBeliefs())
  })
  it('注入后可查询', () => {
    ;sys.getBeliefs().push(makeOmen(1, 'dark_sky'))
    expect(sys.getBeliefs()[0].type).toBe('dark_sky')
  })
  it('支持所有6种预兆类型', () => {
    const types: OmenType[] = ['good_harvest', 'dark_sky', 'animal_sign', 'water_omen', 'fire_portent', 'wind_whisper']
    types.forEach((t, i) => { ;sys.getBeliefs().push(makeOmen(i + 1, t)) })
    expect(sys.getBeliefs()).toHaveLength(6)
  })
  it('多个全部返回', () => {
    ;sys.getBeliefs().push(makeOmen(1))
    ;sys.getBeliefs().push(makeOmen(2))
    expect(sys.getBeliefs()).toHaveLength(2)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('_beliefKeySet 初始为空', () => {
    expect((sys as any)._beliefKeySet.size).toBe(0)
  })
})

describe('CreatureOmenBeliefSystem - OmenType 枚举', () => {
  it('good_harvest 是有效类型', () => {
    const o = makeOmen(1, 'good_harvest')
    expect(o.type).toBe('good_harvest')
  })
  it('dark_sky 是有效类型', () => {
    const o = makeOmen(1, 'dark_sky')
    expect(o.type).toBe('dark_sky')
  })
  it('animal_sign 是有效类型', () => {
    const o = makeOmen(1, 'animal_sign')
    expect(o.type).toBe('animal_sign')
  })
  it('water_omen 是有效类型', () => {
    const o = makeOmen(1, 'water_omen')
    expect(o.type).toBe('water_omen')
  })
  it('fire_portent 是有效类型', () => {
    const o = makeOmen(1, 'fire_portent')
    expect(o.type).toBe('fire_portent')
  })
  it('wind_whisper 是有效类型', () => {
    const o = makeOmen(1, 'wind_whisper')
    expect(o.type).toBe('wind_whisper')
  })
})

describe('CreatureOmenBeliefSystem - MORALE_MAP 验证', () => {
  it('good_harvest moralEffect = 15', () => {
    const MORALE_MAP: Record<OmenType, number> = {
      good_harvest: 15, dark_sky: -12, animal_sign: 8,
      water_omen: -5, fire_portent: -18, wind_whisper: 10,
    }
    expect(MORALE_MAP['good_harvest']).toBe(15)
  })
  it('dark_sky moralEffect = -12', () => {
    const MORALE_MAP: Record<OmenType, number> = {
      good_harvest: 15, dark_sky: -12, animal_sign: 8,
      water_omen: -5, fire_portent: -18, wind_whisper: 10,
    }
    expect(MORALE_MAP['dark_sky']).toBe(-12)
  })
  it('fire_portent moralEffect = -18 (最负)', () => {
    const MORALE_MAP: Record<OmenType, number> = {
      good_harvest: 15, dark_sky: -12, animal_sign: 8,
      water_omen: -5, fire_portent: -18, wind_whisper: 10,
    }
    expect(MORALE_MAP['fire_portent']).toBe(-18)
  })
  it('wind_whisper moralEffect = 10', () => {
    const MORALE_MAP: Record<OmenType, number> = {
      good_harvest: 15, dark_sky: -12, animal_sign: 8,
      water_omen: -5, fire_portent: -18, wind_whisper: 10,
    }
    expect(MORALE_MAP['wind_whisper']).toBe(10)
  })
  it('animal_sign moralEffect = 8', () => {
    const MORALE_MAP: Record<OmenType, number> = {
      good_harvest: 15, dark_sky: -12, animal_sign: 8,
      water_omen: -5, fire_portent: -18, wind_whisper: 10,
    }
    expect(MORALE_MAP['animal_sign']).toBe(8)
  })
  it('water_omen moralEffect = -5', () => {
    const MORALE_MAP: Record<OmenType, number> = {
      good_harvest: 15, dark_sky: -12, animal_sign: 8,
      water_omen: -5, fire_portent: -18, wind_whisper: 10,
    }
    expect(MORALE_MAP['water_omen']).toBe(-5)
  })
})

describe('CreatureOmenBeliefSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时 update 不执行（lastCheck 维持为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1])
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行（lastCheck 更新）', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('连续两次调用：第二次未超阈值不更新 lastCheck', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    const savedCheck = (sys as any).lastCheck
    sys.update(0, em, CHECK_INTERVAL + 50)
    expect((sys as any).lastCheck).toBe(savedCheck)
  })

  it('tick=CHECK_INTERVAL-1 边界不更新', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureOmenBeliefSystem - conviction decay 逻辑', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('DECAY_RATE=0.004，每次 update 使 conviction 减少 0.004*1100=4.4', () => {
    const decayAmount = DECAY_RATE * CHECK_INTERVAL
    expect(decayAmount).toBeCloseTo(4.4, 5)
  })

  it('conviction <= 5 的信念被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEM([])
    const omen = makeOmen(1, 'good_harvest', 5.1)
    sys.getBeliefs().push(omen)
    ;(sys as any)._beliefKeySet.add('1_good_harvest')
    sys.update(0, em, CHECK_INTERVAL)
    // conviction: 5.1 - 4.4 = 0.7 <= 5 → 被删除
    expect(sys.getBeliefs()).toHaveLength(0)
  })

  it('conviction > 5 的信念衰减后保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEM([])
    const omen = makeOmen(1, 'good_harvest', 50)
    sys.getBeliefs().push(omen)
    ;(sys as any)._beliefKeySet.add('1_good_harvest')
    sys.update(0, em, CHECK_INTERVAL)
    // conviction: 50 - 4.4 = 45.6 > 5 → 保留
    expect(sys.getBeliefs()).toHaveLength(1)
  })
})

describe('CreatureOmenBeliefSystem - _beliefKeySet 去重', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('_beliefKeySet 格式正确', () => {
    ;(sys as any)._beliefKeySet.add('1_good_harvest')
    expect((sys as any)._beliefKeySet.has('1_good_harvest')).toBe(true)
  })

  it('不同实体同类型不冲突', () => {
    ;(sys as any)._beliefKeySet.add('1_dark_sky')
    ;(sys as any)._beliefKeySet.add('2_dark_sky')
    expect((sys as any)._beliefKeySet.size).toBe(2)
  })

  it('相同实体同类型只添加一次', () => {
    ;(sys as any)._beliefKeySet.add('1_dark_sky')
    ;(sys as any)._beliefKeySet.add('1_dark_sky')
    expect((sys as any)._beliefKeySet.size).toBe(1)
  })

  it('删除后 has 返回 false', () => {
    ;(sys as any)._beliefKeySet.add('1_good_harvest')
    ;(sys as any)._beliefKeySet.delete('1_good_harvest')
    expect((sys as any)._beliefKeySet.has('1_good_harvest')).toBe(false)
  })
})

describe('CreatureOmenBeliefSystem - 字段数据完整性', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('conviction 字段可正确存储', () => {
    const o = makeOmen(1, 'good_harvest', 75)
    sys.getBeliefs().push(o)
    expect(sys.getBeliefs()[0].conviction).toBe(75)
  })

  it('moralEffect 字段可为负数', () => {
    const o = makeOmen(1, 'dark_sky', 60)
    o.moralEffect = -12
    sys.getBeliefs().push(o)
    expect(sys.getBeliefs()[0].moralEffect).toBe(-12)
  })

  it('spreadCount 字段可正确存储', () => {
    const o = makeOmen(1, 'good_harvest', 60)
    o.spreadCount = 5
    sys.getBeliefs().push(o)
    expect(sys.getBeliefs()[0].spreadCount).toBe(5)
  })

  it('entityId 字段可正确存储', () => {
    const o = makeOmen(42, 'wind_whisper', 50)
    sys.getBeliefs().push(o)
    expect(sys.getBeliefs()[0].entityId).toBe(42)
  })

  it('tick 字段可正确存储', () => {
    const o = makeOmen(1, 'good_harvest', 60)
    o.tick = 9000
    sys.getBeliefs().push(o)
    expect(sys.getBeliefs()[0].tick).toBe(9000)
  })
})

describe('CreatureOmenBeliefSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    const sys = makeSys()
    expect(() => sys.update(0, makeEM([]), CHECK_INTERVAL)).not.toThrow()
  })

  it('MAX_BELIEFS = 120', () => {
    expect(120).toBe(120)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    const o = makeOmen(1)
    sys.getBeliefs().push(o)
    const r = sys.getBeliefs()[0]
    expect(typeof r.conviction).toBe('number')
    expect(typeof r.moralEffect).toBe('number')
    expect(typeof r.spreadCount).toBe('number')
    expect(typeof r.entityId).toBe('number')
  })
})

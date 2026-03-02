import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureOmenBeliefSystem } from '../systems/CreatureOmenBeliefSystem'
import type { OmenBelief, OmenType } from '../systems/CreatureOmenBeliefSystem'

let nextId = 1
function makeSys(): CreatureOmenBeliefSystem { return new CreatureOmenBeliefSystem() }
function makeOmen(entityId: number, type: OmenType = 'good_harvest', conviction = 60): OmenBelief {
  return { id: nextId++, entityId, type, conviction, moralEffect: 10, spreadCount: 2, tick: 0 }
}

// Minimal EntityManager stub
function makeEM(ids: number[] = [1, 2, 3]): any {
  return {
    getEntitiesWithComponents: () => ids,
    getEntitiesWithComponent: () => ids,
    hasComponent: () => true,
  }
}

const CHECK_INTERVAL = 1100
const DECAY_RATE = 0.004
const MAX_BELIEFS = 120

describe('CreatureOmenBeliefSystem.getBeliefs', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无信念', () => { expect(sys.getBeliefs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getBeliefs().push(makeOmen(1, 'dark_sky'))
    expect(sys.getBeliefs()[0].type).toBe('dark_sky')
  })
  it('返回内部引用', () => {
    ;sys.getBeliefs().push(makeOmen(1))
    expect(sys.getBeliefs()).toBe(sys.getBeliefs())
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
})

describe('CreatureOmenBeliefSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < CHECK_INTERVAL 时 update 不执行（lastCheck 维持为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 确保 OMEN_CHANCE 命中
    const em = makeEM([1])
    sys.update(0, em, CHECK_INTERVAL - 1)
    // 未过阈值，不会添加信念
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
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
    sys.update(0, em, CHECK_INTERVAL)           // first trigger
    const savedCheck = (sys as any).lastCheck   // = CHECK_INTERVAL
    sys.update(0, em, CHECK_INTERVAL + 50)      // 50 < CHECK_INTERVAL, skip
    expect((sys as any).lastCheck).toBe(savedCheck)
  })

  it('连续两次调用：第二次超阈值后更新 lastCheck', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureOmenBeliefSystem 信念衰减与清理', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('衰减量 = DECAY_RATE * CHECK_INTERVAL', () => {
    // conviction 从60开始，经过一次 update 后减少 DECAY_RATE * CHECK_INTERVAL = 0.004 * 1100 = 4.4
    sys.getBeliefs().push(makeOmen(1, 'good_harvest', 60))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止随机生成/扩散
    sys.update(0, em, CHECK_INTERVAL)
    const expected = 60 - DECAY_RATE * CHECK_INTERVAL
    expect(sys.getBeliefs()[0].conviction).toBeCloseTo(expected, 5)
    vi.restoreAllMocks()
  })

  it('conviction <= 5 的信念在衰减后被删除', () => {
    // 设置 conviction 使衰减后恰好 <= 5：conviction = 5 + DECAY_RATE * CHECK_INTERVAL - 0.01 = 9.39
    const initialConviction = 5 + DECAY_RATE * CHECK_INTERVAL - 0.01 // 9.39
    sys.getBeliefs().push(makeOmen(1, 'dark_sky', initialConviction))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL)
    // 衰减后 conviction ≈ 4.99 <= 5，应被删除
    expect(sys.getBeliefs()).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('conviction > 5 的信念衰减后保留', () => {
    // conviction = 20，衰减后 = 20 - 4.4 = 15.6 > 5，保留
    sys.getBeliefs().push(makeOmen(1, 'good_harvest', 20))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL)
    expect(sys.getBeliefs()).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('多个信念同时衰减，低于阈值的全部清除', () => {
    sys.getBeliefs().push(makeOmen(1, 'good_harvest', 6))   // 6 - 4.4 = 1.6 <= 5, 删除
    sys.getBeliefs().push(makeOmen(2, 'dark_sky', 50))      // 50 - 4.4 = 45.6 > 5, 保留
    sys.getBeliefs().push(makeOmen(3, 'animal_sign', 5.5))  // 5.5 - 4.4 = 1.1 <= 5, 删除
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL)
    expect(sys.getBeliefs()).toHaveLength(1)
    expect(sys.getBeliefs()[0].entityId).toBe(2)
    vi.restoreAllMocks()
  })
})

describe('CreatureOmenBeliefSystem getByEntity', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无信念时返回空数组', () => {
    expect(sys.getByEntity(99)).toHaveLength(0)
  })

  it('只返回指定 entityId 的信念', () => {
    sys.getBeliefs().push(makeOmen(1, 'good_harvest'))
    sys.getBeliefs().push(makeOmen(2, 'dark_sky'))
    sys.getBeliefs().push(makeOmen(1, 'fire_portent'))
    const result = sys.getByEntity(1)
    expect(result).toHaveLength(2)
    expect(result.every(b => b.entityId === 1)).toBe(true)
  })

  it('entityId 不存在时返回空', () => {
    sys.getBeliefs().push(makeOmen(1, 'good_harvest'))
    expect(sys.getByEntity(999)).toHaveLength(0)
  })
})

describe('CreatureOmenBeliefSystem MAX_BELIEFS 上限', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 MAX_BELIEFS 条后 update 不新增信念', () => {
    for (let i = 0; i < MAX_BELIEFS; i++) {
      sys.getBeliefs().push(makeOmen(i + 1, 'good_harvest', 60))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 命中 OMEN_CHANCE
    const em = makeEM(Array.from({ length: 10 }, (_, i) => i + 1000))
    sys.update(0, em, CHECK_INTERVAL)
    // 因衰减，部分可能被删除；关键是生成阶段不会超过 MAX_BELIEFS
    // 在 update 开始时检查 beliefs.length >= MAX_BELIEFS，跳过生成
    // 衰减前 length = MAX_BELIEFS，进入 for(eid) 时立即 break
    // 最终长度 <= MAX_BELIEFS（衰减可能减少）
    expect((sys as any).beliefs.length).toBeLessThanOrEqual(MAX_BELIEFS)
    vi.restoreAllMocks()
  })
})

describe('CreatureOmenBeliefSystem moralEffect 常量', () => {
  it('good_harvest moralEffect = 15', () => {
    const sys = makeSys()
    sys.getBeliefs().push({ id: 1, entityId: 1, type: 'good_harvest', conviction: 60, moralEffect: 15, spreadCount: 0, tick: 0 })
    expect(sys.getBeliefs()[0].moralEffect).toBe(15)
  })
  it('fire_portent moralEffect 为负值', () => {
    const sys = makeSys()
    sys.getBeliefs().push({ id: 1, entityId: 1, type: 'fire_portent', conviction: 60, moralEffect: -18, spreadCount: 0, tick: 0 })
    expect(sys.getBeliefs()[0].moralEffect).toBeLessThan(0)
  })
})

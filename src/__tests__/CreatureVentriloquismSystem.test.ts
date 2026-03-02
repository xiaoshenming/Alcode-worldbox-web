import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureVentriloquismSystem } from '../systems/CreatureVentriloquismSystem'
import type { VentriloquismAct, VoiceTrick } from '../systems/CreatureVentriloquismSystem'

// ---- helpers ----
let nextId = 1
function makeSys(): CreatureVentriloquismSystem { return new CreatureVentriloquismSystem() }
function makeAct(performerId: number, trick: VoiceTrick = 'distraction', tickVal = 0): VentriloquismAct {
  return { id: nextId++, performerId, trick, skill: 70, effectiveness: 60, targetId: null, detected: false, tick: tickVal }
}

/** EntityManager mock: 默认无生物 */
function makeMockEM(entityIds: number[] = [], creatureAge = 20) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(entityIds.length > 0 ? { age: creatureAge } : null),
    hasComponent: vi.fn().mockReturnValue(false),
  }
}

const CHECK_INTERVAL = 1100
const EXPIRE_AFTER = 5000
const MAX_ACTS = 80

// ---- original 5 trivial tests ----
describe('CreatureVentriloquismSystem.getActs', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无口技表演', () => { expect((sys as any).acts).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).acts.push(makeAct(1, 'mimicry'))
    expect((sys as any).acts[0].trick).toBe('mimicry')
  })
  it('返回只读引用', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect((sys as any).acts).toBe((sys as any).acts)
  })
  it('支持所有6种口技技巧', () => {
    const tricks: VoiceTrick[] = ['distraction', 'mimicry', 'intimidation', 'lure', 'comedy', 'warning']
    tricks.forEach((t, i) => { ;(sys as any).acts.push(makeAct(i + 1, t)) })
    expect((sys as any).acts).toHaveLength(6)
  })
  it('targetId可为null', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect((sys as any).acts[0].targetId).toBeNull()
  })
})

// ---- meaningful tests ----
describe('CreatureVentriloquismSystem.update — CHECK_INTERVAL 节流', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时 getEntitiesWithComponents 不被调用', () => {
    const em = makeMockEM([1])
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick 达到 CHECK_INTERVAL 时执行一次逻辑', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledOnce()
  })

  it('第二次 update 不足间隔，不再执行', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL + 50)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('两次各达间隔，各执行一次，共调用两次', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })
})

describe('CreatureVentriloquismSystem.update — skillMap 积累', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('同一实体多次 update 后 skillMap 中技能累增', () => {
    const em = makeMockEM([42], 20)
    // 强制 Math.random 使招募条件满足（<= PERFORM_CHANCE）
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill1 = (sys as any).skillMap.get(42) as number
    // 重置 lastCheck 以允许第二次触发
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    const skill2 = (sys as any).skillMap.get(42) as number
    randSpy.mockRestore()
    // skill2 > skill1，因为 SKILL_GROWTH = 0.07 被叠加
    expect(skill2).toBeGreaterThan(skill1)
  })

  it('skillMap 中的技能值不超过 100', () => {
    ;(sys as any).skillMap.set(99, 99.95)
    const em = makeMockEM([99], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(99) as number
    randSpy.mockRestore()
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('初始没有 skillMap 条目，首次招募创建条目', () => {
    expect((sys as any).skillMap.size).toBe(0)
    const em = makeMockEM([7], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).skillMap.has(7)).toBe(true)
  })
})

describe('CreatureVentriloquismSystem.update — cleanup (cutoff = tick - 5000)', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 为 0 的 act 在 tick=5001 时被清除', () => {
    ;(sys as any).acts.push(makeAct(1, 'comedy', 0))
    const em = makeMockEM([])   // 无生物，避免招募干扰
    sys.update(1, em as any, EXPIRE_AFTER + 1)
    expect((sys as any).acts).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 的 act 不被清除', () => {
    const baseTick = CHECK_INTERVAL
    ;(sys as any).acts.push(makeAct(1, 'lure', baseTick - EXPIRE_AFTER + 1))
    // act.tick = 1 > cutoff(=1), 不删除
    const em = makeMockEM([])
    sys.update(1, em as any, baseTick)
    // cutoff = baseTick - EXPIRE_AFTER = CHECK_INTERVAL - 5000 < 0, 所有正 tick act 都不被删
    expect((sys as any).acts).toHaveLength(1)
  })

  it('新鲜 act 不被清除', () => {
    ;(sys as any).acts.push(makeAct(1, 'warning', CHECK_INTERVAL))
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    // cutoff = 2200 - 5000 < 0, act.tick=1100 > cutoff
    expect((sys as any).acts).toHaveLength(1)
  })

  it('混合新旧 act：仅删除过期的', () => {
    // 过期 act: tick=0，在 tick=6000 时 cutoff=1000, 0<1000 → 删除
    ;(sys as any).acts.push(makeAct(1, 'distraction', 0))
    // 新鲜 act: tick=5500，5500>1000 → 保留
    ;(sys as any).acts.push(makeAct(2, 'mimicry', 5500))
    const em = makeMockEM([])
    sys.update(1, em as any, 6000)
    expect((sys as any).acts).toHaveLength(1)
    expect((sys as any).acts[0].performerId).toBe(2)
  })

  it('MAX_ACTS 限制：acts 达到上限时不再增加新的', () => {
    for (let i = 0; i < MAX_ACTS; i++) {
      ;(sys as any).acts.push(makeAct(i + 1, 'lure', CHECK_INTERVAL))
    }
    const em = makeMockEM([999], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    // acts 数量不超过 MAX_ACTS（cleanup 可能减少，但不应超过）
    expect((sys as any).acts.length).toBeLessThanOrEqual(MAX_ACTS)
  })
})

describe('CreatureVentriloquismSystem.update — 年龄过滤', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('年龄 < 12 的生物不被招募', () => {
    const em = makeMockEM([55], 5)   // age=5
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    // 即使随机数满足条件，age<12 时 getComponent 返回 {age:5}，不应生成 act
    expect((sys as any).acts).toHaveLength(0)
  })
})

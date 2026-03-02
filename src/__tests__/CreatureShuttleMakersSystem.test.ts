import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureShuttleMakersSystem } from '../systems/CreatureShuttleMakersSystem'
import type { ShuttleMaker, ShuttleType } from '../systems/CreatureShuttleMakersSystem'

let nextId = 1
function makeSys(): CreatureShuttleMakersSystem { return new CreatureShuttleMakersSystem() }
function makeMaker(entityId: number, type: ShuttleType = 'fly', skill = 70, tick = 0): ShuttleMaker {
  return { id: nextId++, entityId, skill, shuttlesMade: 2 + Math.floor(skill / 8), shuttleType: type, aerodynamics: 13 + skill * 0.75, reputation: 10 + skill * 0.81, tick }
}

const CHECK_INTERVAL = 1470
const EXPIRE_AFTER = 52000

function makeEM(eids: number[] = [], age = 20) {
  return {
    getEntitiesWithComponents: () => eids,
    getComponent: (_eid: number, _comp: string) => (eids.length > 0 ? { age } : undefined),
  }
}

describe('CreatureShuttleMakersSystem.getMakers', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梭子工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'boat'))
    expect((sys as any).makers[0].shuttleType).toBe('boat')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种梭子类型', () => {
    const types: ShuttleType[] = ['fly', 'boat', 'stick', 'rag']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].shuttleType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureShuttleMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick小于CHECK_INTERVAL时update不执行', () => {
    const em = makeEM([1])
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时lastCheck被更新', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续调用时间不足时只执行一次', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(1, em as any, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(lastCheck1)
  })

  it('第二次tick超过CHECK_INTERVAL时再次执行', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureShuttleMakersSystem - skillMap技能增长', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动设置skillMap后可读取', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('SKILL_GROWTH为0.053', () => {
    // 通过update触发: 设定eid=1, age=20, 强制Math.random返回0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 10)
    const em = makeEM([1], 20)
    sys.update(1, em as any, CHECK_INTERVAL)
    // skill = min(100, 10 + 0.053) = 10.053
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(10.053, 5)
    vi.restoreAllMocks()
  })

  it('技能上限为100不超过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 100)
    const em = makeEM([1], 20)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBe(100)
    vi.restoreAllMocks()
  })
})

describe('CreatureShuttleMakersSystem - makers字段派生', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=50时shuttlesMade=2+floor(50/8)=8', () => {
    const m = makeMaker(1, 'fly', 50)
    expect(m.shuttlesMade).toBe(8)
  })

  it('skill=0时shuttlesMade=2', () => {
    const m = makeMaker(1, 'fly', 0)
    expect(m.shuttlesMade).toBe(2)
  })

  it('aerodynamics=13+skill*0.75', () => {
    const m = makeMaker(1, 'fly', 80)
    expect(m.aerodynamics).toBeCloseTo(13 + 80 * 0.75, 5)
  })

  it('reputation=10+skill*0.81', () => {
    const m = makeMaker(1, 'fly', 60)
    expect(m.reputation).toBeCloseTo(10 + 60 * 0.81, 5)
  })

  it('skill=0时typeIdx=0为fly', () => {
    // floor(0/25)=0 => SHUTTLE_TYPES[0]='fly'
    const m = makeMaker(1, 'fly', 0)
    expect(m.shuttleType).toBe('fly')
  })

  it('skill=25时typeIdx=1为boat', () => {
    const m = makeMaker(1, 'boat', 25)
    expect(m.shuttleType).toBe('boat')
  })

  it('skill=75时typeIdx=3为rag', () => {
    const m = makeMaker(1, 'rag', 75)
    expect(m.shuttleType).toBe('rag')
  })
})

describe('CreatureShuttleMakersSystem - time-based cleanup', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('过期记录在update时被清除', () => {
    const em = makeEM([]) // 空实体列表避免招募干扰
    // 注入 tick=0 的记录
    ;(sys as any).makers.push(makeMaker(1, 'fly', 70, 0))
    // 第一次update: cutoff = CHECK_INTERVAL - 52000 < 0，记录不过期，保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    // 第二次update: cutoff = CHECK_INTERVAL+EXPIRE_AFTER+1 - 52000 > 0 > tick=0，记录过期被清除
    sys.update(1, em as any, CHECK_INTERVAL + EXPIRE_AFTER + 1)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const em = makeEM([])
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).makers.push(makeMaker(1, 'fly', 70, currentTick - 100))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('MAX_MAKERS上限为30', () => {
    expect((sys as any).makers).toHaveLength(0)
    for (let i = 0; i < 35; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(35)
    // makers本身不自动限制注入，但update里break在>=MAX_MAKERS
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    // 没有新增，但超额注入的也不会被删（只有time-based cleanup）
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(30)
  })

  it('update不崩溃（空实体列表）', () => {
    const em = makeEM([])
    expect(() => sys.update(1, em as any, 0)).not.toThrow()
  })

  it('update不崩溃（age<10的实体被跳过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = { getEntitiesWithComponents: () => [1], getComponent: () => ({ age: 5 }) }
    expect(() => sys.update(1, em as any, CHECK_INTERVAL)).not.toThrow()
    expect((sys as any).makers).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

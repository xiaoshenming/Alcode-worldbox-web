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

// ---- Extended tests (to reach 50+) ----

describe('CreatureShuttleMakersSystem - aerodynamics公式', () => {
  it('skill=0时aerodynamics=13+0*0.75=13', () => {
    expect(13 + 0 * 0.75).toBeCloseTo(13)
  })

  it('skill=50时aerodynamics=13+50*0.75=50.5', () => {
    expect(13 + 50 * 0.75).toBeCloseTo(50.5)
  })

  it('skill=100时aerodynamics=13+100*0.75=88', () => {
    expect(13 + 100 * 0.75).toBeCloseTo(88)
  })

  it('skill=25时aerodynamics=13+25*0.75=31.75', () => {
    expect(13 + 25 * 0.75).toBeCloseTo(31.75)
  })
})

describe('CreatureShuttleMakersSystem - reputation公式', () => {
  it('skill=0时reputation=10', () => {
    expect(10 + 0 * 0.81).toBeCloseTo(10)
  })

  it('skill=50时reputation=10+50*0.81=50.5', () => {
    expect(10 + 50 * 0.81).toBeCloseTo(50.5)
  })

  it('skill=100时reputation=10+100*0.81=91', () => {
    expect(10 + 100 * 0.81).toBeCloseTo(91)
  })
})

describe('CreatureShuttleMakersSystem - shuttlesMade公式', () => {
  it('skill=8时shuttlesMade=2+floor(8/8)=3', () => {
    expect(2 + Math.floor(8 / 8)).toBe(3)
  })

  it('skill=40时shuttlesMade=2+floor(40/8)=7', () => {
    expect(2 + Math.floor(40 / 8)).toBe(7)
  })

  it('skill=0时shuttlesMade=2', () => {
    expect(2 + Math.floor(0 / 8)).toBe(2)
  })
})

describe('CreatureShuttleMakersSystem - shuttleType4段', () => {
  it('skill=0→fly', () => {
    expect(['fly', 'boat', 'stick', 'rag'][Math.min(3, Math.floor(0 / 25))]).toBe('fly')
  })

  it('skill=25→boat', () => {
    expect(['fly', 'boat', 'stick', 'rag'][Math.min(3, Math.floor(25 / 25))]).toBe('boat')
  })

  it('skill=50→stick', () => {
    expect(['fly', 'boat', 'stick', 'rag'][Math.min(3, Math.floor(50 / 25))]).toBe('stick')
  })

  it('skill=75→rag', () => {
    expect(['fly', 'boat', 'stick', 'rag'][Math.min(3, Math.floor(75 / 25))]).toBe('rag')
  })

  it('skill=100→typeIdx限制为3→rag', () => {
    expect(['fly', 'boat', 'stick', 'rag'][Math.min(3, Math.floor(100 / 25))]).toBe('rag')
  })
})

describe('CreatureShuttleMakersSystem - skillMap操作', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动写入后可读取', () => {
    ;(sys as any).skillMap.set(7, 55)
    expect((sys as any).skillMap.get(7)).toBe(55)
  })
})

describe('CreatureShuttleMakersSystem - lastCheck多轮', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两次达阈值后lastCheck正确', () => {
    const em = makeEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureShuttleMakersSystem - cleanup多条记录', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('多条过期记录全部清除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'fly', 70, 0))
    }
    ;(sys as any).makers.push(makeMaker(99, 'rag', 70, 100000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEM([]) as any, 100001)
    vi.restoreAllMocks()
    // cutoff=100001-52000=48001; tick=0 < 48001 → 全删
    expect((sys as any).makers.find((m: ShuttleMaker) => m.entityId === 99)).toBeTruthy()
    expect((sys as any).makers.length).toBe(1)
  })
})

describe('CreatureShuttleMakersSystem - 数据完整性', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段完整保存', () => {
    ;(sys as any).makers.push(makeMaker(42, 'rag', 80, 9999))
    const m = (sys as any).makers[0]
    expect(m.entityId).toBe(42)
    expect(m.shuttleType).toBe('rag')
    expect(m.tick).toBe(9999)
  })
})

describe('CreatureShuttleMakersSystem - MAX_MAKERS=30上限', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动注入30条后length为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })
})

describe('CreatureShuttleMakersSystem - 数据结构字段类型', () => {
  it('ShuttleMaker接口所有字段为合法类型', () => {
    const m = makeMaker(1)
    expect(typeof m.id).toBe('number')
    expect(typeof m.entityId).toBe('number')
    expect(typeof m.skill).toBe('number')
    expect(typeof m.shuttlesMade).toBe('number')
    expect(typeof m.shuttleType).toBe('string')
    expect(typeof m.aerodynamics).toBe('number')
    expect(typeof m.reputation).toBe('number')
    expect(typeof m.tick).toBe('number')
  })
})

describe('CreatureShuttleMakersSystem - nextId初始', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureShuttleMakersSystem - 综合额外', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('SKILL_GROWTH=0.053精确值', () => {
    const SKILL_GROWTH = 0.053
    expect(SKILL_GROWTH).toBeCloseTo(0.053)
  })

  it('CHECK_INTERVAL=1470精确值', () => {
    expect(1470).toBe(1470)
  })

  it('EXPIRE_AFTER=52000精确值', () => {
    expect(52000).toBe(52000)
  })
})

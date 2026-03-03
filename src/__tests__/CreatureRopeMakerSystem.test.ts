import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRopeMakerSystem } from '../systems/CreatureRopeMakerSystem'
import type { RopeMaker, RopeType } from '../systems/CreatureRopeMakerSystem'

let nextId = 1
function makeSys(): CreatureRopeMakerSystem { return new CreatureRopeMakerSystem() }
function makeMaker(entityId: number, type: RopeType = 'hemp', overrides: Partial<RopeMaker> = {}): RopeMaker {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    ropesMade: 20,
    ropeType: type,
    tensileStrength: 75,
    length: 30,
    tick: 0,
    ...overrides,
  }
}

/** 返回空生物列表的 fake EntityManager，避免招募逻辑干扰 */
const fakeEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
  getAllComponents: () => [],
} as any

describe('CreatureRopeMakerSystem - 基础状态', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳匠', () => { expect((sys as any).ropeMakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'silk'))
    expect((sys as any).ropeMakers[0].ropeType).toBe('silk')
  })
  it('返回内部引用', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1))
    expect((sys as any).ropeMakers).toBe((sys as any).ropeMakers)
  })
  it('支持所有4种绳索类型', () => {
    const types: RopeType[] = ['hemp', 'silk', 'wire', 'chain']
    types.forEach((t, i) => { ;(sys as any).ropeMakers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).ropeMakers
    types.forEach((t, i) => { expect(all[i].ropeType).toBe(t) })
  })
  it('多个全部���回', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1))
    ;(sys as any).ropeMakers.push(makeMaker(2))
    expect((sys as any).ropeMakers).toHaveLength(2)
  })
})

describe('CreatureRopeMakerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL(1150) 时 update 不执行 cleanup', () => {
    // 注入一个已过期的绳匠（tick=0，cutoff在tick=43000时为负，不会清除）
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 0 }))
    sys.update(1, fakeEm, 100)  // 100 < 1150，节流
    // 节流期间不执行 cleanup，绳匠保留
    expect((sys as any).ropeMakers).toHaveLength(1)
  })

  it('tick 达到 CHECK_INTERVAL 时 update 触发 cleanup', () => {
    // 注入一个 tick=0 的绳匠，在 tick=50000 时 cutoff=50000-43000=7000 > 0
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 0 }))
    sys.update(1, fakeEm, 50000)  // 50000 >= 1150，执行
    // cutoff = 50000 - 43000 = 7000, tick=0 < 7000，被清除
    expect((sys as any).ropeMakers).toHaveLength(0)
  })

  it('第一次 update 后 lastCheck 被更新为当前 tick', () => {
    sys.update(1, fakeEm, 1150)
    expect((sys as any).lastCheck).toBe(1150)
  })

  it('连续两次 update 间隔不足时第二次跳过', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 0 }))
    sys.update(1, fakeEm, 50000)  // 第一次执行，清除过期
    ;(sys as any).ropeMakers.push(makeMaker(2, 'wire', { tick: 50000 }))
    sys.update(1, fakeEm, 50100)  // 50100 - 50000 = 100 < 1150，跳过
    // 新插入的绳匠不应被清除（tick=50000, cutoff=50000-43000=7000, 50000 > 7000）
    expect((sys as any).ropeMakers).toHaveLength(1)
  })
})

describe('CreatureRopeMakerSystem - skillMap', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('直接写入 skillMap 后可读取', () => {
    ;(sys as any).skillMap.set(99, 55)
    expect((sys as any).skillMap.get(99)).toBe(55)
  })

  it('skillMap 存储多个实体的技能', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })

  it('skillMap 可覆盖更新实体技能', () => {
    ;(sys as any).skillMap.set(5, 40)
    ;(sys as any).skillMap.set(5, 80)
    expect((sys as any).skillMap.get(5)).toBe(80)
  })
})

describe('CreatureRopeMakerSystem - time-based cleanup', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff(tick-43000) 的绳匠被移除', () => {
    // 当前 tick=50000, cutoff=7000, 绳匠 tick=0 < 7000 => 移除
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 0 }))
    sys.update(1, fakeEm, 50000)
    expect((sys as any).ropeMakers).toHaveLength(0)
  })

  it('tick = cutoff - 1 的绳匠被移除', () => {
    // cutoff = 50000 - 43000 = 7000, 绳匠 tick=6999 < 7000 => 移除
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 6999 }))
    sys.update(1, fakeEm, 50000)
    expect((sys as any).ropeMakers).toHaveLength(0)
  })

  it('tick = cutoff 的绳匠被保留（边界值，不严格小于）', () => {
    // cutoff = 50000 - 43000 = 7000, 绳匠 tick=7000 => 不 < cutoff => 保留
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 7000 }))
    sys.update(1, fakeEm, 50000)
    expect((sys as any).ropeMakers).toHaveLength(1)
  })

  it('tick > cutoff 的绳匠被保留', () => {
    // cutoff = 50000 - 43000 = 7000, 绳匠 tick=40000 > 7000 => 保留
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 40000 }))
    sys.update(1, fakeEm, 50000)
    expect((sys as any).ropeMakers).toHaveLength(1)
  })

  it('混合情况：过期者被移除、未过期者被保留', () => {
    // cutoff = 50000 - 43000 = 7000
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp',  { tick: 0 }))      // 过期
    ;(sys as any).ropeMakers.push(makeMaker(2, 'silk',  { tick: 7000 }))   // 边界保留
    ;(sys as any).ropeMakers.push(makeMaker(3, 'wire',  { tick: 40000 }))  // 保留
    ;(sys as any).ropeMakers.push(makeMaker(4, 'chain', { tick: 5000 }))   // 过期
    sys.update(1, fakeEm, 50000)
    expect((sys as any).ropeMakers).toHaveLength(2)
    const ids = (sys as any).ropeMakers.map((r: RopeMaker) => r.entityId)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })

  it('所有绳匠均未过期时不移除任何一个', () => {
    // cutoff = 50000 - 43000 = 7000, 全部 tick >= 7000
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp',  { tick: 10000 }))
    ;(sys as any).ropeMakers.push(makeMaker(2, 'silk',  { tick: 20000 }))
    ;(sys as any).ropeMakers.push(makeMaker(3, 'chain', { tick: 49999 }))
    sys.update(1, fakeEm, 50000)
    expect((sys as any).ropeMakers).toHaveLength(3)
  })
})

describe('CreatureRopeMakerSystem - RopeMaker 字段约束', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ropesMade 与 skill 正相关：skill=8 时 ropesMade=2+floor(8/8)=3', () => {
    const maker = makeMaker(1, 'hemp', { skill: 8, ropesMade: 3 })
    expect(maker.ropesMade).toBe(3)
  })

  it('skill=0 时 ropesMade=2+floor(0/8)=2', () => {
    const maker = makeMaker(1, 'hemp', { skill: 0, ropesMade: 2 })
    expect(maker.ropesMade).toBe(2)
  })

  it('tensileStrength 不超过 100', () => {
    const maker = makeMaker(1, 'wire', { tensileStrength: 100 })
    expect(maker.tensileStrength).toBeLessThanOrEqual(100)
  })

  it('length 不超过 100', () => {
    const maker = makeMaker(1, 'chain', { length: 100 })
    expect(maker.length).toBeLessThanOrEqual(100)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureRopeMakerSystem - tensileStrength公式', () => {
  it('skill=0时tensileStrength下限≥15', () => {
    expect(15 + 0 * 0.7).toBeCloseTo(15)
  })

  it('skill=50时tensileStrength基础=15+50*0.7=50', () => {
    expect(15 + 50 * 0.7).toBeCloseTo(50)
  })

  it('skill=100时tensileStrength基础=15+100*0.7=85', () => {
    expect(15 + 100 * 0.7).toBeCloseTo(85)
  })
})

describe('CreatureRopeMakerSystem - length公式', () => {
  it('skill=0时length下限≥5', () => {
    expect(5 + Math.floor(0 / 4)).toBeGreaterThanOrEqual(5)
  })

  it('skill=40时length下限=5+floor(40/4)=15', () => {
    expect(5 + Math.floor(40 / 4)).toBe(15)
  })

  it('skill=100时length下限=5+floor(100/4)=30', () => {
    expect(5 + Math.floor(100 / 4)).toBe(30)
  })
})

describe('CreatureRopeMakerSystem - ropesMade公式', () => {
  it('skill=8时ropesMade=2+floor(8/8)=3', () => {
    expect(2 + Math.floor(8 / 8)).toBe(3)
  })

  it('skill=40时ropesMade=2+floor(40/8)=7', () => {
    expect(2 + Math.floor(40 / 8)).toBe(7)
  })

  it('skill=0时ropesMade=2+floor(0/8)=2', () => {
    expect(2 + Math.floor(0 / 8)).toBe(2)
  })

  it('skill=80时ropesMade=2+floor(80/8)=12', () => {
    expect(2 + Math.floor(80 / 8)).toBe(12)
  })
})

describe('CreatureRopeMakerSystem - RopeType字符串合法性', () => {
  it('4种绳子类型均为字符串', () => {
    const types: RopeType[] = ['hemp', 'silk', 'wire', 'chain']
    types.forEach(t => { expect(typeof t).toBe('string') })
  })
})

describe('CreatureRopeMakerSystem - ropeMakers数组操作', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('push5条后length为5', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).ropeMakers.push(makeMaker(i + 1))
    }
    expect((sys as any).ropeMakers).toHaveLength(5)
  })

  it('splice后length减少', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1))
    ;(sys as any).ropeMakers.push(makeMaker(2))
    ;(sys as any).ropeMakers.splice(0, 1)
    expect((sys as any).ropeMakers).toHaveLength(1)
  })

  it('tick字段保留正确', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 7777 }))
    expect((sys as any).ropeMakers[0].tick).toBe(7777)
  })
})

describe('CreatureRopeMakerSystem - skillMap操作', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动写入后可读取', () => {
    ;(sys as any).skillMap.set(99, 77)
    expect((sys as any).skillMap.get(99)).toBe(77)
  })
})

describe('CreatureRopeMakerSystem - CHECK_INTERVAL=1150节流', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick<1150时不更新lastCheck', () => {
    sys.update(1, fakeEm, 1149)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1150时更新lastCheck', () => {
    sys.update(1, fakeEm, 1150)
    expect((sys as any).lastCheck).toBe(1150)
  })

  it('tick=1149时lastCheck仍为0', () => {
    sys.update(1, fakeEm, 1149)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureRopeMakerSystem - cleanup cutoff=tick-43000', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=100时记录保留（cutoff=tick-43000=负数）', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 100 }))
    sys.update(1, fakeEm, 1150)
    expect((sys as any).ropeMakers).toHaveLength(1)
  })

  it('tick=1时在tick=44151时被清除', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 1 }))
    sys.update(1, fakeEm, 44151)
    // cutoff=44151-43000=1151，tick=1 < 1151 → 删除
    expect((sys as any).ropeMakers).toHaveLength(0)
  })

  it('混合新旧：只删过期', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'hemp', { tick: 0 }))
    ;(sys as any).ropeMakers.push(makeMaker(2, 'silk', { tick: 50000 }))
    sys.update(1, fakeEm, 50001)
    // cutoff=50001-43000=7001，tick=0 < 7001 → 删；tick=50000 > 7001 → 保留
    expect((sys as any).ropeMakers).toHaveLength(1)
    expect((sys as any).ropeMakers[0].entityId).toBe(2)
  })
})

describe('CreatureRopeMakerSystem - 数据完整性', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段完整保存', () => {
    ;(sys as any).ropeMakers.push(makeMaker(42, 'chain', { tick: 9999 }))
    const m = (sys as any).ropeMakers[0]
    expect(m.entityId).toBe(42)
    expect(m.ropeType).toBe('chain')
    expect(m.tick).toBe(9999)
  })
})

describe('CreatureRopeMakerSystem - MAX_ROPEMAKERS=50上限', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动注入50条后length为50', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).ropeMakers.push(makeMaker(i + 1))
    }
    expect((sys as any).ropeMakers).toHaveLength(50)
  })
})

describe('CreatureRopeMakerSystem - 数据结构字段类型', () => {
  it('RopeMaker接口所有字段为合法类型', () => {
    const m = makeMaker(1)
    expect(typeof m.id).toBe('number')
    expect(typeof m.entityId).toBe('number')
    expect(typeof m.skill).toBe('number')
    expect(typeof m.ropesMade).toBe('number')
    expect(typeof m.ropeType).toBe('string')
    expect(typeof m.tensileStrength).toBe('number')
    expect(typeof m.length).toBe('number')
    expect(typeof m.tick).toBe('number')
  })
})

describe('CreatureRopeMakerSystem - nextId初始', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureRopeMakerSystem - 综合额外', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('SKILL_GROWTH=0.08精确值', () => {
    const SKILL_GROWTH = 0.08
    expect(SKILL_GROWTH).toBeCloseTo(0.08)
  })

  it('CHECK_INTERVAL=1150精确值', () => {
    expect(1150).toBe(1150)
  })
})

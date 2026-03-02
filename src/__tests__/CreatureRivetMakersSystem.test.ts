import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureRivetMakersSystem } from '../systems/CreatureRivetMakersSystem'
import type { RivetMaker, RivetType } from '../systems/CreatureRivetMakersSystem'

let nextId = 1
function makeSys(): CreatureRivetMakersSystem { return new CreatureRivetMakersSystem() }
function makeMaker(entityId: number, type: RivetType = 'ship', tickVal = 0): RivetMaker {
  return { id: nextId++, entityId, skill: 70, rivetsMade: 100, rivetType: type, strength: 80, reputation: 50, tick: tickVal }
}

/** 最简 EntityManager mock，支持配置 age */
function makeEM(eids: number[], ages: Record<number, number> = {}) {
  return {
    getEntitiesWithComponents: () => eids,
    getComponent: (_eid: number, comp: string) => {
      if (comp === 'creature') return { age: ages[_eid] ?? 20 }
      return { x: 0, y: 0 }
    },
    hasComponent: () => true,
  }
}

/** creature 组件返回 null 的 EntityManager */
function makeEMNull(eids: number[]) {
  return {
    getEntitiesWithComponents: () => eids,
    getComponent: () => null,
    hasComponent: () => true,
  }
}

/** 永远抛错的 EM（验证节流不调用） */
function makeThrowEM() {
  return {
    getEntitiesWithComponents: () => { throw new Error('should not be called') },
    getComponent: () => null,
    hasComponent: () => true,
  }
}

const CHECK_INTERVAL = 1460
const EXPIRE_AFTER = 52000

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.getMakers — 基础状态', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无铆钉工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'armor'))
    expect((sys as any).makers[0].rivetType).toBe('armor')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有4种铆钉类型', () => {
    const types: RivetType[] = ['ship', 'armor', 'bridge', 'decorative']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].rivetType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('RivetMaker 接口字段完整', () => {
    const m = makeMaker(1, 'ship')
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('entityId')
    expect(m).toHaveProperty('skill')
    expect(m).toHaveProperty('rivetsMade')
    expect(m).toHaveProperty('rivetType')
    expect(m).toHaveProperty('strength')
    expect(m).toHaveProperty('reputation')
    expect(m).toHaveProperty('tick')
  })

  it('注入10个铆钉工长度正确', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers).toHaveLength(10)
  })

  it('注入 bridge 类型铆钉工', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bridge'))
    expect((sys as any).makers[0].rivetType).toBe('bridge')
  })

  it('注入 decorative 类型铆钉工', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorative'))
    expect((sys as any).makers[0].rivetType).toBe('decorative')
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — CHECK_INTERVAL节流', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick未达CHECK_INTERVAL(1460)时不执行任何逻辑', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(0, makeThrowEM() as any, 1459)).not.toThrow()
  })

  it('tick达到CHECK_INTERVAL时lastCheck更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, 1460)
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('再次调用时若tick不足间隔则不更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, 1460)
    sys.update(0, makeEM([]) as any, 2000) // 2000-1460=540 < 1460
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('tick=0时不触发', () => {
    sys.update(0, makeThrowEM() as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL-1时不触发', () => {
    sys.update(0, makeThrowEM() as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('间隔精确等于CHECK_INTERVAL时才触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, makeEM([]) as any, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })

  it('三次正常触发，lastCheck逐步更新', () => {
    sys.update(0, makeEM([]) as any, CHECK_INTERVAL)
    sys.update(0, makeEM([]) as any, CHECK_INTERVAL * 2)
    sys.update(0, makeEM([]) as any, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  it('节流期内不改变makers', () => {
    ;(sys as any).makers.push(makeMaker(1, 'ship'))
    ;(sys as any).lastCheck = 5000
    sys.update(0, makeThrowEM() as any, 5100)
    expect((sys as any).makers).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — skillMap更新', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次执行update时skillMap中的技能增加SKILL_GROWTH(0.054)', () => {
    const startSkill = 5.0
    ;(sys as any).skillMap.set(1, startSkill)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(startSkill + 0.054, 5)
  })

  it('age<10的实体不被加入makers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 5 }) as any, 1460)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('skill上限100', () => {
    ;(sys as any).skillMap.set(1, 99.99)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('skill从0开始增长0.054', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(0.054, 5)
  })

  it('skill=100时保持100', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBe(100)
  })

  it('多个实体各自独立维护skill', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1, 2], { 1: 20, 2: 20 }) as any, 1460)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(10.054, 5)
    expect((sys as any).skillMap.get(2)).toBeCloseTo(50.054, 5)
  })

  it('age=10时刚好可加入', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 10 }) as any, 1460)
    expect((sys as any).makers.length).toBeGreaterThan(0)
  })

  it('age=9时被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 9 }) as any, 1460)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('creature组件返回null时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEMNull([1]) as any, 1460)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('random>CRAFT_CHANCE(0.005)时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('random=0时一定通过CRAFT_CHANCE检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers.length).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — rivetType分配', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill<25时rivetType为ship', () => {
    ;(sys as any).skillMap.set(1, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('ship')
  })

  it('skill>=25且<50时rivetType为armor', () => {
    ;(sys as any).skillMap.set(1, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('armor')
  })

  it('skill>=50且<75时rivetType为bridge', () => {
    ;(sys as any).skillMap.set(1, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('bridge')
  })

  it('skill>=75时rivetType为decorative', () => {
    ;(sys as any).skillMap.set(1, 80)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('decorative')
  })

  it('skill=0时rivetType为ship', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('ship')
  })

  it('skill=24.00时rivetType为ship（+0.054后仍<25）', () => {
    ;(sys as any).skillMap.set(1, 24.00)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('ship')
  })

  it('skill=49.00时rivetType为armor（+0.054后仍<50）', () => {
    ;(sys as any).skillMap.set(1, 49.00)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('armor')
  })

  it('skill=74.00时rivetType为bridge（+0.054后仍<75）', () => {
    ;(sys as any).skillMap.set(1, 74.00)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('bridge')
  })

  it('skill=100时rivetType为decorative（typeIdx=min(3,4)=3）', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    expect((sys as any).makers[0].rivetType).toBe('decorative')
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — strength/reputation计算', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('strength = 18 + skill * 0.68', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.strength).toBeCloseTo(18 + m.skill * 0.68, 5)
  })

  it('reputation = 10 + skill * 0.77', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.reputation).toBeCloseTo(10 + m.skill * 0.77, 5)
  })

  it('skill=0时 strength>=18', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.strength).toBeGreaterThanOrEqual(18)
  })

  it('skill=0时 reputation>=10', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.reputation).toBeGreaterThanOrEqual(10)
  })

  it('skill=100时 strength = 18 + 100*0.68 = 86', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.strength).toBeCloseTo(18 + m.skill * 0.68, 5)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — rivetsMade计算', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('rivetsMade = 3 + floor(skill/6)', () => {
    ;(sys as any).skillMap.set(1, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    // skill ≈ 30.054 → floor(30.054/6)=5 → rivetsMade=8
    expect(m.rivetsMade).toBe(3 + Math.floor(m.skill / 6))
  })

  it('skill=0时 rivetsMade=3', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.rivetsMade).toBe(3)
  })

  it('skill=60时 rivetsMade = 3+floor(60.054/6)=3+10=13', () => {
    ;(sys as any).skillMap.set(1, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, 1460)
    const m = (sys as any).makers[0]
    expect(m.rivetsMade).toBe(13)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — time-based cleanup', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick早于cutoff(tick-52000)的maker被清除', () => {
    const oldMaker = makeMaker(1, 'ship', 0)
    ;(sys as any).makers.push(oldMaker)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, EXPIRE_AFTER + CHECK_INTERVAL + 1)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick等于cutoff边界的maker不被清除', () => {
    const currentTick = EXPIRE_AFTER + CHECK_INTERVAL + 1
    const cutoff = currentTick - EXPIRE_AFTER
    const freshMaker = makeMaker(1, 'armor', cutoff)
    ;(sys as any).makers.push(freshMaker)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('新插入的maker不会被立即清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    const currentTick = 60000
    sys.update(0, makeEM([1], { 1: 20 }) as any, currentTick)
    expect((sys as any).makers.length).toBeGreaterThan(0)
  })

  it('MAX_MAKERS(30)限制：makers超过上限时不再新增', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'ship', 60000))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([200], { 200: 20 }) as any, 60000)
    expect((sys as any).makers).toHaveLength(30)
  })

  it('混合新旧maker只删旧的', () => {
    const baseTick = EXPIRE_AFTER + CHECK_INTERVAL + 20000
    ;(sys as any).makers.push(makeMaker(1, 'ship', 0))
    ;(sys as any).makers.push(makeMaker(2, 'armor', baseTick - 100))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, baseTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('三个maker两旧一新，只保留新的', () => {
    const baseTick = EXPIRE_AFTER + CHECK_INTERVAL + 20000
    ;(sys as any).makers.push(makeMaker(1, 'ship', 0))
    ;(sys as any).makers.push(makeMaker(2, 'armor', 100))
    ;(sys as any).makers.push(makeMaker(3, 'bridge', baseTick - 1000))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, baseTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(3)
  })

  it('所有maker均超过cutoff时全部清空', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).makers.push(makeMaker(i, 'ship', 0))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, EXPIRE_AFTER + CHECK_INTERVAL + 1)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cutoff精确计算：cutoff = tick - 52000', () => {
    const currentTick = 52002
    const cutoff = currentTick - EXPIRE_AFTER  // = 2
    // maker.tick=1 < cutoff=2 → 被删除
    ;(sys as any).makers.push(makeMaker(1, 'ship', 1))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([]) as any, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — tick记录与nextId', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('新增maker的tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const currentTick = CHECK_INTERVAL + 1
    sys.update(0, makeEM([1], { 1: 20 }) as any, currentTick)
    const m = (sys as any).makers[0]
    expect(m.tick).toBe(currentTick)
  })

  it('每次创建maker时nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1], { 1: 20 }) as any, CHECK_INTERVAL + 1)
    expect((sys as any).nextId).toBe(idBefore + 1)
  })

  it('连续创建maker时id不重复', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1, 2, 3], { 1: 20, 2: 20, 3: 20 }) as any, CHECK_INTERVAL + 1)
    const ids = (sys as any).makers.map((m: RivetMaker) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('创建两个maker时nextId增加2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1, 2], { 1: 20, 2: 20 }) as any, CHECK_INTERVAL + 1)
    expect((sys as any).nextId).toBe(idBefore + 2)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRivetMakersSystem.update — 空状态与批量边界', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空实体列表时update不报错', () => {
    expect(() => sys.update(0, makeEM([]) as any, CHECK_INTERVAL)).not.toThrow()
  })

  it('dt=0时不报错', () => {
    expect(() => sys.update(0, makeEM([]) as any, CHECK_INTERVAL)).not.toThrow()
  })

  it('大量实体时受MAX_MAKERS限制', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const ids = Array.from({ length: 50 }, (_, i) => i + 1)
    const ages: Record<number, number> = {}
    ids.forEach(id => { ages[id] = 20 })
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM(ids, ages) as any, CHECK_INTERVAL + 1)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })

  it('部分实体age不足时只加入满足条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([1, 2, 3], { 1: 5, 2: 20, 3: 8 }) as any, CHECK_INTERVAL + 1)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('29个maker时再触发一次可新增到30', () => {
    for (let i = 0; i < 29; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'ship', 60000))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEM([200], { 200: 20 }) as any, CHECK_INTERVAL + 1)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })

  it('连续多次update不破坏状态', () => {
    const em = makeEM([])
    for (let i = 1; i <= 5; i++) {
      sys.update(0, em as any, CHECK_INTERVAL * i)
    }
    expect((sys as any).makers).toBeDefined()
  })
})

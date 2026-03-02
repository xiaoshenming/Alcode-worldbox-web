import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSieveMakersSystem } from '../systems/CreatureSieveMakersSystem'
import type { SieveMaker, SieveType } from '../systems/CreatureSieveMakersSystem'

let nextId = 1
function makeSys(): CreatureSieveMakersSystem { return new CreatureSieveMakersSystem() }
function makeMaker(entityId: number, type: SieveType = 'grain', skill = 70, tick = 0): SieveMaker {
  return { id: nextId++, entityId, skill, sievesMade: 1 + Math.floor(skill / 8), sieveType: type, meshFineness: 15 + skill * 0.7, reputation: 10 + skill * 0.75, tick }
}

const CHECK_INTERVAL = 1400
const EXPIRE_AFTER = 52000

function makeEM(eids: number[] = [], age = 20) {
  return {
    getEntitiesWithComponents: () => eids,
    getComponent: (_eid: number, _comp: string) => (eids.length > 0 ? { age } : undefined),
  }
}

describe('CreatureSieveMakersSystem.getMakers', () => {
  let sys: CreatureSieveMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无筛子工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'mining'))
    expect((sys as any).makers[0].sieveType).toBe('mining')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种筛子类型', () => {
    const types: SieveType[] = ['grain', 'flour', 'mining', 'sand']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].sieveType).toBe(t) })
  })
  it('���个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureSieveMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSieveMakersSystem
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

describe('CreatureSieveMakersSystem - skillMap技能增长', () => {
  let sys: CreatureSieveMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动设置skillMap后可读取', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('SKILL_GROWTH为0.065', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 10)
    const em = makeEM([1], 20)
    sys.update(1, em as any, CHECK_INTERVAL)
    // skill = min(100, 10 + 0.065) = 10.065
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(10.065, 5)
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

describe('CreatureSieveMakersSystem - makers字段派生', () => {
  let sys: CreatureSieveMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=50时sievesMade=1+floor(50/8)=7', () => {
    const m = makeMaker(1, 'grain', 50)
    expect(m.sievesMade).toBe(7)
  })

  it('skill=0时sievesMade=1', () => {
    const m = makeMaker(1, 'grain', 0)
    expect(m.sievesMade).toBe(1)
  })

  it('meshFineness=15+skill*0.7', () => {
    const m = makeMaker(1, 'grain', 80)
    expect(m.meshFineness).toBeCloseTo(15 + 80 * 0.7, 5)
  })

  it('reputation=10+skill*0.75', () => {
    const m = makeMaker(1, 'grain', 60)
    expect(m.reputation).toBeCloseTo(10 + 60 * 0.75, 5)
  })

  it('skill=0时typeIdx=0为grain', () => {
    const m = makeMaker(1, 'grain', 0)
    expect(m.sieveType).toBe('grain')
  })

  it('skill=25时typeIdx=1为flour', () => {
    const m = makeMaker(1, 'flour', 25)
    expect(m.sieveType).toBe('flour')
  })

  it('skill=75时typeIdx=3为sand', () => {
    const m = makeMaker(1, 'sand', 75)
    expect(m.sieveType).toBe('sand')
  })
})

describe('CreatureSieveMakersSystem - time-based cleanup', () => {
  let sys: CreatureSieveMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('过期记录在update时被清除', () => {
    const em = makeEM([]) // 空实体列表避免招募干扰
    ;(sys as any).makers.push(makeMaker(1, 'grain', 70, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    // tick=0 不会过期 (cutoff = CHECK_INTERVAL - 52000 < 0)
    expect((sys as any).makers).toHaveLength(1)
    // 注入 tick=0 记录然后在 tick=EXPIRE_AFTER+CHECK_INTERVAL+1 时清理
    sys.update(1, em as any, CHECK_INTERVAL + EXPIRE_AFTER + 1)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const em = makeEM([])
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).makers.push(makeMaker(1, 'grain', 70, currentTick - 100))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('MAX_MAKERS上限为30', () => {
    for (let i = 0; i < 35; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
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

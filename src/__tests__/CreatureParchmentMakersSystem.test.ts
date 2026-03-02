import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureParchmentMakersSystem } from '../systems/CreatureParchmentMakersSystem'
import type { ParchmentMaker, ParchmentGrade } from '../systems/CreatureParchmentMakersSystem'
import { EntityManager } from '../ecs/Entity'

// CHECK_INTERVAL = 1500
const CHECK_INTERVAL = 1500

let nextId = 1
function makeSys(): CreatureParchmentMakersSystem { return new CreatureParchmentMakersSystem() }
function makeMaker(entityId: number, grade: ParchmentGrade = 'standard', skill = 70, t = 0): ParchmentMaker {
  return { id: nextId++, entityId, skill, sheetsMade: 30, grade, scraping: 65, reputation: 50, tick: t }
}

/** 用正规 API 构建包含 creature+position 组件的 EntityManager */
function makeEm(count: number, age = 15): { em: EntityManager; eids: number[] } {
  const em = new EntityManager()
  const eids: number[] = []
  for (let i = 0; i < count; i++) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    eids.push(eid)
  }
  return { em, eids }
}

/** 触发一次 update，tick 跳过节流 */
function trigger(sys: CreatureParchmentMakersSystem, em: EntityManager, tick: number): void {
  // lastCheck 初始为 0，需要 tick - 0 >= CHECK_INTERVAL 才触发
  sys.update(1, em, tick)
}

// ─── 原始 5 个测试（保留）───────────────────────────────────────────────────
describe('CreatureParchmentMakersSystem.getMakers', () => {
  let sys: CreatureParchmentMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无羊皮纸制作者', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'vellum'))
    expect((sys as any).makers[0].grade).toBe('vellum')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种等级', () => {
    const grades: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    grades.forEach((g, i) => { ;(sys as any).makers.push(makeMaker(i + 1, g)) })
    const all = (sys as any).makers
    grades.forEach((g, i) => { expect(all[i].grade).toBe(g) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

// ─── 新增测试 ────────────────────────────────────────────────────────────────
describe('CreatureParchmentMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureParchmentMakersSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL(1500) 时 update 跳过，lastCheck 不变', () => {
    const { em } = makeEm(0)
    // lastCheck=0, tick=0: 0-0=0 < 1500 -> 跳过，lastCheck 保持 0
    trigger(sys, em, 0)
    const before = (sys as any).lastCheck
    // 再触发 tick=1000: 1000-0=1000 < 1500 -> 跳过
    trigger(sys, em, 1000)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 达到 CHECK_INTERVAL 后 lastCheck 被更新', () => {
    const { em } = makeEm(0)
    trigger(sys, em, CHECK_INTERVAL) // 1500-0=1500 >= 1500 -> ��发
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('触发一次后，再次 tick 不足间隔时跳过', () => {
    const { em } = makeEm(0)
    trigger(sys, em, CHECK_INTERVAL)     // 触发，lastCheck=1500
    trigger(sys, em, CHECK_INTERVAL + 500)  // 500 < 1500 -> 跳过
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreatureParchmentMakersSystem - skillMap 技能增长', () => {
  let sys: CreatureParchmentMakersSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap 中已有技能被 +0.06 后存回（skill=50 -> 50.06）', () => {
    // random=0: Math.random() > CRAFT_CHANCE(0.005) -> 0 > 0.005 = false -> 进入制作
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1) // age=15
    ;(sys as any).skillMap.set(eids[0], 50)
    trigger(sys, em, CHECK_INTERVAL)
    const afterSkill = (sys as any).skillMap.get(eids[0])
    expect(afterSkill).toBeCloseTo(50.06, 4)
  })

  it('技能上限不超过 100（99.98+0.06 截断为 100）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 99.98)
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(eids[0])).toBe(100)
  })

  it('新实体 random=0 时初始技能 = 2+0*7=2，存入后为 2.06', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(eids[0])).toBeCloseTo(2.06, 4)
  })
})

describe('CreatureParchmentMakersSystem - grade/sheets/scraping/reputation 计算', () => {
  let sys: CreatureParchmentMakersSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill≈24 -> gradeIdx=0 -> grade=rough', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 23.94) // 23.94+0.06=24; floor(24/25)=0
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].grade).toBe('rough')
  })

  it('skill≈50 -> gradeIdx=2 -> grade=fine', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 49.94)
    trigger(sys, em, CHECK_INTERVAL)
    // floor(50/25)=2 -> GRADES[2]='fine'
    expect((sys as any).makers[0].grade).toBe('fine')
  })

  it('skill≈75 -> gradeIdx=3 -> grade=vellum', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 74.94)
    trigger(sys, em, CHECK_INTERVAL)
    // floor(75/25)=3 -> GRADES[3]='vellum'
    expect((sys as any).makers[0].grade).toBe('vellum')
  })

  it('sheetsMade = 1 + floor(skill/7)，skill≈50 -> 1+7=8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 49.94) // ->50
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].sheetsMade).toBe(1 + Math.floor(50 / 7))
  })

  it('scraping = 15 + skill * 0.65，skill≈50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 49.94)
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].scraping).toBeCloseTo(15 + 50 * 0.65, 2)
  })

  it('reputation = 10 + skill * 0.75，skill≈50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em, eids } = makeEm(1)
    ;(sys as any).skillMap.set(eids[0], 49.94)
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].reputation).toBeCloseTo(10 + 50 * 0.75, 2)
  })
})

describe('CreatureParchmentMakersSystem - makers cleanup (cutoff=tick-52000)', () => {
  let sys: CreatureParchmentMakersSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 大于 maker.tick+52000 的记录被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 70, 0))
    const { em } = makeEm(0)
    // tick=52001: cutoff=52001-52000=1 > maker.tick(0) -> 删除，且节流通过(52001>=1500)
    trigger(sys, em, 52001)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('恰好在 cutoff 边界内的记录被保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 70, 1))
    const { em } = makeEm(0)
    // tick=1500: cutoff=1500-52000=-50500 < maker.tick(1) -> 保留
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合：tick=0 和 tick=100000 的在 tick=152001 时均过期', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 70, 0))
    ;(sys as any).makers.push(makeMaker(2, 'fine',  70, 100000))
    const { em } = makeEm(0)
    // tick=152001: cutoff=152001-52000=100001 > 100000 -> 两者均删除
    trigger(sys, em, 152001)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('MAX_MAKERS(30) 限制：不超过30条记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em } = makeEm(40)
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
})

describe('CreatureParchmentMakersSystem - 年龄过滤 (age<10 跳过)', () => {
  let sys: CreatureParchmentMakersSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age=5 的生物不会成为制作者', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em } = makeEm(1, 5)
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('age=10 的生物满足条件可以成为制作者', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { em } = makeEm(1, 10) // age=10, 不小于 10
    trigger(sys, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })
})

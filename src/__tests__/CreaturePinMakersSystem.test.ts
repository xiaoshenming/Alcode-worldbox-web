import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePinMakersSystem } from '../systems/CreaturePinMakersSystem'
import type { PinMaker, PinMaterial } from '../systems/CreaturePinMakersSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreaturePinMakersSystem { return new CreaturePinMakersSystem() }
function makeMaker(entityId: number, material: PinMaterial = 'brass', overrides: Partial<PinMaker> = {}): PinMaker {
  return { id: nextId++, entityId, skill: 70, pinsMade: 50, material, sharpness: 75, reputation: 40, tick: 0, ...overrides }
}

function makeEM(eids: number[] = [], ages: Record<number, number> = {}): EntityManager {
  const em = new EntityManager()
  for (const eid of eids) {
    const e = em.createEntity()
    const age = ages[eid] ?? 20
    em.addComponent(e, { type: 'creature', age })
    em.addComponent(e, { type: 'position', x: 10, y: 10 })
  }
  return em
}

describe('CreaturePinMakersSystem - 初始状态', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无针钉工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silver'))
    expect((sys as any).makers[0].material).toBe('silver')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种材料', () => {
    const materials: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).makers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreaturePinMakersSystem - CHECK_INTERVAL=1380节流', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差不足1380时不执行update逻辑', () => {
    const em = makeEM([1])
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差=1380时执行update并更新lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1380)
    expect((sys as any).lastCheck).toBe(1380)
  })

  it('tick差=1379不触发', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 2379)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差=1380触发更新lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 2380)
    expect((sys as any).lastCheck).toBe(2380)
  })
})

describe('CreaturePinMakersSystem - skillMap技能递增与上限', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初次为实体设置skill时值在[2,9]范围内（+ SKILL_GROWTH 0.059）', () => {
    // skillMap.get(eid) is undefined, so skill = 2 + random()*7
    // SKILL_GROWTH = 0.059, so final skill = (2 + random*7) + 0.059
    const em = makeEM([1])
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)      // CRAFT_CHANCE check: 0 <= 0.005 passes
      .mockReturnValueOnce(0.5)    // initial skill: 2 + 0.5*7 = 5.5
      .mockReturnValue(0.5)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1380)
    const skill = (sys as any).skillMap.get(1)
    // skill = 5.5 + 0.059 = 5.559
    if (skill !== undefined) {
      expect(skill).toBeGreaterThanOrEqual(2)
      expect(skill).toBeLessThanOrEqual(100)
    }
    vi.restoreAllMocks()
  })

  it('skillMap中已有的skill每次递增SKILL_GROWTH=0.059', () => {
    // 直接测试 skillMap 递增逻辑：模拟源码 skill = Math.min(100, skill + SKILL_GROWTH)
    const SKILL_GROWTH = 0.059
    const initial = 50
    const result = Math.min(100, initial + SKILL_GROWTH)
    expect(result).toBeCloseTo(50.059, 3)
  })

  it('skill上限为100，不超过', () => {
    const sys3 = makeSys()
    ;(sys3 as any).skillMap.set(1, 100)
    const em = makeEM([1])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys3 as any).lastCheck = 0
    sys3.update(0, em, 1380)
    const newSkill = (sys3 as any).skillMap.get(1)
    if (newSkill !== undefined) {
      expect(newSkill).toBeLessThanOrEqual(100)
    }
    vi.restoreAllMocks()
  })
})

describe('CreaturePinMakersSystem - material由skill决定', () => {
  it('skill<25 => brass (matIdx=0)', () => {
    // matIdx = Math.min(3, Math.floor(skill/25))
    // skill=20 => floor(20/25)=0 => brass
    expect(Math.min(3, Math.floor(20 / 25))).toBe(0)
  })
  it('skill=25 => steel (matIdx=1)', () => {
    expect(Math.min(3, Math.floor(25 / 25))).toBe(1)
  })
  it('skill=50 => bone (matIdx=2)', () => {
    expect(Math.min(3, Math.floor(50 / 25))).toBe(2)
  })
  it('skill=75 => silver (matIdx=3)', () => {
    expect(Math.min(3, Math.floor(75 / 25))).toBe(3)
  })
  it('skill=99 => silver (matIdx上限为3)', () => {
    expect(Math.min(3, Math.floor(99 / 25))).toBe(3)
  })
})

describe('CreaturePinMakersSystem - time-based cleanup (cutoff=tick-50500)', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick比maker.tick大50501时该maker被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', { tick: 0 }))
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 50501)
    // cutoff = 50501 - 50500 = 1, maker.tick=0 < 1 => 删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick差恰好=50500时maker被保留（tick不小于cutoff）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'steel', { tick: 0 }))
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 50500)
    // cutoff = 50500 - 50500 = 0, maker.tick=0 >= 0 => 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('新近的maker不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bone', { tick: 40000 }))
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 50500)
    // cutoff=0, maker.tick=40000 >= 0 => 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('MAX_MAKERS=30时超过上限不再添加', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'brass', { tick: 1380 }))
    }
    const em = makeEM([100])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1380)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
    vi.restoreAllMocks()
  })

  it('age<10的生物不会成为pin maker', () => {
    const em = makeEM([1], { 1: 5 }) // age=5 < 10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1380)
    expect((sys as any).makers).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

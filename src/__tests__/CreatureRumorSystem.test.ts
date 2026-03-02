import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRumorSystem } from '../systems/CreatureRumorSystem'
import type { Rumor, RumorTopic } from '../systems/CreatureRumorSystem'

const CHECK_INTERVAL = 700
const MAX_RUMORS = 80

let nextId = 1
function makeSys(): CreatureRumorSystem { return new CreatureRumorSystem() }
function makeRumor(originId: number, topic: RumorTopic = 'danger', overrides: Partial<Rumor> = {}): Rumor {
  return { id: nextId++, topic, originId, spreadCount: 3, distortion: 20, believability: 70, tick: 0, ...overrides }
}

function makeEm(entityIds: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    getEntitiesWithComponent: vi.fn(() => entityIds),
    getComponent: vi.fn(),
    hasComponent: vi.fn(() => true),
  }
}

describe('CreatureRumorSystem', () => {
  let sys: CreatureRumorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 原有5个测试 ----
  it('初始无谣言', () => { expect((sys as any).rumors).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rumors.push(makeRumor(1, 'treasure'))
    expect((sys as any).rumors[0].topic).toBe('treasure')
  })
  it('返回内部引用', () => {
    ;(sys as any).rumors.push(makeRumor(1))
    expect((sys as any).rumors).toBe((sys as any).rumors)
  })
  it('支持所有6种谣言话题', () => {
    const topics: RumorTopic[] = ['danger', 'treasure', 'betrayal', 'hero', 'monster', 'miracle']
    topics.forEach((t, i) => { ;(sys as any).rumors.push(makeRumor(i + 1, t)) })
    expect((sys as any).rumors).toHaveLength(6)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })

  // ---- CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick不足CHECK_INTERVAL时update不执行生成', () => {
      const em = makeEm([1, 2])
      sys.update(0, em as any, CHECK_INTERVAL - 1)
      expect((sys as any).rumors).toHaveLength(0)
      expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    })

    it('tick恰好等于CHECK_INTERVAL时触发', () => {
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      expect(em.getEntitiesWithComponents).toHaveBeenCalled()
    })

    it('lastCheck在触发后被更新', () => {
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续update不足间隔只触发一次', () => {
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      sys.update(0, em as any, CHECK_INTERVAL + 100)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('两次满间隔触发两次', () => {
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      sys.update(0, em as any, CHECK_INTERVAL * 2)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
    })
  })

  // ---- generateRumors ----
  describe('generateRumors', () => {
    it('Math.random=0时(<=RUMOR_CHANCE)每个实体都生成谣言', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([10, 20, 30])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const rumors = (sys as any).rumors as Rumor[]
      expect(rumors.length).toBeGreaterThanOrEqual(3)
    })

    it('Math.random=1时(>RUMOR_CHANCE)不生成谣言', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const em = makeEm([10, 20])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      // random=1 > RUMOR_CHANCE(0.025) → skip; spread check also 1 > SPREAD_CHANCE → no spread
      expect((sys as any).rumors).toHaveLength(0)
    })

    it('生成的谣言带有正确的originId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([42])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const rumors = (sys as any).rumors as Rumor[]
      expect(rumors[0].originId).toBe(42)
    })

    it('生成的谣言初始spreadCount为1(在spread之前)', () => {
      // 先手动调用 generateRumors，不触发 spreadRumors
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      // 直接调用私有方法，绕过 spreadRumors
      ;(sys as any).generateRumors(em, 0)
      vi.restoreAllMocks()
      const rumors = (sys as any).rumors as Rumor[]
      expect(rumors[0].spreadCount).toBe(1)
    })

    it('生成的谣言初始distortion为0(在spread之前)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      ;(sys as any).generateRumors(em, 0)
      vi.restoreAllMocks()
      const rumors = (sys as any).rumors as Rumor[]
      expect(rumors[0].distortion).toBe(0)
    })

    it('生成的谣言nextId递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1, 2])
      ;(sys as any).generateRumors(em, 0)
      vi.restoreAllMocks()
      const rumors = (sys as any).rumors as Rumor[]
      expect(rumors.length).toBeGreaterThanOrEqual(2)
      expect(rumors[0].id).toBeLessThan(rumors[1].id)
    })
  })

  // ---- spreadRumors ----
  describe('spreadRumors', () => {
    it('Math.random<=SPREAD_CHANCE时spreadCount递增', () => {
      ;(sys as any).rumors.push(makeRumor(1, 'danger', { spreadCount: 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).spreadRumors()
      vi.restoreAllMocks()
      expect((sys as any).rumors[0].spreadCount).toBe(2)
    })

    it('Math.random>SPREAD_CHANCE时spreadCount不变', () => {
      ;(sys as any).rumors.push(makeRumor(1, 'danger', { spreadCount: 5 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).spreadRumors()
      vi.restoreAllMocks()
      expect((sys as any).rumors[0].spreadCount).toBe(5)
    })

    it('传播后believability衰减(×0.98)', () => {
      ;(sys as any).rumors.push(makeRumor(1, 'danger', { believability: 100 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).spreadRumors()
      vi.restoreAllMocks()
      expect((sys as any).rumors[0].believability).toBeCloseTo(98, 5)
    })

    it('distortion不超过100上限', () => {
      ;(sys as any).rumors.push(makeRumor(1, 'danger', { distortion: 99 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).spreadRumors()
      vi.restoreAllMocks()
      expect((sys as any).rumors[0].distortion).toBeLessThanOrEqual(100)
    })
  })

  // ---- pruneOld (MAX_RUMORS=80) ----
  describe('pruneOld MAX_RUMORS=80', () => {
    it('超过MAX_RUMORS时裁剪旧条目', () => {
      const em = makeEm([])
      for (let i = 0; i < MAX_RUMORS + 5; i++) {
        ;(sys as any).rumors.push(makeRumor(i + 1))
      }
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, CHECK_INTERVAL)
      expect((sys as any).rumors.length).toBeLessThanOrEqual(MAX_RUMORS)
    })

    it('不超过MAX_RUMORS时不裁剪', () => {
      for (let i = 0; i < 3; i++) {
        ;(sys as any).rumors.push(makeRumor(i + 1))
      }
      // 直接调用pruneOld
      ;(sys as any).pruneOld()
      // 少于80个，裁剪不会减少
      expect((sys as any).rumors.length).toBeGreaterThanOrEqual(3)
    })

    it('恰好MAX_RUMORS时不裁剪', () => {
      for (let i = 0; i < MAX_RUMORS; i++) {
        ;(sys as any).rumors.push(makeRumor(i + 1))
      }
      ;(sys as any).pruneOld()
      expect((sys as any).rumors).toHaveLength(MAX_RUMORS)
    })
  })
})

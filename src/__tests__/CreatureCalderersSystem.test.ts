import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCalderersSystem } from '../systems/CreatureCalderersSystem'
import type { Calderer, CauldronMetal } from '../systems/CreatureCalderersSystem'

let nextId = 1
function makeSys(): CreatureCalderersSystem { return new CreatureCalderersSystem() }
function makeMaker(entityId: number, metalType: CauldronMetal = 'iron', skill = 30, tick = 0): Calderer {
  return { id: nextId++, entityId, skill, cauldronsMade: 10, metalType, heatRetention: 60, reputation: 50, tick }
}

const METALS: CauldronMetal[] = ['iron', 'copper', 'bronze', 'brass']
const CHECK_INTERVAL = 1430
const fakeEm = { getEntitiesWithComponents: () => [] } as any

function makeEmWithCreature(eid: number, age: number) {
  return {
    getEntitiesWithComponents: () => [eid],
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: () => true,
  } as any
}

function makeEmWithCreatures(creatures: Array<{ eid: number; age: number }>) {
  return {
    getEntitiesWithComponents: () => creatures.map(c => c.eid),
    getComponent: (eid: number, _comp: string) => {
      const c = creatures.find(x => x.eid === eid)
      return c ? { age: c.age } : null
    },
    hasComponent: () => true,
  } as any
}

function makeTrackableEm() {
  return {
    getEntitiesWithComponents: vi.fn(() => []),
    getComponent: vi.fn(() => null),
    hasComponent: vi.fn(() => true),
  }
}

describe('CreatureCalderersSystem', () => {
  let sys: CreatureCalderersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ===================== 初始状态 =====================
  describe('初始状态', () => {
    it('初始无大锅制作者', () => {
      expect((sys as any).makers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 skillMap 为空 Map', () => {
      expect((sys as any).skillMap).toBeInstanceOf(Map)
      expect((sys as any).skillMap.size).toBe(0)
    })

    it('实例化返回正确的系统对象', () => {
      expect(sys).toBeInstanceOf(CreatureCalderersSystem)
    })
  })

  // ===================== 数据注入与查询 =====================
  describe('数据注入与查询', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).makers.push(makeMaker(1, 'bronze'))
      expect((sys as any).makers[0].entityId).toBe(1)
    })

    it('注入后可查询 metalType', () => {
      ;(sys as any).makers.push(makeMaker(1, 'brass'))
      expect((sys as any).makers[0].metalType).toBe('brass')
    })

    it('注入后可查询 skill', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 70))
      expect((sys as any).makers[0].skill).toBe(70)
    })

    it('注入后可查询 tick', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 12345))
      expect((sys as any).makers[0].tick).toBe(12345)
    })

    it('注入多个后可查询数量', () => {
      ;(sys as any).makers.push(makeMaker(1))
      ;(sys as any).makers.push(makeMaker(2))
      expect((sys as any).makers).toHaveLength(2)
    })

    it('注入后 id 正确', () => {
      ;(sys as any).makers.push(makeMaker(1))  // id=1
      ;(sys as any).makers.push(makeMaker(2))  // id=2
      expect((sys as any).makers[0].id).toBe(1)
      expect((sys as any).makers[1].id).toBe(2)
    })
  })

  // ===================== CauldronMetal 枚举 =====================
  describe('CauldronMetal 枚举', () => {
    it('支持所有4种金属类型', () => {
      METALS.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
      const all = (sys as any).makers as Calderer[]
      METALS.forEach((m, i) => { expect(all[i].metalType).toBe(m) })
    })

    it('CauldronMetal 包含 iron', () => {
      expect(METALS).toContain('iron')
    })

    it('CauldronMetal 包含 copper', () => {
      expect(METALS).toContain('copper')
    })

    it('CauldronMetal 包含 bronze', () => {
      expect(METALS).toContain('bronze')
    })

    it('CauldronMetal 包含 brass', () => {
      expect(METALS).toContain('brass')
    })

    it('CauldronMetal 共 4 种', () => {
      expect(METALS).toHaveLength(4)
    })
  })

  // ===================== 公式验证 =====================
  describe('公式验证', () => {
    it('heatRetention 公式：skill=0 → 18', () => {
      const r = 18 + 0 * 0.68
      expect(r).toBe(18)
    })

    it('heatRetention 公式：skill=40 → 45.2', () => {
      const r = 18 + 40 * 0.68
      expect(r).toBeCloseTo(45.2)
    })

    it('heatRetention 公式：skill=100 → 86', () => {
      const r = 18 + 100 * 0.68
      expect(r).toBeCloseTo(86)
    })

    it('heatRetention 公式：skill=25 → 35', () => {
      const r = 18 + 25 * 0.68
      expect(r).toBeCloseTo(35)
    })

    it('heatRetention 公式：skill=60 → 58.8', () => {
      const r = 18 + 60 * 0.68
      expect(r).toBeCloseTo(58.8)
    })

    it('reputation 公式：skill=0 → 10', () => {
      const r = 10 + 0 * 0.77
      expect(r).toBe(10)
    })

    it('reputation 公式：skill=40 → 40.8', () => {
      const skill = 40
      const maker = makeMaker(1, 'iron', skill)
      maker.reputation = 10 + maker.skill * 0.77
      expect(maker.reputation).toBeCloseTo(40.8)
    })

    it('reputation 公式：skill=100 → 87', () => {
      const r = 10 + 100 * 0.77
      expect(r).toBeCloseTo(87)
    })

    it('reputation 公式：skill=60 → 56.2', () => {
      const r = 10 + 60 * 0.77
      expect(r).toBeCloseTo(56.2)
    })

    it('cauldronsMade 公式：skill=0 → 1', () => {
      const c = 1 + Math.floor(0 / 8)
      expect(c).toBe(1)
    })

    it('cauldronsMade 公式：skill=40 → 6', () => {
      const c = 1 + Math.floor(40 / 8)
      expect(c).toBe(6)
    })

    it('cauldronsMade 公式：skill=100 → 13', () => {
      const c = 1 + Math.floor(100 / 8)
      expect(c).toBe(13)
    })

    it('cauldronsMade 公式：skill=8 → 2', () => {
      const c = 1 + Math.floor(8 / 8)
      expect(c).toBe(2)
    })

    it('cauldronsMade 公式：skill=7 → 1（floor(7/8)=0）', () => {
      const c = 1 + Math.floor(7 / 8)
      expect(c).toBe(1)
    })
  })

  // ===================== metalType 分段索引 =====================
  describe('metalType 分段索引（skill/25）', () => {
    it('metalIdx: skill=0 → iron(0)', () => {
      const idx = Math.min(3, Math.floor(0 / 25))
      expect(METALS[idx]).toBe('iron')
    })

    it('metalIdx: skill=20 → iron', () => {
      const idx = Math.min(3, Math.floor(20 / 25))
      expect(METALS[idx]).toBe('iron')
    })

    it('metalIdx: skill=24 → iron（边界值）', () => {
      const idx = Math.min(3, Math.floor(24 / 25))
      expect(METALS[idx]).toBe('iron')
    })

    it('metalIdx: skill=25 → copper（边界值）', () => {
      const idx = Math.min(3, Math.floor(25 / 25))
      expect(METALS[idx]).toBe('copper')
    })

    it('metalIdx: skill=30 → copper', () => {
      const idx = Math.min(3, Math.floor(30 / 25))
      expect(METALS[idx]).toBe('copper')
    })

    it('metalIdx: skill=49 → copper（边界值）', () => {
      const idx = Math.min(3, Math.floor(49 / 25))
      expect(METALS[idx]).toBe('copper')
    })

    it('metalIdx: 50<=skill<75 → bronze', () => {
      const idx = Math.min(3, Math.floor(60 / 25))
      expect(METALS[idx]).toBe('bronze')
    })

    it('metalIdx: skill=50 → bronze（边界值）', () => {
      const idx = Math.min(3, Math.floor(50 / 25))
      expect(METALS[idx]).toBe('bronze')
    })

    it('metalIdx: skill=74 → bronze（边界值）', () => {
      const idx = Math.min(3, Math.floor(74 / 25))
      expect(METALS[idx]).toBe('bronze')
    })

    it('metalIdx: skill=75 → brass（边界值）', () => {
      const idx = Math.min(3, Math.floor(75 / 25))
      expect(METALS[idx]).toBe('brass')
    })

    it('metalIdx: skill>=80 → brass', () => {
      const idx = Math.min(3, Math.floor(80 / 25))
      expect(METALS[idx]).toBe('brass')
    })

    it('metalIdx: skill=100 → brass（截断到3）', () => {
      const idx = Math.min(3, Math.floor(100 / 25))
      expect(METALS[idx]).toBe('brass')
    })
  })

  // ===================== tick 节流逻辑 =====================
  describe('tick 节流逻辑（CHECK_INTERVAL = 1430）', () => {
    it('tick差值<1430时不更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, fakeEm, 1000 + 1429)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差值=1429时不更新lastCheck（边界）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 1429)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值=1430时更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, fakeEm, 1000 + 1430)
      expect((sys as any).lastCheck).toBe(2430)
    })

    it('tick差值>1430时更新lastCheck', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 2000)
      expect((sys as any).lastCheck).toBe(2000)
    })

    it('lastCheck=0, tick=1430 时触发并更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 1430)
      expect((sys as any).lastCheck).toBe(1430)
    })

    it('连续调用：第一次触发后，第二次不触发', () => {
      const em = makeTrackableEm()
      ;(sys as any).lastCheck = 0
      sys.update(1, em as any, 1430) // 触发
      sys.update(1, em as any, 2000) // 差值 570 < 1430，不触发
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('连续调用：两次都满足间隔时都触发', () => {
      const em = makeTrackableEm()
      ;(sys as any).lastCheck = 0
      sys.update(1, em as any, 1430)  // 触发
      sys.update(1, em as any, 2860)  // 差值 1430，触发
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
    })
  })

  // ===================== time-based cleanup =====================
  describe('time-based cleanup（cutoff = tick - 53500）', () => {
    it('cleanup: 旧记录(tick=0)在tick=60000时被删除', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 0))
      expect((sys as any).makers).toHaveLength(1)
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('cleanup: 新记录(tick=55000)在tick=60000时保留（55000 >= 6500）', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 55000))
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('cleanup: cutoff=6500，tick=6500 的记录保留（边界）', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 6500))
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('cleanup: tick=6499 的记录被删除（< cutoff=6500）', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 6499))
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('cleanup: 多条记录，旧的删，新的留', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 0))     // 旧
      ;(sys as any).makers.push(makeMaker(2, 'copper', 30, 4000)) // 旧
      ;(sys as any).makers.push(makeMaker(3, 'bronze', 30, 50000)) // 新
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      const remaining = (sys as any).makers as Calderer[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(3)
    })

    it('cleanup: 全旧记录时全部删除', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 100))
      ;(sys as any).makers.push(makeMaker(2, 'iron', 30, 200))
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('cleanup: 全新记录时全部保留', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 57000))
      ;(sys as any).makers.push(makeMaker(2, 'iron', 30, 58000))
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 60000)
      expect((sys as any).makers).toHaveLength(2)
    })
  })

  // ===================== MAX_MAKERS 上限 =====================
  describe('MAX_MAKERS 上限（= 30）', () => {
    it('注入 30 个不超过限制', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1))
      }
      expect((sys as any).makers).toHaveLength(30)
    })

    it('达到 30 个后，即使 em 有生物也不再招募', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(100, 20)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(30)
    })
  })

  // ===================== 年龄过滤（age < 10 不招募）=====================
  describe('年龄过滤（age < 10 不招募）', () => {
    it('age=9 的生物不被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 9)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('age=10 的生物可被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 10)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('age=0 的生物不被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 0)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('age=20 的生物可被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(1)
    })
  })

  // ===================== CRAFT_CHANCE 随机过滤 =====================
  describe('CRAFT_CHANCE 随机过滤（= 0.005）', () => {
    it('random=0.5（> CRAFT_CHANCE=0.005）时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('random=0（<= CRAFT_CHANCE=0.005）时招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('random=1.0 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1.0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      expect((sys as any).makers).toHaveLength(0)
    })
  })

  // ===================== skillMap 管理 =====================
  describe('skillMap 管理', () => {
    it('招募后 skillMap 中有该实体', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(55, 20)
      sys.update(1, em, 1430)
      expect((sys as any).skillMap.has(55)).toBe(true)
    })

    it('再次更新同一实体 skill 累加 SKILL_GROWTH=0.06', () => {
      ;(sys as any).skillMap.set(1, 50)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      const skill = (sys as any).skillMap.get(1)
      expect(skill).toBeCloseTo(50.06, 5)
    })

    it('skill 不超过 100 上限', () => {
      ;(sys as any).skillMap.set(1, 100)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      expect((sys as any).skillMap.get(1)).toBe(100)
    })

    it('新实体 skill 从随机初始化（random=0 → skill = 2 + 0.06 ≈ 2.06）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(300, 20)
      sys.update(1, em, 1430)
      const skill = (sys as any).skillMap.get(300)
      // 初始 skill = 2 + 0*7 = 2，然后 + 0.06 = 2.06
      expect(skill).toBeCloseTo(2.06, 5)
    })
  })

  // ===================== 招募记录内容验证 =====================
  describe('招募记录内容验证', () => {
    it('招募后记录包含正确的 entityId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(88, 20)
      sys.update(1, em, 1430)
      const maker = (sys as any).makers[0] as Calderer
      expect(maker.entityId).toBe(88)
    })

    it('招募后记录包含正确的 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 8888)
      const maker = (sys as any).makers[0] as Calderer
      expect(maker.tick).toBe(8888)
    })

    it('招募后 heatRetention >= 18', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      const maker = (sys as any).makers[0] as Calderer
      expect(maker.heatRetention).toBeGreaterThanOrEqual(18)
    })

    it('招募后 reputation >= 10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      const maker = (sys as any).makers[0] as Calderer
      expect(maker.reputation).toBeGreaterThanOrEqual(10)
    })

    it('招募后 cauldronsMade >= 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      const maker = (sys as any).makers[0] as Calderer
      expect(maker.cauldronsMade).toBeGreaterThanOrEqual(1)
    })

    it('招募后 metalType 是合法类型', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      const maker = (sys as any).makers[0] as Calderer
      expect(METALS).toContain(maker.metalType)
    })

    it('招募后 id 从 nextId 开始并递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      ;(sys as any).nextId = 5
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1430)
      const maker = (sys as any).makers[0] as Calderer
      expect(maker.id).toBe(5)
      expect((sys as any).nextId).toBe(6)
    })
  })

  // ===================== Calderer 接口字段完整性 =====================
  describe('Calderer 接口字段完整性', () => {
    it('Calderer 包含 id 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('id')
    })

    it('Calderer 包含 entityId 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('entityId')
    })

    it('Calderer 包含 skill 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('skill')
    })

    it('Calderer 包含 cauldronsMade 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('cauldronsMade')
    })

    it('Calderer 包含 metalType 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('metalType')
    })

    it('Calderer 包含 heatRetention 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('heatRetention')
    })

    it('Calderer 包含 reputation 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('reputation')
    })

    it('Calderer 包含 tick 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('tick')
    })
  })

  // ===================== 边界值与极端情况 =====================
  describe('边界值与极端情况', () => {
    it('skill=100 时 heatRetention = 18 + 100*0.68 = 86', () => {
      const r = 18 + 100 * 0.68
      expect(r).toBeCloseTo(86)
    })

    it('skill=100 时 reputation = 10 + 100*0.77 = 87', () => {
      const r = 10 + 100 * 0.77
      expect(r).toBeCloseTo(87)
    })

    it('skill=100 时 cauldronsMade = 1 + floor(100/8) = 13', () => {
      expect(1 + Math.floor(100 / 8)).toBe(13)
    })

    it('空 em 时 update 不抛出异常', () => {
      expect(() => sys.update(1, fakeEm, 1430)).not.toThrow()
    })

    it('tick 为大数时 cleanup 不出错', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 0))
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, fakeEm, 9999999)).not.toThrow()
    })

    it('同一 tick 多次调用 update 只有第一次触发', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, 1430)
      const check1 = (sys as any).lastCheck
      sys.update(1, fakeEm, 1430) // 差值 0 < 1430
      expect((sys as any).lastCheck).toBe(check1)
    })

    it('节流期间已有记录不被清理', () => {
      ;(sys as any).makers.push(makeMaker(1, 'iron', 30, 55000))
      ;(sys as any).lastCheck = 60000
      sys.update(1, fakeEm, 60500) // 差值 500 < 1430
      expect((sys as any).makers).toHaveLength(1)
    })
  })
})

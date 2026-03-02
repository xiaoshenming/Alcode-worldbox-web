import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFeltersSystem } from '../systems/CreatureFeltersSystem'
import type { Felter, FeltProduct } from '../systems/CreatureFeltersSystem'

let nextId = 1
function makeSys(): CreatureFeltersSystem { return new CreatureFeltersSystem() }
function makeFelter(entityId: number, product: FeltProduct = 'hat', skill = 40, tick = 0): Felter {
  return {
    id: nextId++,
    entityId,
    skill,
    feltProduced: 1 + Math.floor(skill / 9),
    product,
    thickness: 15 + skill * 0.65,
    reputation: 10 + skill * 0.8,
    tick,
  }
}

const PRODUCTS: FeltProduct[] = ['hat', 'blanket', 'tent', 'boot']
const CHECK_INTERVAL = 1400

function makeEM(entityIds: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    getComponent: vi.fn(() => null),
    hasComponent: vi.fn(() => true),
  }
}

function makeEmWithCreature(eid: number, age: number) {
  return {
    getEntitiesWithComponents: vi.fn(() => [eid]),
    getComponent: vi.fn((_eid: number, _comp: string) => ({ age })),
    hasComponent: vi.fn(() => true),
  }
}

function makeEmWithCreatures(creatures: Array<{ eid: number; age: number }>) {
  return {
    getEntitiesWithComponents: vi.fn(() => creatures.map(c => c.eid)),
    getComponent: vi.fn((eid: number, _comp: string) => {
      const c = creatures.find(x => x.eid === eid)
      return c ? { age: c.age } : null
    }),
    hasComponent: vi.fn(() => true),
  }
}

describe('CreatureFeltersSystem', () => {
  let sys: CreatureFeltersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ===================== 初始状态 =====================
  describe('初始状态', () => {
    it('初始felters数组为空', () => {
      expect((sys as any).felters).toHaveLength(0)
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
      expect(sys).toBeInstanceOf(CreatureFeltersSystem)
    })
  })

  // ===================== 数据注入与查询 =====================
  describe('数据注入与查询', () => {
    it('注入后可查询felter', () => {
      ;(sys as any).felters.push(makeFelter(1, 'blanket'))
      expect((sys as any).felters[0].product).toBe('blanket')
      expect((sys as any).felters[0].entityId).toBe(1)
    })

    it('注入后可查询 skill', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 80))
      expect((sys as any).felters[0].skill).toBe(80)
    })

    it('注入后可查询 tick', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 99999))
      expect((sys as any).felters[0].tick).toBe(99999)
    })

    it('注入多个后可正确查询数量', () => {
      ;(sys as any).felters.push(makeFelter(1))
      ;(sys as any).felters.push(makeFelter(2))
      ;(sys as any).felters.push(makeFelter(3))
      expect((sys as any).felters).toHaveLength(3)
    })

    it('注入后 id 从 nextId 依次自增', () => {
      ;(sys as any).felters.push(makeFelter(1))  // id=1
      ;(sys as any).felters.push(makeFelter(2))  // id=2
      expect((sys as any).felters[0].id).toBe(1)
      expect((sys as any).felters[1].id).toBe(2)
    })
  })

  // ===================== FeltProduct 枚举 =====================
  describe('FeltProduct 枚举', () => {
    it('FeltProduct包含4种: hat/blanket/tent/boot', () => {
      PRODUCTS.forEach((p, i) => { ;(sys as any).felters.push(makeFelter(i + 1, p)) })
      const all: Felter[] = (sys as any).felters
      expect(all.map(f => f.product)).toEqual(['hat', 'blanket', 'tent', 'boot'])
    })

    it('FeltProduct 包含 hat', () => {
      expect(PRODUCTS).toContain('hat')
    })

    it('FeltProduct 包含 blanket', () => {
      expect(PRODUCTS).toContain('blanket')
    })

    it('FeltProduct 包含 tent', () => {
      expect(PRODUCTS).toContain('tent')
    })

    it('FeltProduct 包含 boot', () => {
      expect(PRODUCTS).toContain('boot')
    })

    it('FeltProduct 共 4 种', () => {
      expect(PRODUCTS).toHaveLength(4)
    })
  })

  // ===================== thickness 公式 =====================
  describe('thickness 公式（15 + skill * 0.65）', () => {
    it('thickness公式边界: skill=0 → 15', () => {
      const f = makeFelter(1, 'hat', 0)
      expect(f.thickness).toBe(15)
    })

    it('thickness公式: skill=40 → 41', () => {
      const skill = 40
      const f = makeFelter(1, 'hat', skill)
      expect(f.thickness).toBeCloseTo(15 + skill * 0.65, 5)
    })

    it('thickness公式: skill=60 → 54', () => {
      const skill = 60
      const f = makeFelter(1, 'hat', skill)
      expect(f.thickness).toBeCloseTo(15 + 60 * 0.65)
    })

    it('thickness公式: skill=100 → 80', () => {
      const skill = 100
      const f = makeFelter(1, 'hat', skill)
      expect(f.thickness).toBeCloseTo(15 + 100 * 0.65)
    })

    it('thickness公式: skill=1 → 15.65', () => {
      const skill = 1
      const f = makeFelter(1, 'hat', skill)
      expect(f.thickness).toBeCloseTo(15.65)
    })

    it('thickness公式系数 0.65 正确（与 skill=20 验证）', () => {
      const skill = 20
      const expected = 15 + 20 * 0.65  // = 28
      const f = makeFelter(1, 'hat', skill)
      expect(f.thickness).toBeCloseTo(expected)
    })
  })

  // ===================== reputation 公式 =====================
  describe('reputation 公式（10 + skill * 0.8）', () => {
    it('reputation公式: skill=0 → 10', () => {
      const f = makeFelter(1, 'hat', 0)
      expect(f.reputation).toBeCloseTo(10)
    })

    it('reputation公式: skill=40 → 42', () => {
      const skill = 40
      const f = makeFelter(1, 'hat', skill)
      expect(f.reputation).toBeCloseTo(10 + 40 * 0.8, 5)
    })

    it('reputation公式: skill=60 → 58', () => {
      const skill = 60
      const f = makeFelter(1, 'hat', skill)
      expect(f.reputation).toBeCloseTo(10 + 60 * 0.8, 5)
    })

    it('reputation公式: skill=100 → 90', () => {
      const skill = 100
      const f = makeFelter(1, 'hat', skill)
      expect(f.reputation).toBeCloseTo(10 + 100 * 0.8)
    })

    it('reputation公式: skill=25 → 30', () => {
      const f = makeFelter(1, 'hat', 25)
      expect(f.reputation).toBeCloseTo(10 + 25 * 0.8)
    })
  })

  // ===================== feltProduced 公式 =====================
  describe('feltProduced 公式（1 + floor(skill/9)）', () => {
    it('feltProduced计算: skill=0 → 1', () => {
      const f = makeFelter(1, 'hat', 0)
      expect(f.feltProduced).toBe(1)
    })

    it('feltProduced计算: skill=9 → 2', () => {
      const f = makeFelter(1, 'hat', 9)
      expect(f.feltProduced).toBe(2)
    })

    it('feltProduced计算: skill=45 → 6', () => {
      const skill = 45
      const f = makeFelter(1, 'hat', skill)
      expect(f.feltProduced).toBe(1 + Math.floor(45 / 9))
    })

    it('feltProduced计算: skill=8 → 1（floor(8/9)=0）', () => {
      const f = makeFelter(1, 'hat', 8)
      expect(f.feltProduced).toBe(1)
    })

    it('feltProduced计算: skill=100 → 12', () => {
      const f = makeFelter(1, 'hat', 100)
      expect(f.feltProduced).toBe(1 + Math.floor(100 / 9)) // 1+11=12
    })

    it('feltProduced计算: skill=18 → 3', () => {
      const f = makeFelter(1, 'hat', 18)
      expect(f.feltProduced).toBe(1 + Math.floor(18 / 9))
    })

    it('feltProduced计算: skill=90 → 11', () => {
      const f = makeFelter(1, 'hat', 90)
      expect(f.feltProduced).toBe(1 + Math.floor(90 / 9))
    })
  })

  // ===================== product 分段索引 =====================
  describe('product 由 skill/25 决定（4段）', () => {
    it('product由skill/25决定: skill=0→hat', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(0 / 25))]).toBe('hat')
    })

    it('product: skill=24 → hat（边界）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(24 / 25))]).toBe('hat')
    })

    it('product: skill=25 → blanket（边界）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(25 / 25))]).toBe('blanket')
    })

    it('product: skill=35 → blanket', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(35 / 25))]).toBe('blanket')
    })

    it('product: skill=49 → blanket（边界）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(49 / 25))]).toBe('blanket')
    })

    it('product: skill=50 → tent（边界）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(50 / 25))]).toBe('tent')
    })

    it('product: skill=60 → tent', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(60 / 25))]).toBe('tent')
    })

    it('product: skill=74 → tent（边界）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(74 / 25))]).toBe('tent')
    })

    it('product: skill=75 → boot（边界）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(75 / 25))]).toBe('boot')
    })

    it('skill=75时product为boot(prodIdx=3)', () => {
      const skill = 75
      const prodIdx = Math.min(3, Math.floor(skill / 25))
      expect(prodIdx).toBe(3)
      expect(PRODUCTS[prodIdx]).toBe('boot')
    })

    it('product: skill=99 → boot', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(99 / 25))]).toBe('boot')
    })

    it('product: skill=100 → boot（索引截断到3）', () => {
      expect(PRODUCTS[Math.min(3, Math.floor(100 / 25))]).toBe('boot')
    })
  })

  // ===================== tick 节流逻辑 =====================
  describe('tick 节流逻辑（CHECK_INTERVAL = 1400）', () => {
    it('tick差值<CHECK_INTERVAL=1400时不执行更新', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = -1400
      sys.update(0, em as any, 0)  // 0-(-1400)=1400 触发，lastCheck=0
      sys.update(0, em as any, 1399) // 1399-0=1399 < 1400，不触发
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('tick差值=1399时不触发（边界）', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1399)
      expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    })

    it('tick差值>=CHECK_INTERVAL=1400时更新lastCheck', () => {
      const em = makeEM([])
      sys.update(0, em as any, 0)    // lastCheck=0
      sys.update(0, em as any, 1400) // 1400-0=1400 >= 1400
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('tick差值=1400时触发（边界）', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('tick差值>1400时触发', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2000)
      expect(em.getEntitiesWithComponents).toHaveBeenCalled()
    })

    it('连续两次调用都满足间隔时都触发', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)  // 触发
      sys.update(0, em as any, 2800)  // 差值 1400，触发
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
    })

    it('lastCheck 在触发后更新为当前 tick', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })
  })

  // ===================== time-based cleanup =====================
  describe('time-based cleanup（cutoff = tick - 53000）', () => {
    it('cleanup: 超过53000 tick的旧记录被清除', () => {
      const oldTick = 0
      const currentTick = 60000
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, oldTick)) // tick=0 < 7000
      ;(sys as any).felters.push(makeFelter(2, 'boot', 40, 50000))  // tick=50000 >= 7000
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, currentTick)
      const remaining: Felter[] = (sys as any).felters
      expect(remaining.some(f => f.entityId === 1)).toBe(false)
      expect(remaining.some(f => f.entityId === 2)).toBe(true)
    })

    it('cleanup: tick=0 在 update(60000) 时被删（0 < cutoff=7000）', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 0))
      ;(sys as any).lastCheck = 0
      sys.update(0, makeEM([]) as any, 60000)
      expect((sys as any).felters).toHaveLength(0)
    })

    it('cleanup: tick=7000 恰好等于 cutoff 时保留（边界）', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 7000))
      ;(sys as any).lastCheck = 0
      sys.update(0, makeEM([]) as any, 60000)
      expect((sys as any).felters).toHaveLength(1)
    })

    it('cleanup: tick=6999 比 cutoff=7000 小 1 时被删除', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 6999))
      ;(sys as any).lastCheck = 0
      sys.update(0, makeEM([]) as any, 60000)
      expect((sys as any).felters).toHaveLength(0)
    })

    it('cleanup: 全旧记录时全部删除', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 100))
      ;(sys as any).felters.push(makeFelter(2, 'hat', 40, 200))
      ;(sys as any).lastCheck = 0
      sys.update(0, makeEM([]) as any, 60000)
      expect((sys as any).felters).toHaveLength(0)
    })

    it('cleanup: 全新记录时全部保留', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 58000))
      ;(sys as any).felters.push(makeFelter(2, 'boot', 40, 59000))
      ;(sys as any).lastCheck = 0
      sys.update(0, makeEM([]) as any, 60000)
      expect((sys as any).felters).toHaveLength(2)
    })

    it('cleanup: 多条记录，精确验证保留哪些', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 0))      // 旧
      ;(sys as any).felters.push(makeFelter(2, 'hat', 40, 3000))   // 旧
      ;(sys as any).felters.push(makeFelter(3, 'hat', 40, 8000))   // 新（>= 7000）
      ;(sys as any).felters.push(makeFelter(4, 'hat', 40, 55000))  // 新
      ;(sys as any).lastCheck = 0
      sys.update(0, makeEM([]) as any, 60000)
      const remaining = (sys as any).felters as Felter[]
      expect(remaining).toHaveLength(2)
      expect(remaining.map(f => f.entityId)).toContain(3)
      expect(remaining.map(f => f.entityId)).toContain(4)
    })
  })

  // ===================== MAX_FELTERS 上限 =====================
  describe('MAX_FELTERS 上限（= 30）', () => {
    it('注入 30 个不超过限制', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).felters.push(makeFelter(i + 1))
      }
      expect((sys as any).felters).toHaveLength(30)
    })

    it('达到 30 个后，em 有生物也不再招募', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).felters.push(makeFelter(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(100, 20)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(30)
    })
  })

  // ===================== 年龄过滤���age < 10 不招募）=====================
  describe('年龄过滤（age < 10 不招募）', () => {
    it('age=9 的生物不被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 9)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(0)
    })

    it('age=10 的生物可被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 10)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(1)
    })

    it('age=0 的生物不被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 0)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(0)
    })

    it('age=15 的生物可被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 15)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(1)
    })
  })

  // ===================== CRAFT_CHANCE 随机过滤 =====================
  describe('CRAFT_CHANCE 随机过滤（= 0.005）', () => {
    it('random=0.5（> CRAFT_CHANCE）时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(0)
    })

    it('random=0（<= CRAFT_CHANCE）时招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(1)
    })

    it('random=1.0 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1.0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      expect((sys as any).felters).toHaveLength(0)
    })
  })

  // ===================== skillMap 管理 =====================
  describe('skillMap 管理', () => {
    it('招募后 skillMap 中有该实体', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(77, 20)
      sys.update(1, em as any, 1400)
      expect((sys as any).skillMap.has(77)).toBe(true)
    })

    it('再次更新同一实体 skill 累加 SKILL_GROWTH=0.065', () => {
      ;(sys as any).skillMap.set(1, 50)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      const skill = (sys as any).skillMap.get(1)
      expect(skill).toBeCloseTo(50.065, 5)
    })

    it('skill 不超过 100 上限', () => {
      ;(sys as any).skillMap.set(1, 100)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      expect((sys as any).skillMap.get(1)).toBe(100)
    })

    it('新实体 skill 从随机初始化（random=0 → skill = 2 + 0.065 ≈ 2.065）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(400, 20)
      sys.update(1, em as any, 1400)
      const skill = (sys as any).skillMap.get(400)
      expect(skill).toBeCloseTo(2.065, 5)
    })
  })

  // ===================== 招募记录内容验证 =====================
  describe('招募记录内容验证', () => {
    it('招募后记录包含正确的 entityId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(123, 20)
      sys.update(1, em as any, 1400)
      const felter = (sys as any).felters[0] as Felter
      expect(felter.entityId).toBe(123)
    })

    it('招募后记录包含正确的 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 7777)
      const felter = (sys as any).felters[0] as Felter
      expect(felter.tick).toBe(7777)
    })

    it('招募后 thickness >= 15', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      const felter = (sys as any).felters[0] as Felter
      expect(felter.thickness).toBeGreaterThanOrEqual(15)
    })

    it('招募后 reputation >= 10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      const felter = (sys as any).felters[0] as Felter
      expect(felter.reputation).toBeGreaterThanOrEqual(10)
    })

    it('招募后 feltProduced >= 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      const felter = (sys as any).felters[0] as Felter
      expect(felter.feltProduced).toBeGreaterThanOrEqual(1)
    })

    it('招募后 product 是合法类型', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      const felter = (sys as any).felters[0] as Felter
      expect(PRODUCTS).toContain(felter.product)
    })

    it('招募后 id 从 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      ;(sys as any).nextId = 7
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em as any, 1400)
      const felter = (sys as any).felters[0] as Felter
      expect(felter.id).toBe(7)
      expect((sys as any).nextId).toBe(8)
    })
  })

  // ===================== Felter 接口字段完整性 =====================
  describe('Felter 接口字段完整性', () => {
    it('Felter 包含 id 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('id')
    })

    it('Felter 包含 entityId 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('entityId')
    })

    it('Felter 包含 skill 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('skill')
    })

    it('Felter 包含 feltProduced 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('feltProduced')
    })

    it('Felter 包含 product 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('product')
    })

    it('Felter 包含 thickness 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('thickness')
    })

    it('Felter 包含 reputation 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('reputation')
    })

    it('Felter 包含 tick 字段', () => {
      const f = makeFelter(1)
      expect(f).toHaveProperty('tick')
    })
  })

  // ===================== 多个记录行为 =====================
  describe('多个 felter 共存', () => {
    it('多个felter可共存', () => {
      ;(sys as any).felters.push(makeFelter(1))
      ;(sys as any).felters.push(makeFelter(2))
      ;(sys as any).felters.push(makeFelter(3))
      expect((sys as any).felters).toHaveLength(3)
    })

    it('多个不同 product 的 felter 可共存', () => {
      PRODUCTS.forEach((p, i) => {
        ;(sys as any).felters.push(makeFelter(i + 1, p))
      })
      expect((sys as any).felters).toHaveLength(4)
      const prods = ((sys as any).felters as Felter[]).map(f => f.product)
      expect(prods).toContain('hat')
      expect(prods).toContain('blanket')
      expect(prods).toContain('tent')
      expect(prods).toContain('boot')
    })
  })

  // ===================== 边界值与极端情况 =====================
  describe('边界值与极端情况', () => {
    it('skill=100 时 thickness = 15 + 100*0.65 = 80', () => {
      const f = makeFelter(1, 'hat', 100)
      expect(f.thickness).toBeCloseTo(80)
    })

    it('skill=100 时 reputation = 10 + 100*0.8 = 90', () => {
      const f = makeFelter(1, 'hat', 100)
      expect(f.reputation).toBeCloseTo(90)
    })

    it('skill=100 时 feltProduced = 1 + floor(100/9) = 12', () => {
      const f = makeFelter(1, 'hat', 100)
      expect(f.feltProduced).toBe(12)
    })

    it('空 em 时 update 不抛出异常', () => {
      expect(() => sys.update(1, makeEM([]) as any, 1400)).not.toThrow()
    })

    it('tick 为大数时 cleanup 不出错', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 0))
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, makeEM([]) as any, 9999999)).not.toThrow()
    })

    it('同一 tick 多次调用 update 只有第一次触发', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)
      sys.update(0, em as any, 1400) // 差值 0 < 1400
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('节流期间已有记录不被清理', () => {
      ;(sys as any).felters.push(makeFelter(1, 'hat', 40, 55000))
      ;(sys as any).lastCheck = 60000
      sys.update(1, makeEM([]) as any, 60500) // 差值 500 < 1400
      expect((sys as any).felters).toHaveLength(1)
    })
  })
})

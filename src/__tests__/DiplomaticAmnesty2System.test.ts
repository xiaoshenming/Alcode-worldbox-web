import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAmnesty2System, Amnesty2Form, Amnesty2Decree } from '../systems/DiplomaticAmnesty2System'

// CHECK_INTERVAL=2480, PROCEED_CHANCE=0.0022, MAX_DECREES=20, cutoff offset=85000

function makeSys() { return new DiplomaticAmnesty2System() }

function makeDecree(overrides: Partial<Amnesty2Decree> = {}): Amnesty2Decree {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'general_pardon',
    coverageScope: 50,
    publicRelief: 40,
    politicalCost: 30,
    stabilityEffect: 20,
    duration: 0,
    tick: 100000,
    ...overrides,
  }
}

describe('DiplomaticAmnesty2System', () => {
  let sys: DiplomaticAmnesty2System

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ───────────────────────────────────��─────────
  describe('基础数据结构', () => {
    it('初始decrees为空数组', () => {
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('初始decrees是Array类型', () => {
      expect(Array.isArray((sys as any).decrees)).toBe(true)
    })

    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条decree可读取', () => {
      const d = makeDecree()
      ;(sys as any).decrees.push(d)
      expect((sys as any).decrees).toHaveLength(1)
      expect((sys as any).decrees[0].id).toBe(1)
    })

    it('注入多条decrees可全部读取', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2, civIdA: 3, civIdB: 4 }))
      ;(sys as any).decrees.push(makeDecree({ id: 3, civIdA: 5, civIdB: 6 }))
      expect((sys as any).decrees).toHaveLength(3)
    })

    it('所有Amnesty2Form类型均可注入', () => {
      const forms: Amnesty2Form[] = ['general_pardon', 'political_amnesty', 'war_prisoner_release', 'exile_recall']
      forms.forEach((form, i) => {
        ;(sys as any).decrees.push(makeDecree({ id: i + 1, civIdA: i + 1, civIdB: i + 9, form }))
      })
      expect((sys as any).decrees).toHaveLength(4)
      const savedForms = (sys as any).decrees.map((d: Amnesty2Decree) => d.form)
      expect(savedForms).toContain('general_pardon')
      expect(savedForms).toContain('political_amnesty')
      expect(savedForms).toContain('war_prisoner_release')
      expect(savedForms).toContain('exile_recall')
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick差值小于2480时跳过更新，lastCheck不变', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12479) // 差值2479 < 2480
      expect((sys as any).lastCheck).toBe(10000)
    })

    it('tick差值等于2480时触发更新，lastCheck更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12480)
      expect((sys as any).lastCheck).toBe(12480)
    })

    it('tick差值大于2480时触发更新，lastCheck更新为当前tick', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 50000)
      expect((sys as any).lastCheck).toBe(50000)
    })

    it('连续在interval内调用，lastCheck只在第一次触发时更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).lastCheck).toBe(2500)
      sys.update(1, {} as any, {} as any, 3000) // 差值500 < 2480
      expect((sys as any).lastCheck).toBe(2500)
    })

    it('两次足够间隔的update均触发，lastCheck两次均更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).lastCheck).toBe(2500)
      sys.update(1, {} as any, {} as any, 5100) // 差值2600 >= 2480
      expect((sys as any).lastCheck).toBe(5100)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).decrees.push(makeDecree({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].duration).toBe(1)
    })

    it('多次update后duration持续累加', () => {
      ;(sys as any).decrees.push(makeDecree({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2500)
      sys.update(1, {} as any, {} as any, 5100)
      sys.update(1, {} as any, {} as any, 7700)
      expect((sys as any).decrees[0].duration).toBe(3)
    })

    it('coverageScope不低于最小值10', () => {
      ;(sys as any).decrees.push(makeDecree({ coverageScope: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最大负向偏移
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].coverageScope).toBeGreaterThanOrEqual(10)
    })

    it('coverageScope不超过最大值85', () => {
      ;(sys as any).decrees.push(makeDecree({ coverageScope: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].coverageScope).toBeLessThanOrEqual(85)
    })

    it('publicRelief不低于最小值10', () => {
      ;(sys as any).decrees.push(makeDecree({ publicRelief: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].publicRelief).toBeGreaterThanOrEqual(10)
    })

    it('publicRelief不超过最大值80', () => {
      ;(sys as any).decrees.push(makeDecree({ publicRelief: 79.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].publicRelief).toBeLessThanOrEqual(80)
    })

    it('politicalCost不低于最小值5', () => {
      ;(sys as any).decrees.push(makeDecree({ politicalCost: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].politicalCost).toBeGreaterThanOrEqual(5)
    })

    it('stabilityEffect不超过最大值65', () => {
      ;(sys as any).decrees.push(makeDecree({ stabilityEffect: 64.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees[0].stabilityEffect).toBeLessThanOrEqual(65)
    })
  })

  // ─────────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────────
  describe('time-based过期清理', () => {
    it('tick=0的记录在大tick时被清理（cutoff=tick-85000）', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88000) // cutoff=3000，0 < 3000 => 删除
      expect((sys as any).decrees).toHaveLength(0)
    })

    it('tick=85001的记录在tick=88000时被保留（cutoff=3000，85001>=3000）', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 85001 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88000)
      expect((sys as any).decrees).toHaveLength(1)
    })

    it('tick刚好等于cutoff时记录被保留', () => {
      // cutoff = 88000 - 85000 = 3000
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 3000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 88000)
      expect((sys as any).decrees).toHaveLength(1)
    })

    it('混合新旧记录：只删除过期的，保留有效的', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))        // 过期
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: 150000 }))   // 有效
      ;(sys as any).decrees.push(makeDecree({ id: 3, tick: 1000 }))     // 过期
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 200000) // cutoff=115000
      const ids = (sys as any).decrees.map((d: Amnesty2Decree) => d.id)
      expect(ids).toContain(2)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })

    it('无过期记录时decrees长度不变', () => {
      ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 5000 }))
      ;(sys as any).decrees.push(makeDecree({ id: 2, tick: 6000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      // tick=2500，lastCheck=0，差值2500>=2480触发；cutoff=2500-85000<0 => 无记录过期
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).decrees).toHaveLength(2)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_DECREES 上限控制
  // ─────────────────────────────────────────────
  describe('MAX_DECREES上限控制', () => {
    it('decrees达到20时即使random触发也不新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i + 1, civIdA: i + 1, civIdB: i + 30, tick: 500000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).decrees.length).toBeLessThanOrEqual(20)
    })

    it('decrees未达20时random触发可新增', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).decrees.push(makeDecree({ id: i + 1, civIdA: i + 1, civIdB: i + 30, tick: 500000 }))
      }
      const mockRand = vi.spyOn(Math, 'random')
      mockRand.mockReturnValueOnce(0)      // PROCEED_CHANCE check → 0 < 0.0022
      mockRand.mockReturnValueOnce(0)      // civA = 1
      mockRand.mockReturnValueOnce(0.5)    // civB = 5 (1≠5)
      mockRand.mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).decrees.length).toBeGreaterThan(10)
    })

    it('nextId在新增时递增', () => {
      const mockRand = vi.spyOn(Math, 'random')
      mockRand.mockReturnValueOnce(0)
      mockRand.mockReturnValueOnce(0)
      mockRand.mockReturnValueOnce(0.5)
      mockRand.mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2500)
      expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    })
  })
})

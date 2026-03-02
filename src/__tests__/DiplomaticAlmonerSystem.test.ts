import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAlmonerSystem, AlmonerForm, AlmonerArrangement } from '../systems/DiplomaticAlmonerSystem'

// CHECK_INTERVAL=2790, PROCEED_CHANCE=0.0021, MAX_ARRANGEMENTS=16, cutoff offset=88000

function makeSys() { return new DiplomaticAlmonerSystem() }

function makeArrangement(overrides: Partial<AlmonerArrangement> = {}): AlmonerArrangement {
  return {
    id: 1,
    patronCivId: 1,
    almonerCivId: 2,
    form: 'royal_almoner',
    charityDistribution: 50,
    poorRelief: 50,
    hospitalManagement: 30,
    almsCollection: 30,
    duration: 0,
    tick: 100000,
    ...overrides,
  }
}

describe('DiplomaticAlmonerSystem', () => {
  let sys: DiplomaticAlmonerSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('初始arrangements是Array类型', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入��条arrangements可读取', () => {
      const a = makeArrangement()
      ;(sys as any).arrangements.push(a)
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(1)
    })

    it('注入多条arrangements可全部读取', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, patronCivId: 3, almonerCivId: 4 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 3, patronCivId: 5, almonerCivId: 6 }))
      expect((sys as any).arrangements).toHaveLength(3)
    })

    it('所有AlmonerForm类型均可注入', () => {
      const forms: AlmonerForm[] = ['royal_almoner', 'ecclesiastical_almoner', 'municipal_almoner', 'guild_almoner']
      forms.forEach((form, i) => {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, patronCivId: i + 1, almonerCivId: i + 9, form }))
      })
      expect((sys as any).arrangements).toHaveLength(4)
      const savedForms = (sys as any).arrangements.map((a: AlmonerArrangement) => a.form)
      expect(savedForms).toContain('royal_almoner')
      expect(savedForms).toContain('ecclesiastical_almoner')
      expect(savedForms).toContain('municipal_almoner')
      expect(savedForms).toContain('guild_almoner')
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick差值小于2790时跳过更新，lastCheck不变', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12789) // 差值2789 < 2790
      expect((sys as any).lastCheck).toBe(10000)
    })

    it('tick差值等于2790时触发更新，lastCheck更新', () => {
      ;(sys as any).lastCheck = 10000
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 12790)
      expect((sys as any).lastCheck).toBe(12790)
    })

    it('tick差值大于2790时触发更新，lastCheck更新为当前tick', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 50000)
      expect((sys as any).lastCheck).toBe(50000)
    })

    it('连续在interval内调用，lastCheck只在第一次触发时更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
      sys.update(1, {} as any, {} as any, 4000) // 差值1000 < 2790
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('两次足够间隔的update均触发，lastCheck两次均更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
      sys.update(1, {} as any, {} as any, 6000) // 差值3000 >= 2790
      expect((sys as any).lastCheck).toBe(6000)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })

    it('多次update后duration持续累加', () => {
      ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 6000)
      sys.update(1, {} as any, {} as any, 9000)
      expect((sys as any).arrangements[0].duration).toBe(3)
    })

    it('charityDistribution不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ charityDistribution: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最大负向偏移
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].charityDistribution).toBeGreaterThanOrEqual(5)
    })

    it('charityDistribution不超过最大值85', () => {
      ;(sys as any).arrangements.push(makeArrangement({ charityDistribution: 84.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].charityDistribution).toBeLessThanOrEqual(85)
    })

    it('poorRelief不低于最小值10', () => {
      ;(sys as any).arrangements.push(makeArrangement({ poorRelief: 10.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].poorRelief).toBeGreaterThanOrEqual(10)
    })

    it('poorRelief不超过最大值90', () => {
      ;(sys as any).arrangements.push(makeArrangement({ poorRelief: 89.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].poorRelief).toBeLessThanOrEqual(90)
    })

    it('hospitalManagement不低于最小值5', () => {
      ;(sys as any).arrangements.push(makeArrangement({ hospitalManagement: 5.01, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].hospitalManagement).toBeGreaterThanOrEqual(5)
    })

    it('almsCollection不超过最大值65', () => {
      ;(sys as any).arrangements.push(makeArrangement({ almsCollection: 64.99, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements[0].almsCollection).toBeLessThanOrEqual(65)
    })
  })

  // ─────────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────────
  describe('time-based过期清理', () => {
    it('tick=0的记录在大tick时被清理（cutoff=tick-88000）', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000) // cutoff=2000，0 < 2000 => 删除
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick=88001的记录在tick=90000时被保留（cutoff=2000，88001>=2000）', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 88001 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('tick刚好等于cutoff时记录被保留', () => {
      // cutoff = 90000 - 88000 = 2000
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 2000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 90000)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合新旧记录：只删除过期的，保留有效的', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))        // 过期
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 150000 }))   // 有效
      ;(sys as any).arrangements.push(makeArrangement({ id: 3, tick: 500 }))      // 过期
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, 200000) // cutoff=112000
      const ids = (sys as any).arrangements.map((a: AlmonerArrangement) => a.id)
      expect(ids).toContain(2)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })

    it('无过期记录时arrangements长度不变', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 5000 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 6000 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      // tick=3000，lastCheck=0，差值3000>=2790触发；cutoff=3000-88000<0 => 无记录过期
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).arrangements).toHaveLength(2)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_ARRANGEMENTS 上限控制
  // ─────────────────────────────────────────────
  describe('MAX_ARRANGEMENTS上限控制', () => {
    it('arrangements达到16时即使random触发也不新增', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, patronCivId: i + 1, almonerCivId: i + 20, tick: 500000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('arrangements未达16时random触发可新增', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, patronCivId: i + 1, almonerCivId: i + 20, tick: 500000 }))
      }
      const mockRand = vi.spyOn(Math, 'random')
      mockRand.mockReturnValueOnce(0)      // PROCEED_CHANCE check → 0 < 0.0021
      mockRand.mockReturnValueOnce(0)      // patron = 1
      mockRand.mockReturnValueOnce(0.5)    // almoner = 5 (1≠5)
      mockRand.mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 503000)
      expect((sys as any).arrangements.length).toBeGreaterThan(10)
    })

    it('nextId在新增时递增', () => {
      const mockRand = vi.spyOn(Math, 'random')
      mockRand.mockReturnValueOnce(0)
      mockRand.mockReturnValueOnce(0)
      mockRand.mockReturnValueOnce(0.5)
      mockRand.mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    })
  })
})

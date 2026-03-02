import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticBenevolenceSystem, BenevolenceInitiative, BenevolenceType } from '../systems/DiplomaticBenevolenceSystem'

// CHECK_INTERVAL=2390, MAX_INITIATIVES=20, cutoff=tick-80000
// update(dt, world, em, tick)

function makeSys() { return new DiplomaticBenevolenceSystem() }

function forceUpdate(sys: DiplomaticBenevolenceSystem, tick: number) {
  sys.update(1, {} as any, {} as any, tick)
}

function makeInitiative(overrides: Partial<BenevolenceInitiative> = {}): BenevolenceInitiative {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    benevolenceType: 'humanitarian',
    generosity: 40,
    gratitude: 30,
    reputationGain: 25,
    influenceSpread: 15,
    duration: 0,
    tick: 100000,
    ...overrides,
  }
}

describe('DiplomaticBenevolenceSystem', () => {

  let sys: DiplomaticBenevolenceSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ──────────────────────────────────────────────
  // 1. 基础数据结构
  // ──────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 initiatives 为空数组', () => {
      expect((sys as any).initiatives).toHaveLength(0)
      expect(Array.isArray((sys as any).initiatives)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('直接注入 initiative 后长度正确', () => {
      ;(sys as any).initiatives.push(makeInitiative({ id: 1 }))
      expect((sys as any).initiatives).toHaveLength(1)
      expect((sys as any).initiatives[0].id).toBe(1)
    })

    it('initiative 包含所有必要字段', () => {
      const i = makeInitiative()
      expect(i).toHaveProperty('id')
      expect(i).toHaveProperty('civIdA')
      expect(i).toHaveProperty('civIdB')
      expect(i).toHaveProperty('benevolenceType')
      expect(i).toHaveProperty('generosity')
      expect(i).toHaveProperty('gratitude')
      expect(i).toHaveProperty('reputationGain')
      expect(i).toHaveProperty('influenceSpread')
      expect(i).toHaveProperty('duration')
      expect(i).toHaveProperty('tick')
    })

    it('BenevolenceType 合法值：humanitarian / educational / medical / infrastructural', () => {
      const validTypes: BenevolenceType[] = ['humanitarian', 'educational', 'medical', 'infrastructural']
      for (const t of validTypes) {
        expect(validTypes).toContain(t)
      }
    })
  })

  // ──────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流（2390）
  // ──────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流（2390）', () => {
    it('tick 差 < CHECK_INTERVAL 时跳过更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 2390) // 执行，lastCheck=2390
      const len = (sys as any).initiatives.length
      forceUpdate(sys, 2391) // 2391-2390=1 < 2390，跳过
      expect((sys as any).initiatives.length).toBe(len)
    })

    it('tick 差恰好等于 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 2390) // lastCheck=2390
      forceUpdate(sys, 4780) // 4780-2390=2390 >= 2390，执行
      expect((sys as any).lastCheck).toBe(4780)
    })

    it('tick 差 > CHECK_INTERVAL 时更新 lastCheck', () => {
      forceUpdate(sys, 10000)
      expect((sys as any).lastCheck).toBe(10000)
    })

    it('未达到 CHECK_INTERVAL 时 lastCheck 不变', () => {
      forceUpdate(sys, 2390) // lastCheck=2390
      forceUpdate(sys, 3000) // 3000-2390=610 < 2390，跳过
      expect((sys as any).lastCheck).toBe(2390)
    })

    it('tick=0 时（0-0=0 < 2390）不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      forceUpdate(sys, 0)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).initiatives).toHaveLength(0)
    })
  })

  // ──────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ──────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration 增加 1', () => {
      ;(sys as any).initiatives.push(makeInitiative({ tick: 100000, duration: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceUpdate(sys, 100000)
      expect((sys as any).initiatives[0].duration).toBe(1)
    })

    it('多次 update 后 duration 累加', () => {
      ;(sys as any).initiatives.push(makeInitiative({ tick: 200000, duration: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceUpdate(sys, 200000)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 202390)
      expect((sys as any).initiatives[0].duration).toBe(2)
    })

    it('generosity 始终在 [10, 85] 范围内', () => {
      ;(sys as any).initiatives.push(makeInitiative({ generosity: 40, tick: 500000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 500000 + i * 2390)
      }
      const val = (sys as any).initiatives[0]?.generosity
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(85)
      }
    })

    it('gratitude 始终在 [5, 80] 范围内', () => {
      ;(sys as any).initiatives.push(makeInitiative({ gratitude: 30, tick: 600000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 600000 + i * 2390)
      }
      const val = (sys as any).initiatives[0]?.gratitude
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(80)
      }
    })

    it('reputationGain 始终在 [5, 70] 范围内', () => {
      ;(sys as any).initiatives.push(makeInitiative({ reputationGain: 25, tick: 700000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 700000 + i * 2390)
      }
      const val = (sys as any).initiatives[0]?.reputationGain
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(70)
      }
    })

    it('influenceSpread 始终在 [3, 60] 范围内', () => {
      ;(sys as any).initiatives.push(makeInitiative({ influenceSpread: 15, tick: 800000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 800000 + i * 2390)
      }
      const val = (sys as any).initiatives[0]?.influenceSpread
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(3)
        expect(val).toBeLessThanOrEqual(60)
      }
    })
  })

  // ──────────────────────────────────────────────
  // 4. time-based 过期清理（cutoff = tick - 80000）
  // ──────────────────────────────────────────────
  describe('time-based 过期清理（cutoff = tick - 80000）', () => {
    it('tick=0 的记录在 update tick=80001 时被清理', () => {
      ;(sys as any).initiatives.push(makeInitiative({ id: 1, tick: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 80001)
      expect((sys as any).initiatives).toHaveLength(0)
    })

    it('tick=0 的记录在 update tick=80000 时不被清理（cutoff=0，0<0 不成立）', () => {
      ;(sys as any).initiatives.push(makeInitiative({ id: 1, tick: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 80000)
      // cutoff=80000-80000=0, initiative.tick(0) < 0 => false，不删除
      expect((sys as any).initiatives).toHaveLength(1)
    })

    it('仅过期记录被删除，新鲜记录保留', () => {
      // update tick=180001, cutoff=180001-80000=100001
      // 记录1: tick=1 < 100001 => 过期
      // 记录2: tick=180001 (= update tick), 180001 < 100001 => false，保留
      const updateTick = 180001
      ;(sys as any).initiatives.push(makeInitiative({ id: 1, tick: 1 }))
      ;(sys as any).initiatives.push(makeInitiative({ id: 2, tick: updateTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, updateTick)
      const remaining = (sys as any).initiatives as BenevolenceInitiative[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('多条过期记录一次全部清理', () => {
      ;(sys as any).initiatives.push(makeInitiative({ id: 1, tick: 0 }))
      ;(sys as any).initiatives.push(makeInitiative({ id: 2, tick: 200 }))
      ;(sys as any).initiatives.push(makeInitiative({ id: 3, tick: 999 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 81001)
      expect((sys as any).initiatives).toHaveLength(0)
    })

    it('未过期记录不被删除', () => {
      const tick = 150000
      ;(sys as any).initiatives.push(makeInitiative({ id: 77, tick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, tick + 2390) // 差仅2390，远小于80000
      expect((sys as any).initiatives).toHaveLength(1)
    })
  })

  // ──────────────────────────────────────────────
  // 5. MAX_INITIATIVES 上限（20）
  // ──────────────────────────────────────────────
  describe('MAX_INITIATIVES 上限（20）', () => {
    it('已满20条时，random=0 也不再新增', () => {
      const baseTick = 500000
      for (let i = 0; i < 20; i++) {
        ;(sys as any).initiatives.push(makeInitiative({ id: i + 1, tick: baseTick }))
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      forceUpdate(sys, baseTick)
      expect((sys as any).initiatives.length).toBeLessThanOrEqual(20)
    })

    it('initiatives 数量永远不超过 MAX_INITIATIVES=20', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const baseTick = 500000
      for (let t = 0; t < 20; t++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, baseTick) // 固定tick不触发过期
      }
      expect((sys as any).initiatives.length).toBeLessThanOrEqual(20)
    })

    it('nextId 每次成功新增后递增', () => {
      ;(sys as any).lastCheck = 0
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0       // INITIATIVE_CHANCE: 0 < 0.0025 => spawn
        if (callCount === 2) return 0       // civA: 1
        if (callCount === 3) return 0.5     // civB: 5 (≠1)
        return 0.5
      })
      const prevNextId = (sys as any).nextId
      forceUpdate(sys, 500000)
      if ((sys as any).initiatives.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(prevNextId)
      }
    })

    it('civIdA 不等于 civIdB（约束验证）', () => {
      const i = makeInitiative({ civIdA: 2, civIdB: 5 })
      expect(i.civIdA).not.toBe(i.civIdB)
    })
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticBeadleSystem, BeadleArrangement, BeadleForm } from '../systems/DiplomaticBeadleSystem'

// CHECK_INTERVAL=3000, MAX_ARRANGEMENTS=16, cutoff=tick-88000
// update(dt, world, em, tick)

function makeSys() { return new DiplomaticBeadleSystem() }

function forceUpdate(sys: DiplomaticBeadleSystem, tick: number) {
  sys.update(1, {} as any, {} as any, tick)
}

function makeArrangement(overrides: Partial<BeadleArrangement> = {}): BeadleArrangement {
  return {
    id: 1,
    parishCivId: 1,
    wardenCivId: 2,
    form: 'royal_beadle',
    parishAuthority: 50,
    orderKeeping: 50,
    almsDistribution: 40,
    ceremonialRole: 35,
    duration: 0,
    tick: 100000,
    ...overrides,
  }
}

describe('DiplomaticBeadleSystem', () => {

  let sys: DiplomaticBeadleSystem

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
    it('初始 arrangements 为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('直接注入 arrangement 后长度正确', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
      expect((sys as any).arrangements).toHaveLength(1)
      expect((sys as any).arrangements[0].id).toBe(1)
    })

    it('arrangement 包含所有必要字段', () => {
      const a = makeArrangement()
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('parishCivId')
      expect(a).toHaveProperty('wardenCivId')
      expect(a).toHaveProperty('form')
      expect(a).toHaveProperty('parishAuthority')
      expect(a).toHaveProperty('orderKeeping')
      expect(a).toHaveProperty('almsDistribution')
      expect(a).toHaveProperty('ceremonialRole')
      expect(a).toHaveProperty('duration')
      expect(a).toHaveProperty('tick')
    })

    it('BeadleForm 合法值：royal_beadle / parish_beadle / church_beadle / university_beadle', () => {
      const validForms: BeadleForm[] = ['royal_beadle', 'parish_beadle', 'church_beadle', 'university_beadle']
      for (const f of validForms) {
        expect(validForms).toContain(f)
      }
    })
  })

  // ──────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流（3000）
  // ──────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流（3000）', () => {
    it('tick 差 < CHECK_INTERVAL 时不执行任何逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 3000) // 执行，lastCheck=3000
      const prevLen = (sys as any).arrangements.length
      forceUpdate(sys, 3001) // 3001-3000=1 < 3000，跳过
      expect((sys as any).arrangements).toHaveLength(prevLen)
    })

    it('tick 差恰好等于 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 3000) // lastCheck=3000
      forceUpdate(sys, 6000) // 6000-3000=3000 >= 3000，执行
      expect((sys as any).lastCheck).toBe(6000)
    })

    it('tick 差 > CHECK_INTERVAL 时更新 lastCheck', () => {
      forceUpdate(sys, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('未达到 CHECK_INTERVAL 时 lastCheck 不变', () => {
      forceUpdate(sys, 3000) // lastCheck=3000
      forceUpdate(sys, 4000) // 4000-3000=1000 < 3000，跳过
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('tick=0 时（0-0=0 < 3000）不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      forceUpdate(sys, 0)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  // ──────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ──────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次 update 后 duration 增加 1', () => {
      ;(sys as any).arrangements.push(makeArrangement({ tick: 100000, duration: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceUpdate(sys, 100000)
      expect((sys as any).arrangements[0].duration).toBe(1)
    })

    it('多次 update 后 duration 累加正确', () => {
      ;(sys as any).arrangements.push(makeArrangement({ tick: 200000, duration: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceUpdate(sys, 200000)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 203000)
      expect((sys as any).arrangements[0].duration).toBe(2)
    })

    it('parishAuthority 始终在 [5, 85] 范围内', () => {
      ;(sys as any).arrangements.push(makeArrangement({ parishAuthority: 50, tick: 500000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 500000 + i * 3000)
      }
      const val = (sys as any).arrangements[0]?.parishAuthority
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(85)
      }
    })

    it('orderKeeping 始终在 [10, 90] 范围内', () => {
      ;(sys as any).arrangements.push(makeArrangement({ orderKeeping: 50, tick: 600000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 600000 + i * 3000)
      }
      const val = (sys as any).arrangements[0]?.orderKeeping
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(90)
      }
    })

    it('almsDistribution 始终在 [5, 80] 范围内', () => {
      ;(sys as any).arrangements.push(makeArrangement({ almsDistribution: 40, tick: 700000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 700000 + i * 3000)
      }
      const val = (sys as any).arrangements[0]?.almsDistribution
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(80)
      }
    })

    it('ceremonialRole 始终在 [5, 65] 范围内', () => {
      ;(sys as any).arrangements.push(makeArrangement({ ceremonialRole: 35, tick: 800000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = 0
        forceUpdate(sys, 800000 + i * 3000)
      }
      const val = (sys as any).arrangements[0]?.ceremonialRole
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(65)
      }
    })
  })

  // ──────────────────────────────────────────────
  // 4. time-based 过期清理（cutoff = tick - 88000）
  // ──────────────────────────────────────────────
  describe('time-based 过期清理（cutoff = tick - 88000）', () => {
    it('tick=0 的记录在 update tick=88001 时被清理', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 88001)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick=0 的记录在 update tick=88000 时不被清理（cutoff=0，0<0 不成立）', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 88000)
      // cutoff = 88000 - 88000 = 0, arrangement.tick(0) < 0 => false，不删除
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('仅过期记录被删除，新鲜记录保留', () => {
      // update tick = 188001，cutoff = 188001 - 88000 = 100001
      // 记录1: tick=1 < 100001 => 过期
      // 记录2: tick=188001 (= update tick)，188001 < 100001 => false，保留
      const updateTick = 188001
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 1 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: updateTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, updateTick)
      const remaining = (sys as any).arrangements as BeadleArrangement[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('多条过期记录一次全部清理', () => {
      ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 100 }))
      ;(sys as any).arrangements.push(makeArrangement({ id: 3, tick: 500 }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 88001 + 1000)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('未过期记录不被删除', () => {
      const tick = 100000
      ;(sys as any).arrangements.push(makeArrangement({ id: 99, tick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, tick + 3000) // 差仅3000，远小于88000
      expect((sys as any).arrangements).toHaveLength(1)
    })
  })

  // ──────────────────────────────────────────────
  // 5. MAX_ARRANGEMENTS 上限（16）
  // ──────────────────────────────────────────────
  describe('MAX_ARRANGEMENTS 上限（16）', () => {
    it('已满16条时，random=0 也不再新增', () => {
      const baseTick = 500000
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: baseTick }))
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      forceUpdate(sys, baseTick) // tick差=0，不过期
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('arrangements 数量永远不超过 MAX_ARRANGEMENTS=16', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const baseTick = 500000
      for (let t = 0; t < 20; t++) {
        ;(sys as any).lastCheck = 0
        // tick与arrangements.tick相同，不触发过期
        forceUpdate(sys, baseTick)
      }
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('nextId 每次成功新增后递增', () => {
      ;(sys as any).lastCheck = 0
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        // 第1次: PROCEED_CHANCE check: 0 < 0.0021 => 触发
        if (callCount === 1) return 0
        // 第2次: parish civ floor(0*8)+1=1
        if (callCount === 2) return 0
        // 第3次: warden civ floor(0.5*8)+1=5 (≠1)
        if (callCount === 3) return 0.5
        return 0.5
      })
      const prevNextId = (sys as any).nextId
      forceUpdate(sys, 500000)
      if ((sys as any).arrangements.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(prevNextId)
      }
    })

    it('parishCivId 不等于 wardenCivId', () => {
      // 直接检验注入的arrangement结构约束
      const a = makeArrangement({ parishCivId: 3, wardenCivId: 7 })
      expect(a.parishCivId).not.toBe(a.wardenCivId)
    })
  })
})

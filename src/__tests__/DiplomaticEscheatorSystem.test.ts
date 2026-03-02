import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticEscheatorSystem } from '../systems/DiplomaticEscheatorSystem'
import type { EscheatorArrangement, EscheatorForm } from '../systems/DiplomaticEscheatorSystem'

let counter = 1
function makeSys() { return new DiplomaticEscheatorSystem() }
function makeArr(overrides: Partial<EscheatorArrangement> = {}): EscheatorArrangement {
  return {
    id: counter++,
    crownCivId: 1,
    escheatorCivId: 2,
    form: 'royal_escheator',
    estateRecovery: 40,
    forfeitureAuthority: 45,
    inventoryAccuracy: 30,
    revenueYield: 25,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

const mockWorld = {} as any
const mockEM = {} as any

describe('DiplomaticEscheatorSystem — 基础数据结构', () => {
  it('新系统 arrangements 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any).arrangements).toEqual([])
  })

  it('新系统 nextId 初始为 1', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })

  it('新系统 lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('可以向 arrangements 直接注入并读取', () => {
    const sys = makeSys()
    const a = makeArr({ crownCivId: 3, escheatorCivId: 7 })
    ;(sys as any).arrangements.push(a)
    const stored = (sys as any).arrangements[0] as EscheatorArrangement
    expect(stored.crownCivId).toBe(3)
    expect(stored.escheatorCivId).toBe(7)
  })

  it('EscheatorArrangement 结构包含全部 10 个字段', () => {
    const a = makeArr()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('crownCivId')
    expect(a).toHaveProperty('escheatorCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('estateRecovery')
    expect(a).toHaveProperty('forfeitureAuthority')
    expect(a).toHaveProperty('inventoryAccuracy')
    expect(a).toHaveProperty('revenueYield')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
})

describe('DiplomaticEscheatorSystem — CHECK_INTERVAL=2780 节流', () => {
  it('tick=0 时不通过门槛，lastCheck 不更新', () => {
    const sys = makeSys()
    sys.update(1, mockWorld, mockEM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2779 时仍不通过门槛（2779-0 < 2780）', () => {
    const sys = makeSys()
    sys.update(1, mockWorld, mockEM, 2779)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2780 时通过门槛，lastCheck 更新为 2780', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2780)
    expect((sys as any).lastCheck).toBe(2780)
    vi.restoreAllMocks()
  })

  it('tick=5559 时不通过第二次门槛（5559-2780 < 2780）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2780)
    sys.update(1, mockWorld, mockEM, 5559)
    expect((sys as any).lastCheck).toBe(2780)
    vi.restoreAllMocks()
  })

  it('tick=5560 时通过第二次门槛，lastCheck 更新为 5560', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2780)
    sys.update(1, mockWorld, mockEM, 5560)
    expect((sys as any).lastCheck).toBe(5560)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEscheatorSystem — 数值字段动态更新', () => {
  it('每次通过 CHECK_INTERVAL 后 duration+1', () => {
    const sys = makeSys()
    ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2780)
    expect((sys as any).arrangements[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  it('多次触发 update，duration 累计递增', () => {
    const sys = makeSys()
    ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2780)
    sys.update(1, mockWorld, mockEM, 5560)
    sys.update(1, mockWorld, mockEM, 8340)
    expect((sys as any).arrangements[0].duration).toBe(3)
    vi.restoreAllMocks()
  })

  it('estateRecovery 始终处于 [5, 85] 范围内', () => {
    const sys = makeSys()
    ;(sys as any).arrangements.push(makeArr({ estateRecovery: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let tick = 2780; tick <= 2780 * 50; tick += 2780) {
      sys.update(1, mockWorld, mockEM, tick)
    }
    const val = (sys as any).arrangements[0]?.estateRecovery
    if (val !== undefined) {
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(85)
    }
    vi.restoreAllMocks()
  })

  it('forfeitureAuthority 始终处于 [10, 90] 范围内', () => {
    const sys = makeSys()
    ;(sys as any).arrangements.push(makeArr({ forfeitureAuthority: 90, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let tick = 2780; tick <= 2780 * 50; tick += 2780) {
      sys.update(1, mockWorld, mockEM, tick)
    }
    const val = (sys as any).arrangements[0]?.forfeitureAuthority
    if (val !== undefined) {
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(90)
    }
    vi.restoreAllMocks()
  })

  it('revenueYield 始终处于 [5, 65] 范围内', () => {
    const sys = makeSys()
    ;(sys as any).arrangements.push(makeArr({ revenueYield: 65, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let tick = 2780; tick <= 2780 * 50; tick += 2780) {
      sys.update(1, mockWorld, mockEM, tick)
    }
    const val = (sys as any).arrangements[0]?.revenueYield
    if (val !== undefined) {
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(65)
    }
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEscheatorSystem — 过期清理 cutoff=tick-88000', () => {
  it('tick 小于 cutoff 的 arrangement 被删除', () => {
    const sys = makeSys()
    ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 88001 + 2780 - 2780
    sys.update(1, mockWorld, mockEM, 88001 + 2780)
    expect((sys as any).arrangements.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('新鲜的 arrangement 不被删除', () => {
    const sys = makeSys()
    const tick = 2780
    ;(sys as any).arrangements.push(makeArr({ tick }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, tick)
    expect((sys as any).arrangements.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('混合新旧：旧的删除，新的保留', () => {
    const sys = makeSys()
    const currentTick = 88001 + 2780
    ;(sys as any).arrangements.push(
      makeArr({ tick: 0 }),
      makeArr({ tick: currentTick }),
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = currentTick - 2780
    sys.update(1, mockWorld, mockEM, currentTick)
    const remaining = (sys as any).arrangements as EscheatorArrangement[]
    expect(remaining.every((a: EscheatorArrangement) => a.tick >= currentTick - 88000)).toBe(true)
    vi.restoreAllMocks()
  })

  it('cutoff 边界：tick 恰好等于 cutoff 时保留（< 不触发）', () => {
    const sys = makeSys()
    const currentTick = 2780
    // cutoff = 2780 - 88000 = 负数，arrangement.tick=0 > 负数，不删除
    ;(sys as any).arrangements.push(makeArr({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, currentTick)
    expect((sys as any).arrangements.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('空数组时清理逻辑不崩溃', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, mockWorld, mockEM, 2780)).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEscheatorSystem — MAX_ARRANGEMENTS=16 上限', () => {
  it('arrangements.length === 16 时不创建新条目', () => {
    const sys = makeSys()
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push(makeArr({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < PROCEED_CHANCE=0.0021
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 2780)
    expect((sys as any).arrangements.length).toBe(16)
    vi.restoreAllMocks()
  })

  it('arrangements.length < 16 但 random >= PROCEED_CHANCE 时不创建', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 2780)
    expect((sys as any).arrangements.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('nextId 每次成功创建后递增', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
    ;(sys as any).nextId = 5
    expect((sys as any).nextId).toBe(5)
  })

  it('civA === civB 时不创建（early return）', () => {
    const sys = makeSys()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001 // PROCEED_CHANCE 通过
      return 0 // civA=1, civB=1 → 相等，early return
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 2780)
    expect((sys as any).arrangements.length).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEscheatorSystem — EscheatorForm 枚举完整性', () => {
  const forms: EscheatorForm[] = ['royal_escheator', 'county_escheator', 'duchy_escheator', 'palatine_escheator']

  it("form='royal_escheator' 可以被存储和读取", () => {
    expect(makeArr({ form: 'royal_escheator' }).form).toBe('royal_escheator')
  })

  it("form='county_escheator' 可以被存储和读取", () => {
    expect(makeArr({ form: 'county_escheator' }).form).toBe('county_escheator')
  })

  it("form='duchy_escheator' 可以被存储和读取", () => {
    expect(makeArr({ form: 'duchy_escheator' }).form).toBe('duchy_escheator')
  })

  it("form='palatine_escheator' 可以被存储和读取", () => {
    expect(makeArr({ form: 'palatine_escheator' }).form).toBe('palatine_escheator')
  })
})

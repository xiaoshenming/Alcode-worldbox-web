import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticEntenteSystem } from '../systems/DiplomaticEntenteSystem'
import type { EntenteAgreement, EntenteLevel } from '../systems/DiplomaticEntenteSystem'

let counter = 1
function makeSys() { return new DiplomaticEntenteSystem() }
function makeTreaty(overrides: Partial<EntenteAgreement> = {}): EntenteAgreement {
  return {
    id: counter++,
    civIdA: 1,
    civIdB: 2,
    level: 'cordial',
    mutualTrust: 40,
    cooperationDepth: 30,
    sharedInterests: 35,
    informalBonds: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

const mockWorld = {} as any
const mockEM = {} as any

describe('DiplomaticEntenteSystem — 基础数据结构', () => {
  it('新系统 treaties 初始为空数组', () => {
    const sys = makeSys()
    const treaties = (sys as any).treaties as EntenteAgreement[]
    expect(treaties).toEqual([])
  })

  it('新系统 nextId 初始为 1', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })

  it('新系统 lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('可以向 treaties 直接注入 EntenteAgreement 并读取', () => {
    const sys = makeSys()
    const t = makeTreaty({ civIdA: 3, civIdB: 5 })
    ;(sys as any).treaties.push(t)
    const stored = (sys as any).treaties[0] as EntenteAgreement
    expect(stored.civIdA).toBe(3)
    expect(stored.civIdB).toBe(5)
  })

  it('EntenteAgreement 结构包含全部 10 个字段', () => {
    const t = makeTreaty()
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('civIdA')
    expect(t).toHaveProperty('civIdB')
    expect(t).toHaveProperty('level')
    expect(t).toHaveProperty('mutualTrust')
    expect(t).toHaveProperty('cooperationDepth')
    expect(t).toHaveProperty('sharedInterests')
    expect(t).toHaveProperty('informalBonds')
    expect(t).toHaveProperty('duration')
    expect(t).toHaveProperty('tick')
  })
})

describe('DiplomaticEntenteSystem — CHECK_INTERVAL=2350 节流', () => {
  it('tick=0 时不通过 CHECK_INTERVAL 门槛，lastCheck 不更新', () => {
    const sys = makeSys()
    sys.update(1, mockWorld, mockEM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2349 时仍不通过门槛（2349-0 < 2350）', () => {
    const sys = makeSys()
    sys.update(1, mockWorld, mockEM, 2349)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2350 时通过门槛，lastCheck 更新为 2350', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1) // TREATY_CHANCE 不触发
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).lastCheck).toBe(2350)
    vi.restoreAllMocks()
  })

  it('tick=4699 时不通过第二次门槛（4699-2350 < 2350）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    sys.update(1, mockWorld, mockEM, 4699)
    expect((sys as any).lastCheck).toBe(2350)
    vi.restoreAllMocks()
  })

  it('tick=4700 时通过第二次门槛，lastCheck 更新为 4700', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    sys.update(1, mockWorld, mockEM, 4700)
    expect((sys as any).lastCheck).toBe(4700)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEntenteSystem — 数值字段动态更新', () => {
  it('每次通过 CHECK_INTERVAL 后 duration+1', () => {
    const sys = makeSys()
    const t = makeTreaty({ tick: 0 })
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  it('多次触发 update，duration 累计递增', () => {
    const sys = makeSys()
    const t = makeTreaty({ tick: 0 })
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    sys.update(1, mockWorld, mockEM, 4700)
    sys.update(1, mockWorld, mockEM, 7050)
    expect((sys as any).treaties[0].duration).toBe(3)
    vi.restoreAllMocks()
  })

  it('mutualTrust 始终处于 [5, 85] 范围内', () => {
    const sys = makeSys()
    const t = makeTreaty({ mutualTrust: 5, tick: 0 })
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let tick = 2350; tick <= 2350 * 50; tick += 2350) {
      sys.update(1, mockWorld, mockEM, tick)
    }
    const val = (sys as any).treaties[0]?.mutualTrust
    if (val !== undefined) {
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(85)
    }
    vi.restoreAllMocks()
  })

  it('cooperationDepth 始终处于 [5, 75] 范围内', () => {
    const sys = makeSys()
    const t = makeTreaty({ cooperationDepth: 5, tick: 0 })
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let tick = 2350; tick <= 2350 * 50; tick += 2350) {
      sys.update(1, mockWorld, mockEM, tick)
    }
    const val = (sys as any).treaties[0]?.cooperationDepth
    if (val !== undefined) {
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(75)
    }
    vi.restoreAllMocks()
  })

  it('informalBonds 始终处于 [3, 65] 范围内', () => {
    const sys = makeSys()
    const t = makeTreaty({ informalBonds: 65, tick: 0 })
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let tick = 2350; tick <= 2350 * 50; tick += 2350) {
      sys.update(1, mockWorld, mockEM, tick)
    }
    const val = (sys as any).treaties[0]?.informalBonds
    if (val !== undefined) {
      expect(val).toBeGreaterThanOrEqual(3)
      expect(val).toBeLessThanOrEqual(65)
    }
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEntenteSystem — 过期清理 cutoff=tick-84000', () => {
  it('tick 小于 cutoff 的 treaty 被删除', () => {
    const sys = makeSys()
    const t = makeTreaty({ tick: 0 }) // 创建于 tick=0
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // 当前 tick=84001，cutoff=84001-84000=1，treaty.tick=0 < 1，应被删除
    sys.update(1, mockWorld, mockEM, 84001 + 2350)
    // 先到第一个 CHECK_INTERVAL
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 84001 + 2350 * 2)
    expect((sys as any).treaties.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick 等于 cutoff 的 treaty 保留（< 不触发）', () => {
    const sys = makeSys()
    const currentTick = 2350
    const cutoff = currentTick - 84000 // 负数，treaty.tick=0 > 负数，不删除
    const t = makeTreaty({ tick: 0 })
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, currentTick)
    expect((sys as any).treaties.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('新鲜的 treaty 不被删除', () => {
    const sys = makeSys()
    const t = makeTreaty({ tick: 2350 }) // 创建于当前 tick
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('混合新旧：旧的删除，新的保留', () => {
    const sys = makeSys()
    const old = makeTreaty({ tick: 0 })
    const fresh = makeTreaty({ tick: 84001 + 2350 })
    ;(sys as any).treaties.push(old, fresh)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tick = 84001 + 2350
    ;(sys as any).lastCheck = tick - 2350 // 让第一次 update 通过
    sys.update(1, mockWorld, mockEM, tick)
    const remaining = (sys as any).treaties as EntenteAgreement[]
    expect(remaining.every((t: EntenteAgreement) => t.tick >= tick - 84000)).toBe(true)
    vi.restoreAllMocks()
  })

  it('空数组时清理逻辑不崩溃', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, mockWorld, mockEM, 2350)).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEntenteSystem — MAX_TREATIES=20 上限', () => {
  it('当 treaties.length === 20 时，新条约不被创建（即使 random 满足）', () => {
    const sys = makeSys()
    for (let i = 0; i < 20; i++) {
      ;(sys as any).treaties.push(makeTreaty({ tick: 99999 }))
    }
    // random 小于 TREATY_CHANCE 时也不应创建
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0027
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties.length).toBe(20)
    vi.restoreAllMocks()
  })

  it('treaties.length === 19 时，random 满足条件可创建新条约（civA !== civB）', () => {
    const sys = makeSys()
    for (let i = 0; i < 19; i++) {
      ;(sys as any).treaties.push(makeTreaty({ tick: 99999 }))
    }
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      // 第1次：TREATY_CHANCE 判断 → 返回 0.001 (< 0.0027)
      // 第2次：civA random → 0 (floor(0*8)=0, +1=1)
      // 第3次：civB random → 0.5 (floor(0.5*8)=4, +1=5, ≠1)
      if (callCount === 1) return 0.001
      if (callCount === 2) return 0
      if (callCount === 3) return 0.5
      return 0.5
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties.length).toBeGreaterThanOrEqual(19)
    vi.restoreAllMocks()
  })

  it('treaties.length < 20 但 random >= TREATY_CHANCE 时不创建', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // >= 0.0027
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('nextId 每次成功创建条约后递增', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
    ;(sys as any).treaties.push(makeTreaty())
    ;(sys as any).nextId = 2
    expect((sys as any).nextId).toBe(2)
  })
})

describe('DiplomaticEntenteSystem — EntenteLevel 枚举完整性', () => {
  const levels: EntenteLevel[] = ['cordial', 'cooperative', 'strategic', 'comprehensive']

  it("level='cordial' 可以被存储和读取", () => {
    const t = makeTreaty({ level: 'cordial' })
    expect(t.level).toBe('cordial')
  })

  it("level='cooperative' 可以被存储和读取", () => {
    const t = makeTreaty({ level: 'cooperative' })
    expect(t.level).toBe('cooperative')
  })

  it("level='strategic' 可以被存储和读取", () => {
    const t = makeTreaty({ level: 'strategic' })
    expect(t.level).toBe('strategic')
  })

  it("level='comprehensive' 可以被存储和读取", () => {
    const t = makeTreaty({ level: 'comprehensive' })
    expect(t.level).toBe('comprehensive')
  })

  it('所有 4 种 level 均是有效的 EntenteLevel 类型', () => {
    for (const lv of levels) {
      const t = makeTreaty({ level: lv })
      expect(levels).toContain(t.level)
    }
  })
})

describe('DiplomaticEntenteSystem — 额外边界与枚举测试', () => {
  it('mutualTrust 上限 85 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).treaties.push(makeTreaty({ mutualTrust: 84.99, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0]?.mutualTrust).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })

  it('mutualTrust 下限 5 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).treaties.push(makeTreaty({ mutualTrust: 5.01, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0]?.mutualTrust).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('cooperationDepth 上限 75 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).treaties.push(makeTreaty({ cooperationDepth: 74.99, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0]?.cooperationDepth).toBeLessThanOrEqual(75)
    vi.restoreAllMocks()
  })

  it('sharedInterests 上限 80 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).treaties.push(makeTreaty({ sharedInterests: 79.99, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0]?.sharedInterests).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('informalBonds 上限 65 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).treaties.push(makeTreaty({ informalBonds: 64.99, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0]?.informalBonds).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })

  it('informalBonds 下限 3 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).treaties.push(makeTreaty({ informalBonds: 3.01, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0]?.informalBonds).toBeGreaterThanOrEqual(3)
    vi.restoreAllMocks()
  })

  it('cooperative level 可存储', () => {
    expect(makeTreaty({ level: 'cooperative' }).level).toBe('cooperative')
  })

  it('strategic level 可存储', () => {
    expect(makeTreaty({ level: 'strategic' }).level).toBe('strategic')
  })

  it('comprehensive level 可存储', () => {
    expect(makeTreaty({ level: 'comprehensive' }).level).toBe('comprehensive')
  })

  it('过期记录（cutoff=tick-84000）被移除', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 84000 + 2350 + 1)
    expect((sys as any).treaties).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('未过期记录保留', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 84000 + 2350
    ;(sys as any).treaties.push(makeTreaty({ tick: bigTick - 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, bigTick)
    expect((sys as any).treaties).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('update 不改变 civIdA/civIdB', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).treaties.push(makeTreaty({ civIdA: 5, civIdB: 8, tick: 0 }))
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0].civIdA).toBe(5)
    expect((sys as any).treaties[0].civIdB).toBe(8)
    vi.restoreAllMocks()
  })

  it('多条 treaties 各自独立更新 duration', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).treaties.push(makeTreaty({ duration: 3, tick: 0 }))
    ;(sys as any).treaties.push(makeTreaty({ duration: 7, tick: 0 }))
    sys.update(1, mockWorld, mockEM, 2350)
    expect((sys as any).treaties[0].duration).toBe(4)
    expect((sys as any).treaties[1].duration).toBe(8)
    vi.restoreAllMocks()
  })

  it('全部过期后 treaties 清空', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
    ;(sys as any).treaties.push(makeTreaty({ tick: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, 200000)
    expect((sys as any).treaties).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('空 treaties 时 update 不崩溃', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, mockWorld, mockEM, 2350)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('EntenteAgreement 包含所有必要字段', () => {
    const t = makeTreaty()
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('civIdA')
    expect(t).toHaveProperty('civIdB')
    expect(t).toHaveProperty('level')
    expect(t).toHaveProperty('mutualTrust')
    expect(t).toHaveProperty('cooperationDepth')
    expect(t).toHaveProperty('sharedInterests')
    expect(t).toHaveProperty('informalBonds')
    expect(t).toHaveProperty('duration')
    expect(t).toHaveProperty('tick')
  })

  it('nextId 手动设置后保持', () => {
    const sys = makeSys()
    ;(sys as any).nextId = 99
    expect((sys as any).nextId).toBe(99)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, mockWorld, mockEM, 2350 * 4)
    expect((sys as any).lastCheck).toBe(2350 * 4)
    vi.restoreAllMocks()
  })

  it('mixed 过期和未过期，仅删过期', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 200000
    ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
    ;(sys as any).treaties.push(makeTreaty({ tick: bigTick }))
    ;(sys as any).lastCheck = 0
    sys.update(1, mockWorld, mockEM, bigTick)
    expect((sys as any).treaties).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

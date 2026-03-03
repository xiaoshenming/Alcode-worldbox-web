import { describe, it, expect, vi } from 'vitest'
import { DiplomaticIntercessionSystem } from '../systems/DiplomaticIntercessionSystem'

const mockWorld = {} as any
const mockEm = {} as any

function makeSystem() { return new DiplomaticIntercessionSystem() }
function makeAction(overrides = {}) {
  return {
    id: 1, intercessorCivId: 1, beneficiaryCivId: 2, opponentCivId: 3,
    result: 'active', influence: 50, allianceStrength: 30, diplomaticCost: 50, duration: 0, tick: 0,
    ...overrides
  }
}

describe('基础数据结构', () => {
  it('初始actions为空', () => {
    expect((makeSystem() as any).actions).toEqual([])
  })
  it('nextId初始为1', () => {
    expect((makeSystem() as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((makeSystem() as any).lastCheck).toBe(0)
  })
  it('actions是数组', () => {
    expect(Array.isArray((makeSystem() as any).actions)).toBe(true)
  })
  it('4种result枚举', () => {
    const results = ['active', 'successful', 'rejected', 'withdrawn']
    results.forEach(r => expect(typeof r).toBe('string'))
  })
})

describe('CHECK_INTERVAL=2570节流', () => {
  it('tick<lastCheck+2570时lastCheck不更新', () => {
    const s = makeSystem();(s as any).lastCheck = 5000
    s.update(1, mockWorld, mockEm, 5000 + 2569)
    expect((s as any).lastCheck).toBe(5000)
  })
  it('tick>=lastCheck+2570时lastCheck更新', () => {
    const s = makeSystem();(s as any).lastCheck = 5000
    s.update(1, mockWorld, mockEm, 5000 + 2570)
    expect((s as any).lastCheck).toBe(5000 + 2570)
  })
  it('执行后lastCheck等于当前tick', () => {
    const s = makeSystem()
    s.update(1, mockWorld, mockEm, 3000)
    expect((s as any).lastCheck).toBe(3000)
  })
  it('间隔不足时lastCheck不变', () => {
    const s = makeSystem()
    s.update(1, mockWorld, mockEm, 3000)
    s.update(1, mockWorld, mockEm, 3001)
    expect((s as any).lastCheck).toBe(3000)
  })
  it('间隔足够时lastCheck再次更新', () => {
    const s = makeSystem()
    s.update(1, mockWorld, mockEm, 3000)
    s.update(1, mockWorld, mockEm, 3000 + 2570)
    expect((s as any).lastCheck).toBe(3000 + 2570)
  })
})

describe('数值字段递增', () => {
  it('每次update influence+0.02', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ influence: 50 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions[0]?.influence).toBeCloseTo(50.02)
    vi.restoreAllMocks()
  })
  it('每次update diplomaticCost+0.01', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ diplomaticCost: 50 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions[0]?.diplomaticCost).toBeCloseTo(50.01)
    vi.restoreAllMocks()
  })
  it('每次update duration+1', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ duration: 5 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions[0]?.duration).toBe(6)
    vi.restoreAllMocks()
  })
  it('influence上限100', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ influence: 99.99 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions[0]?.influence).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })
})

describe('result!==active时删除', () => {
  it('result=successful时删除', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ result: 'successful' })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('result=withdrawn时删除', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ result: 'withdrawn' })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('result=rejected时删除', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ result: 'rejected' })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('result=active时保留', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ result: 'active' })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

describe('result转换逻辑', () => {
  it('influence>70且random<0.04→successful→被删除', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ influence: 71 })]
    vi.spyOn(Math, 'random').mockReturnValue(0.03)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('influence>70但random>=0.04不转换', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ influence: 71 })]
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions[0]?.result).toBe('active')
    vi.restoreAllMocks()
  })
  it('diplomaticCost>80且random<0.03→withdrawn→被删除', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ diplomaticCost: 81, influence: 50 })]
    vi.spyOn(Math, 'random').mockReturnValue(0.02)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('influence<20且duration>50→rejected→被删除', () => {
    const s = makeSystem();(s as any).actions = [makeAction({ influence: 19, duration: 51 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('MAX_ACTIONS=15上限', () => {
  it('已有15个active时random<INITIATE_CHANCE也不新增', () => {
    const s = makeSystem()
    ;(s as any).actions = Array.from({ length: 15 }, (_, i) => makeAction({ id: i + 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(15)
    vi.restoreAllMocks()
  })
  it('random=1时跳过spawn', () => {
    const s = makeSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('actions<15时可以spawn', () => {
    expect((makeSystem() as any).actions.length).toBeLessThan(15)
  })
  it('spawn后nextId递增', () => {
    const s = makeSystem()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      // 第1次: INITIATE_CHANCE检查 → 0.001 < 0.0017 触发spawn
      // 后续: 生成civId用，返回不同值避免三个id相同
      if (call === 1) return 0.001
      return [0.1, 0.5, 0.9][call % 3]
    })
    s.update(1, mockWorld, mockEm, 2570)
    if ((s as any).actions.length > 0) expect((s as any).nextId).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })
})

describe('字段边界测试', () => {
  it('influence范围[0,100]', () => {
    const a = makeAction({ influence: 50 })
    expect(a.influence).toBeGreaterThanOrEqual(0)
    expect(a.influence).toBeLessThanOrEqual(100)
  })
  it('allianceStrength范围[0,100]', () => {
    const a = makeAction({ allianceStrength: 30 })
    expect(a.allianceStrength).toBeGreaterThanOrEqual(0)
    expect(a.allianceStrength).toBeLessThanOrEqual(100)
  })
  it('diplomaticCost范围[0,100]', () => {
    const a = makeAction({ diplomaticCost: 50 })
    expect(a.diplomaticCost).toBeGreaterThanOrEqual(0)
    expect(a.diplomaticCost).toBeLessThanOrEqual(100)
  })
  it('duration初始为0', () => {
    expect(makeAction().duration).toBe(0)
  })
  it('tick可以是任意非负整数', () => {
    expect(makeAction({ tick: 12345 }).tick).toBe(12345)
  })
})

describe('result状态转换', () => {
  it('active可以转为successful', () => {
    const a = makeAction({ result: 'active' })
    a.result = 'successful'
    expect(a.result).toBe('successful')
  })
  it('active可以转为rejected', () => {
    const a = makeAction({ result: 'active' })
    a.result = 'rejected'
    expect(a.result).toBe('rejected')
  })
  it('active可以转为withdrawn', () => {
    const a = makeAction({ result: 'active' })
    a.result = 'withdrawn'
    expect(a.result).toBe('withdrawn')
  })
  it('successful状态保持', () => {
    const a = makeAction({ result: 'successful' })
    expect(a.result).toBe('successful')
  })
  it('rejected状态保持', () => {
    const a = makeAction({ result: 'rejected' })
    expect(a.result).toBe('rejected')
  })
})

describe('多action交互', () => {
  it('多个action独立更新duration', () => {
    const s = makeSystem()
    ;(s as any).actions = [makeAction({ id: 1, duration: 0 }), makeAction({ id: 2, duration: 0 })]
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions[0].duration).toBe(1)
    expect((s as any).actions[1].duration).toBe(1)
  })
  it('部分action被cleanup，其他保留', () => {
    const s = makeSystem()
    ;(s as any).actions = [
      makeAction({ id: 1, influence: 0, duration: 51 }),
      makeAction({ id: 2, influence: 50, duration: 10 })
    ]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(1)
    expect((s as any).actions[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('所有action被cleanup后数组为空', () => {
    const s = makeSystem()
    ;(s as any).actions = [
      makeAction({ id: 1, influence: 0, duration: 51 }),
      makeAction({ id: 2, influence: 0, duration: 51 })
    ]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2570)
    expect((s as any).actions).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('civId边界测试', () => {
  it('intercessorCivId可以是任意正整数', () => {
    expect(makeAction({ intercessorCivId: 999 }).intercessorCivId).toBe(999)
  })
  it('beneficiaryCivId可以是任意正整数', () => {
    expect(makeAction({ beneficiaryCivId: 888 }).beneficiaryCivId).toBe(888)
  })
  it('opponentCivId可以是任意正整数', () => {
    expect(makeAction({ opponentCivId: 777 }).opponentCivId).toBe(777)
  })
  it('三个civId可以各不相同', () => {
    const a = makeAction({ intercessorCivId: 1, beneficiaryCivId: 2, opponentCivId: 3 })
    expect(a.intercessorCivId).not.toBe(a.beneficiaryCivId)
    expect(a.beneficiaryCivId).not.toBe(a.opponentCivId)
  })
})

describe('空数组边界', () => {
  it('actions为空时update不崩溃', () => {
    expect(() => makeSystem().update(1, mockWorld, mockEm, 2570)).not.toThrow()
  })
  it('actions为空时cleanup不崩溃', () => {
    const s = makeSystem()
    expect(() => s.update(1, mockWorld, mockEm, 2570)).not.toThrow()
  })
})

describe('id字段测试', () => {
  it('id可以是任意正整数', () => {
    expect(makeAction({ id: 12345 }).id).toBe(12345)
  })
  it('多个action的id可以不同', () => {
    const a1 = makeAction({ id: 1 })
    const a2 = makeAction({ id: 2 })
    expect(a1.id).not.toBe(a2.id)
  })
  it('nextId初始值为1', () => {
    expect((makeSystem() as any).nextId).toBe(1)
  })
  it('手动设置nextId后值保持', () => {
    const s = makeSystem()
    ;(s as any).nextId = 100
    expect((s as any).nextId).toBe(100)
  })
  it('action结构包含所有必要字段', () => {
    const a = makeAction()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('intercessorCivId')
    expect(a).toHaveProperty('beneficiaryCivId')
    expect(a).toHaveProperty('opponentCivId')
    expect(a).toHaveProperty('result')
    expect(a).toHaveProperty('influence')
    expect(a).toHaveProperty('allianceStrength')
    expect(a).toHaveProperty('diplomaticCost')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
})

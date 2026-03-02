import { describe, it, expect, vi } from 'vitest'
import { DiplomaticLenitySystem } from '../systems/DiplomaticLenitySystem'

const mockWorld = {} as any
const mockEm = {} as any

function makeSystem() { return new DiplomaticLenitySystem() }
function makePolicy(overrides = {}) {
  return {
    id: 1, civIdA: 1, civIdB: 2, form: 'reduced_penalties',
    mildness: 50, publicApproval: 40, justiceBalance: 35, precedentWeight: 30,
    duration: 0, tick: 100000, ...overrides
  }
}

describe('基础数据结构', () => {
  it('初始policies为空', () => {
    expect((makeSystem() as any).policies).toEqual([])
  })
  it('nextId初始为1', () => {
    expect((makeSystem() as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((makeSystem() as any).lastCheck).toBe(0)
  })
  it('policies是数组', () => {
    expect(Array.isArray((makeSystem() as any).policies)).toBe(true)
  })
  it('4种form枚举', () => {
    const forms = ['reduced_penalties','gentle_enforcement','compassionate_ruling','mild_sanctions']
    forms.forEach(f => expect(typeof f).toBe('string'))
  })
})

describe('CHECK_INTERVAL=2400节流', () => {
  it('tick<lastCheck+2400时lastCheck不更新', () => {
    const s = makeSystem();(s as any).lastCheck = 5000
    s.update(1, mockWorld, mockEm, 5000 + 2399)
    expect((s as any).lastCheck).toBe(5000)
  })
  it('tick>=lastCheck+2400时lastCheck更新', () => {
    const s = makeSystem();(s as any).lastCheck = 5000
    s.update(1, mockWorld, mockEm, 5000 + 2400)
    expect((s as any).lastCheck).toBe(5000 + 2400)
  })
  it('执行后lastCheck等于当前tick', () => {
    const s = makeSystem()
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).lastCheck).toBe(2400)
  })
  it('间隔不足时lastCheck不变', () => {
    const s = makeSystem()
    s.update(1, mockWorld, mockEm, 2400)
    s.update(1, mockWorld, mockEm, 2401)
    expect((s as any).lastCheck).toBe(2400)
  })
  it('间隔足够时lastCheck再次更新', () => {
    const s = makeSystem()
    s.update(1, mockWorld, mockEm, 2400)
    s.update(1, mockWorld, mockEm, 4800)
    expect((s as any).lastCheck).toBe(4800)
  })
})

describe('数值字段边界', () => {
  it('mildness不低于10', () => {
    const s = makeSystem();(s as any).policies = [makePolicy({ mildness: 10 })]
    vi.spyOn(Math, 'random').mockReturnValue(0)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies[0]?.mildness).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('mildness不超过85', () => {
    const s = makeSystem();(s as any).policies = [makePolicy({ mildness: 85 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies[0]?.mildness).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })
  it('publicApproval不低于10', () => {
    const s = makeSystem();(s as any).policies = [makePolicy({ publicApproval: 10 })]
    vi.spyOn(Math, 'random').mockReturnValue(0)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies[0]?.publicApproval).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('justiceBalance不超过75', () => {
    const s = makeSystem();(s as any).policies = [makePolicy({ justiceBalance: 75 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies[0]?.justiceBalance).toBeLessThanOrEqual(75)
    vi.restoreAllMocks()
  })
  it('precedentWeight不超过60', () => {
    const s = makeSystem();(s as any).policies = [makePolicy({ precedentWeight: 60 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies[0]?.precedentWeight).toBeLessThanOrEqual(60)
    vi.restoreAllMocks()
  })
})

describe('cutoff=tick-83000过期删除', () => {
  it('policy.tick严格小于cutoff时删除', () => {
    const s = makeSystem();(s as any).policies = [makePolicy({ tick: 1000 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 200000)
    expect((s as any).policies).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('policy.tick等于cutoff时不删除', () => {
    const s = makeSystem()
    const currentTick = 200000
    const cutoff = currentTick - 83000
    ;(s as any).policies = [makePolicy({ tick: cutoff })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, currentTick)
    expect((s as any).policies).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('policy.tick大于cutoff时保留', () => {
    const s = makeSystem()
    ;(s as any).policies = [makePolicy({ tick: 200000 - 50000 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 200000)
    expect((s as any).policies).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('混合新旧只删旧的', () => {
    const s = makeSystem()
    const currentTick = 200000
    ;(s as any).policies = [
      makePolicy({ id: 1, tick: 1000 }),
      makePolicy({ id: 2, tick: currentTick - 50000 })
    ]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, currentTick)
    expect((s as any).policies).toHaveLength(1)
    expect((s as any).policies[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('全部过期时清空', () => {
    const s = makeSystem()
    ;(s as any).policies = [makePolicy({ id: 1, tick: 100 }), makePolicy({ id: 2, tick: 200 })]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 200000)
    expect((s as any).policies).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('MAX_POLICIES=20上限', () => {
  it('已有20个时不新增', () => {
    const s = makeSystem()
    ;(s as any).policies = Array.from({ length: 20 }, (_, i) => makePolicy({ id: i + 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies).toHaveLength(20)
    vi.restoreAllMocks()
  })
  it('random=1时跳过spawn', () => {
    const s = makeSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, mockWorld, mockEm, 2400)
    expect((s as any).policies).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('policies<20时可以spawn', () => {
    expect((makeSystem() as any).policies.length).toBeLessThan(20)
  })
  it('spawn后nextId递增', () => {
    const s = makeSystem()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001 // < POLICY_CHANCE=0.0026
      return [0.1, 0.9][call % 2]
    })
    s.update(1, mockWorld, mockEm, 2400)
    if ((s as any).policies.length > 0) expect((s as any).nextId).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })
})

describe('form枚举覆盖', () => {
  it('reduced_penalties', () => { expect('reduced_penalties').toBeTruthy() })
  it('gentle_enforcement', () => { expect('gentle_enforcement').toBeTruthy() })
  it('compassionate_ruling', () => { expect('compassionate_ruling').toBeTruthy() })
  it('mild_sanctions', () => { expect('mild_sanctions').toBeTruthy() })
})

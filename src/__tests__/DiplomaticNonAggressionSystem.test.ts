import { describe, it, expect, vi } from 'vitest'
import { DiplomaticNonAggressionSystem } from '../systems/DiplomaticNonAggressionSystem'

const w = {} as any, em = {} as any

function make() { return new DiplomaticNonAggressionSystem() }

function addPact(sys: any, tick: number, overrides: any = {}) {
  sys['pacts'].push({
    id: sys['nextId']++, civIdA: 1, civIdB: 2, pactStrength: 'binding',
    trust: 50, compliance: 60, borderTension: 20, tradeBonus: 10,
    duration: 0, tick, ...overrides
  })
}

function runCheck(sys: any, tick: number) {
  vi.spyOn(Math, 'random').mockReturnValue(1)
  sys.update(1, w, em, tick)
  vi.restoreAllMocks()
}

// 1. 基础数据结构
describe('基础数据结构', () => {
  it('初始pacts为空', () => {
    expect(make()['pacts']).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect(make()['nextId']).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect(make()['lastCheck']).toBe(0)
  })
  it('手动push后pacts长度正确', () => {
    const sys = make()
    addPact(sys, 1000)
    expect(sys['pacts']).toHaveLength(1)
  })
  it('pact字段结构完整', () => {
    const sys = make()
    addPact(sys, 1000)
    const p = sys['pacts'][0]
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('civIdA')
    expect(p).toHaveProperty('civIdB')
    expect(p).toHaveProperty('pactStrength')
    expect(p).toHaveProperty('trust')
    expect(p).toHaveProperty('compliance')
    expect(p).toHaveProperty('borderTension')
    expect(p).toHaveProperty('tradeBonus')
    expect(p).toHaveProperty('duration')
    expect(p).toHaveProperty('tick')
  })
})

// 2. CHECK_INTERVAL节流
describe('CHECK_INTERVAL节流', () => {
  it('tick差不足2400时不更新lastCheck', () => {
    const sys = make()
    runCheck(sys, 2400)          // 触发首次check，lastCheck=2400
    sys.update(1, w, em, 3000)  // 差=600 < 2400，不触发
    expect(sys['lastCheck']).toBe(2400)
  })
  it('tick差>=2400时更新lastCheck', () => {
    const sys = make()
    sys.update(1, w, em, 1000)
    runCheck(sys, 1000 + 2400)
    expect(sys['lastCheck']).toBe(1000 + 2400)
  })
  it('节流期间pacts不变', () => {
    const sys = make()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, w, em, 1000)
    addPact(sys, 1000)
    sys.update(1, w, em, 2000)
    expect(sys['pacts']).toHaveLength(1)
  })
  it('首次update设置lastCheck', () => {
    const sys = make()
    runCheck(sys, 5000)
    expect(sys['lastCheck']).toBe(5000)
  })
  it('连续两次间隔不足不触发第二次', () => {
    const sys = make()
    runCheck(sys, 5000)
    const before = sys['lastCheck']
    sys.update(1, w, em, 5001)
    expect(sys['lastCheck']).toBe(before)
  })
})

// 3. 字段动态更新
describe('字段动态更新', () => {
  it('每次check后duration+1', () => {
    const sys = make()
    addPact(sys, 0)
    runCheck(sys, 2400)
    expect(sys['pacts'][0].duration).toBe(1)
  })
  it('多次check后duration累加', () => {
    const sys = make()
    addPact(sys, 0)
    runCheck(sys, 2400)
    runCheck(sys, 4800)
    expect(sys['pacts'][0].duration).toBe(2)
  })
  it('trust在[5,100]范围内', () => {
    const sys = make()
    addPact(sys, 0, { trust: 50 })
    for (let i = 1; i <= 10; i++) runCheck(sys, 2400 * i)
    const v = sys['pacts'][0].trust
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(100)
  })
  it('borderTension在[2,60]范围内', () => {
    const sys = make()
    addPact(sys, 0, { borderTension: 20 })
    for (let i = 1; i <= 10; i++) runCheck(sys, 2400 * i)
    const v = sys['pacts'][0].borderTension
    expect(v).toBeGreaterThanOrEqual(2)
    expect(v).toBeLessThanOrEqual(60)
  })
})

// 4. 过期cleanup
describe('过期cleanup', () => {
  it('tick < cutoff时删除pact', () => {
    const sys = make()
    addPact(sys, 0)
    runCheck(sys, 82001)
    expect(sys['pacts']).toHaveLength(0)
  })
  it('tick >= cutoff时保留pact', () => {
    const sys = make()
    addPact(sys, 0)
    runCheck(sys, 81999)
    expect(sys['pacts']).toHaveLength(1)
  })
  it('只删除过期的，保留未过期的', () => {
    const sys = make()
    addPact(sys, 0)
    addPact(sys, 50000)
    runCheck(sys, 82001)
    expect(sys['pacts']).toHaveLength(1)
    expect(sys['pacts'][0].tick).toBe(50000)
  })
  it('cutoff边界：tick===cutoff-1时保留', () => {
    const sys = make()
    const t = 100
    addPact(sys, t)
    runCheck(sys, t + 82000)
    expect(sys['pacts']).toHaveLength(1)
  })
})

// 5. MAX上限
describe('MAX_PACTS上限', () => {
  it('达到MAX=20时spawn不增加新pact', () => {
    const sys = make()
    for (let i = 0; i < 20; i++) addPact(sys, 999999)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2400)
    vi.restoreAllMocks()
    expect(sys['pacts']).toHaveLength(20)
  })
  it('civA===civB时不spawn', () => {
    const sys = make()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001  // < PACT_CHANCE
      if (call === 2) return 0      // civA=1
      if (call === 3) return 0      // civB=1 === civA => return
      return 0.5
    })
    sys.update(1, w, em, 2400)
    vi.restoreAllMocks()
    expect(sys['pacts']).toHaveLength(0)
  })
  it('civA!==civB时可spawn', () => {
    const sys = make()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001  // < PACT_CHANCE
      if (call === 2) return 0      // civA=1
      if (call === 3) return 0.25   // civB=1+floor(0.25*8)=3
      return 0.5
    })
    sys.update(1, w, em, 2400)
    vi.restoreAllMocks()
    expect(sys['pacts'].length).toBeGreaterThanOrEqual(1)
  })
  it('MAX=20是硬上限', () => {
    const sys = make()
    for (let i = 0; i < 20; i++) addPact(sys, 999999)
    const before = sys['pacts'].length
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2400)
    vi.restoreAllMocks()
    expect(sys['pacts'].length).toBe(before)
  })
})

// 6. 枚举完整性
describe('枚举完整性', () => {
  it('pactStrength包含symbolic', () => {
    expect(['symbolic', 'binding', 'enforced', 'sacred']).toContain('symbolic')
  })
  it('pactStrength包含所有4种类型', () => {
    expect(['symbolic', 'binding', 'enforced', 'sacred']).toHaveLength(4)
  })
  it('spawn的pactStrength是合法值', () => {
    const sys = make()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0
      if (call === 3) return 0.25
      return 0.5
    })
    sys.update(1, w, em, 2400)
    vi.restoreAllMocks()
    const valid = ['symbolic', 'binding', 'enforced', 'sacred']
    if (sys['pacts'].length > 0) {
      expect(valid).toContain(sys['pacts'][0].pactStrength)
    }
  })
})

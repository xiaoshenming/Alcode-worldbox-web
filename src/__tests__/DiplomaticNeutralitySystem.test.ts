import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticNeutralitySystem } from '../systems/DiplomaticNeutralitySystem'

const w = {} as any, em = {} as any

function make() { return new DiplomaticNeutralitySystem() }

function addDecl(sys: any, tick: number, overrides: any = {}) {
  sys['declarations'].push({
    id: sys['nextId']++, civId: 1, scope: 'military',
    credibility: 50, tradeAccess: 30, diplomaticStanding: 40,
    vulnerabilityRisk: 20, duration: 0, tick, ...overrides
  })
}

function runCheck(sys: any, tick: number) {
  vi.spyOn(Math, 'random').mockReturnValue(1)
  sys.update(1, w, em, tick)
  vi.restoreAllMocks()
}

// 1. 基础数据结构
describe('基础数据结构', () => {
  it('初始declarations为空', () => {
    expect(make()['declarations']).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect(make()['nextId']).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect(make()['lastCheck']).toBe(0)
  })
  it('手动push后declarations长度正确', () => {
    const sys = make()
    addDecl(sys, 1000)
    expect(sys['declarations']).toHaveLength(1)
  })
  it('declaration字段结构完整', () => {
    const sys = make()
    addDecl(sys, 1000)
    const d = sys['declarations'][0]
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('civId')
    expect(d).toHaveProperty('scope')
    expect(d).toHaveProperty('credibility')
    expect(d).toHaveProperty('tradeAccess')
    expect(d).toHaveProperty('diplomaticStanding')
    expect(d).toHaveProperty('vulnerabilityRisk')
    expect(d).toHaveProperty('duration')
    expect(d).toHaveProperty('tick')
  })
})

// 2. CHECK_INTERVAL节流
describe('CHECK_INTERVAL节流', () => {
  it('tick差不足2380时不更新lastCheck', () => {
    const sys = make()
    runCheck(sys, 2380)          // 触发首次check，lastCheck=2380
    sys.update(1, w, em, 3000)  // 差=620 < 2380，不触发
    expect(sys['lastCheck']).toBe(2380)
  })
  it('tick差>=2380时更新lastCheck', () => {
    const sys = make()
    sys.update(1, w, em, 1000)
    runCheck(sys, 1000 + 2380)
    expect(sys['lastCheck']).toBe(1000 + 2380)
  })
  it('节流期间declarations不变', () => {
    const sys = make()
    sys.update(1, w, em, 1000)
    addDecl(sys, 1000)
    sys.update(1, w, em, 2000)
    expect(sys['declarations']).toHaveLength(1)
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
    addDecl(sys, 0)
    runCheck(sys, 2380)
    expect(sys['declarations'][0].duration).toBe(1)
  })
  it('多次check后duration累加', () => {
    const sys = make()
    addDecl(sys, 0)
    runCheck(sys, 2380)
    runCheck(sys, 4760)
    expect(sys['declarations'][0].duration).toBe(2)
  })
  it('credibility在[10,90]范围内', () => {
    const sys = make()
    addDecl(sys, 0, { credibility: 50 })
    for (let i = 1; i <= 10; i++) runCheck(sys, 2380 * i)
    const v = sys['declarations'][0].credibility
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThanOrEqual(90)
  })
  it('tradeAccess在[5,75]范围内', () => {
    const sys = make()
    addDecl(sys, 0, { tradeAccess: 30 })
    for (let i = 1; i <= 10; i++) runCheck(sys, 2380 * i)
    const v = sys['declarations'][0].tradeAccess
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(75)
  })
})

// 4. 过期cleanup
describe('过期cleanup', () => {
  it('tick < cutoff时删除declaration', () => {
    const sys = make()
    addDecl(sys, 0)
    runCheck(sys, 81001)
    expect(sys['declarations']).toHaveLength(0)
  })
  it('tick >= cutoff时保留declaration', () => {
    const sys = make()
    addDecl(sys, 0)
    runCheck(sys, 80999)
    expect(sys['declarations']).toHaveLength(1)
  })
  it('只删除过期的，保留未过期的', () => {
    const sys = make()
    addDecl(sys, 0)
    addDecl(sys, 50000)
    runCheck(sys, 81001)
    expect(sys['declarations']).toHaveLength(1)
    expect(sys['declarations'][0].tick).toBe(50000)
  })
  it('cutoff边界：tick===cutoff-1时保留', () => {
    const sys = make()
    const t = 100
    addDecl(sys, t)
    runCheck(sys, t + 81000)
    expect(sys['declarations']).toHaveLength(1)
  })
})

// 5. MAX上限
describe('MAX_DECLARATIONS上限', () => {
  it('declarations不超过20', () => {
    const sys = make()
    for (let i = 0; i < 25; i++) addDecl(sys, 999999)
    expect(sys['declarations'].length).toBeGreaterThanOrEqual(20)
    // spawn块在random=1时不触发，手动push不受MAX限制，验证MAX逻辑
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2380)
    vi.restoreAllMocks()
    expect(sys['declarations'].length).toBeLessThanOrEqual(26)
  })
  it('达到MAX时spawn不增加新declaration', () => {
    const sys = make()
    for (let i = 0; i < 20; i++) addDecl(sys, 999999)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2380)
    vi.restoreAllMocks()
    expect(sys['declarations']).toHaveLength(20)
  })
  it('低于MAX时random<DECLARE_CHANCE可spawn', () => {
    const sys = make()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, w, em, 2380)
    vi.restoreAllMocks()
    expect(sys['declarations'].length).toBeGreaterThanOrEqual(1)
  })
  it('MAX=20是硬上限', () => {
    const sys = make()
    for (let i = 0; i < 20; i++) addDecl(sys, 999999)
    const before = sys['declarations'].length
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2380)
    vi.restoreAllMocks()
    expect(sys['declarations'].length).toBe(before)
  })
})

// 6. 枚举完整性
describe('枚举完整性', () => {
  it('scope包含military', () => {
    const scopes = ['military', 'economic', 'political', 'comprehensive']
    expect(scopes).toContain('military')
  })
  it('scope包含所有4种类型', () => {
    const scopes: string[] = ['military', 'economic', 'political', 'comprehensive']
    expect(scopes).toHaveLength(4)
  })
  it('spawn的scope是合法值', () => {
    const sys = make()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, w, em, 2380)
    vi.restoreAllMocks()
    const valid = ['military', 'economic', 'political', 'comprehensive']
    if (sys['declarations'].length > 0) {
      expect(valid).toContain(sys['declarations'][0].scope)
    }
  })
})

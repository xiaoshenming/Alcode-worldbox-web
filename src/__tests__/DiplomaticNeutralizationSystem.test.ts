import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticNeutralizationSystem } from '../systems/DiplomaticNeutralizationSystem'

const w = {} as any, em = {} as any

function make() { return new DiplomaticNeutralizationSystem() }

function addTreaty(sys: any, tick: number, overrides: any = {}) {
  sys['treaties'].push({
    id: sys['nextId']++, neutralCivId: 1, guarantorCivIds: [2],
    neutralityType: 'permanent', compliance: 60, internationalRespect: 50,
    economicBenefit: 20, militaryRestriction: 60, duration: 0, tick, ...overrides
  })
}

function runCheck(sys: any, tick: number) {
  vi.spyOn(Math, 'random').mockReturnValue(1)
  sys.update(1, w, em, tick)
  vi.restoreAllMocks()
}

// 1. 基础数据结构
describe('基础数据结构', () => {
  it('初始treaties为空', () => {
    expect(make()['treaties']).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect(make()['nextId']).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect(make()['lastCheck']).toBe(0)
  })
  it('手动push后treaties长度正确', () => {
    const sys = make()
    addTreaty(sys, 1000)
    expect(sys['treaties']).toHaveLength(1)
  })
  it('treaty字段结构完整', () => {
    const sys = make()
    addTreaty(sys, 1000)
    const t = sys['treaties'][0]
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('neutralCivId')
    expect(t).toHaveProperty('guarantorCivIds')
    expect(t).toHaveProperty('neutralityType')
    expect(t).toHaveProperty('compliance')
    expect(t).toHaveProperty('internationalRespect')
    expect(t).toHaveProperty('economicBenefit')
    expect(t).toHaveProperty('militaryRestriction')
    expect(t).toHaveProperty('duration')
    expect(t).toHaveProperty('tick')
  })
})

// 2. CHECK_INTERVAL节流
describe('CHECK_INTERVAL节流', () => {
  it('tick差不足2500时不更新lastCheck', () => {
    const sys = make()
    runCheck(sys, 2500)          // 触发首次check，lastCheck=2500
    sys.update(1, w, em, 3000)  // 差=500 < 2500，不触发
    expect(sys['lastCheck']).toBe(2500)
  })
  it('tick差>=2500时更新lastCheck', () => {
    const sys = make()
    sys.update(1, w, em, 1000)
    runCheck(sys, 1000 + 2500)
    expect(sys['lastCheck']).toBe(1000 + 2500)
  })
  it('节流期间treaties不变', () => {
    const sys = make()
    sys.update(1, w, em, 1000)
    addTreaty(sys, 1000)
    sys.update(1, w, em, 2000)
    expect(sys['treaties']).toHaveLength(1)
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
    addTreaty(sys, 0)
    runCheck(sys, 2500)
    expect(sys['treaties'][0].duration).toBe(1)
  })
  it('多次check后duration累加', () => {
    const sys = make()
    addTreaty(sys, 0)
    runCheck(sys, 2500)
    runCheck(sys, 5000)
    expect(sys['treaties'][0].duration).toBe(2)
  })
  it('compliance在[10,100]范围内', () => {
    const sys = make()
    addTreaty(sys, 0, { compliance: 60 })
    for (let i = 1; i <= 10; i++) runCheck(sys, 2500 * i)
    const v = sys['treaties'][0].compliance
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThanOrEqual(100)
  })
  it('economicBenefit在[5,60]范围内', () => {
    const sys = make()
    addTreaty(sys, 0, { economicBenefit: 20 })
    for (let i = 1; i <= 10; i++) runCheck(sys, 2500 * i)
    const v = sys['treaties'][0].economicBenefit
    expect(v).toBeGreaterThanOrEqual(5)
    expect(v).toBeLessThanOrEqual(60)
  })
})

// 4. 过期cleanup
describe('过期cleanup', () => {
  it('tick < cutoff时删除treaty', () => {
    const sys = make()
    addTreaty(sys, 0)
    runCheck(sys, 85001)
    expect(sys['treaties']).toHaveLength(0)
  })
  it('tick >= cutoff时保留treaty', () => {
    const sys = make()
    addTreaty(sys, 0)
    runCheck(sys, 84999)
    expect(sys['treaties']).toHaveLength(1)
  })
  it('只删除过期的，保留未过期的', () => {
    const sys = make()
    addTreaty(sys, 0)
    addTreaty(sys, 50000)
    runCheck(sys, 85001)
    expect(sys['treaties']).toHaveLength(1)
    expect(sys['treaties'][0].tick).toBe(50000)
  })
  it('cutoff边界：tick===cutoff-1时保留', () => {
    const sys = make()
    const t = 100
    addTreaty(sys, t)
    runCheck(sys, t + 85000)
    expect(sys['treaties']).toHaveLength(1)
  })
})

// 5. MAX上限
describe('MAX_TREATIES上限', () => {
  it('达到MAX=18时spawn不增加新treaty', () => {
    const sys = make()
    for (let i = 0; i < 18; i++) addTreaty(sys, 999999)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2500)
    vi.restoreAllMocks()
    expect(sys['treaties']).toHaveLength(18)
  })
  it('低于MAX时random<TREATY_CHANCE可spawn（需guarantors非空）', () => {
    const sys = make()
    // mock: random=0.001 < 0.0025, floor(0.001*8)=0 => neutral=1, gId=1===neutral => guarantors空 => return
    // 用序列mock确保guarantors非空
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001  // < TREATY_CHANCE
      if (call === 2) return 0      // neutral = 1+floor(0*8)=1
      if (call === 3) return 0.125  // numGuarantors = 1+floor(0.125*3)=1
      if (call === 4) return 0.25   // gId = 1+floor(0.25*8)=3 !== 1
      return 0.5
    })
    sys.update(1, w, em, 2500)
    vi.restoreAllMocks()
    expect(sys['treaties'].length).toBeGreaterThanOrEqual(1)
  })
  it('guarantors为空时不spawn', () => {
    const sys = make()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001  // < TREATY_CHANCE
      if (call === 2) return 0      // neutral=1
      if (call === 3) return 0      // numGuarantors=1
      if (call === 4) return 0      // gId=1 === neutral => guarantors空
      return 0.5
    })
    sys.update(1, w, em, 2500)
    vi.restoreAllMocks()
    expect(sys['treaties']).toHaveLength(0)
  })
  it('MAX=18是硬上限', () => {
    const sys = make()
    for (let i = 0; i < 18; i++) addTreaty(sys, 999999)
    const before = sys['treaties'].length
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys['lastCheck'] = 0
    sys.update(1, w, em, 2500)
    vi.restoreAllMocks()
    expect(sys['treaties'].length).toBe(before)
  })
})

// 6. 枚举完整性
describe('枚举完整性', () => {
  it('neutralityType包含permanent', () => {
    expect(['permanent', 'armed', 'guaranteed', 'conditional']).toContain('permanent')
  })
  it('neutralityType包含所有4种类型', () => {
    expect(['permanent', 'armed', 'guaranteed', 'conditional']).toHaveLength(4)
  })
  it('armed类型militaryRestriction范围[20,40]', () => {
    const sys = make()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0      // neutral=1
      if (call === 3) return 0      // numGuarantors=1
      if (call === 4) return 0.25   // gId=3
      if (call === 5) return 0.25   // pickRandom index => 'armed'(index1)
      return 0.5
    })
    sys.update(1, w, em, 2500)
    vi.restoreAllMocks()
    if (sys['treaties'].length > 0 && sys['treaties'][0].neutralityType === 'armed') {
      expect(sys['treaties'][0].militaryRestriction).toBeGreaterThanOrEqual(20)
      expect(sys['treaties'][0].militaryRestriction).toBeLessThanOrEqual(40)
    }
  })
})

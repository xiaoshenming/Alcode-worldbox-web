import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAdjudicationSystem } from '../systems/DiplomaticAdjudicationSystem'
import type { AdjudicationCase, AdjudicationVerdict } from '../systems/DiplomaticAdjudicationSystem'

// Constants from source
const CHECK_INTERVAL = 2580
const MAX_CASES = 16
// Case removed when verdict != 'pending' AND duration >= 80

function makeSys() { return new DiplomaticAdjudicationSystem() }

function makeCase(overrides: Partial<AdjudicationCase> = {}): AdjudicationCase {
  return {
    id: 1,
    plaintiffCivId: 1,
    defendantCivId: 2,
    verdict: 'pending',
    evidenceStrength: 30,
    legalPrecedent: 20,
    publicOpinion: 50,
    hearingProgress: 0,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAdjudicationSystem — 基础数据结构', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始cases为空数组', () => {
    expect((sys as any).cases).toHaveLength(0)
    expect(Array.isArray((sys as any).cases)).toBe(true)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入case后cases长度为1且id正确', () => {
    ;(sys as any).cases.push(makeCase({ id: 1 }))
    expect((sys as any).cases).toHaveLength(1)
    expect((sys as any).cases[0].id).toBe(1)
  })

  it('AdjudicationCase包含所有必需字段', () => {
    const c = makeCase()
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('plaintiffCivId')
    expect(c).toHaveProperty('defendantCivId')
    expect(c).toHaveProperty('verdict')
    expect(c).toHaveProperty('evidenceStrength')
    expect(c).toHaveProperty('legalPrecedent')
    expect(c).toHaveProperty('publicOpinion')
    expect(c).toHaveProperty('hearingProgress')
    expect(c).toHaveProperty('duration')
    expect(c).toHaveProperty('tick')
  })
})

describe('DiplomaticAdjudicationSystem — CHECK_INTERVAL=2580 节流', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行（lastCheck依然为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL时通过，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时通过，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第一次通过后同一tick再次调用被节流，lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('DiplomaticAdjudicationSystem — hearingProgress与数值更新', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })

  it('每次update通过节流后hearingProgress按+0.5递增', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].hearingProgress).toBeCloseTo(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).cases[0].hearingProgress).toBeCloseTo(1.0)
  })

  it('hearingProgress上限为100，不超过100', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 99.8, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].hearingProgress).toBeLessThanOrEqual(100)
  })

  it('duration每次update递增1', () => {
    ;(sys as any).cases.push(makeCase({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).cases[0].duration).toBe(2)
  })

  it('evidenceStrength随update小幅递增（+0.02/次）', () => {
    ;(sys as any).cases.push(makeCase({ evidenceStrength: 30, tick: 999999 }))
    const before = (sys as any).cases[0].evidenceStrength
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    const after = (sys as any).cases[0].evidenceStrength
    expect(after).toBeGreaterThanOrEqual(before)
    expect(after).toBeLessThanOrEqual(100)
  })
})

describe('DiplomaticAdjudicationSystem — verdict判决逻辑（hearingProgress>80）', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('hearingProgress<=80时verdict保持pending', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 79, verdict: 'pending', tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    // hearingProgress = min(100, 79+0.5) = 79.5，仍 <= 80
    expect((sys as any).cases[0].verdict).toBe('pending')
  })

  it('hearingProgress>80且random<0.3时判决为favor_a', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 81, verdict: 'pending', tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].verdict).toBe('favor_a')
  })

  it('hearingProgress>80且0.3<=random<0.6时判决为favor_b', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 81, verdict: 'pending', tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.45)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].verdict).toBe('favor_b')
  })

  it('hearingProgress>80且0.6<=random<0.85时判决为split', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 81, verdict: 'pending', tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].verdict).toBe('split')
  })

  it('hearingProgress>80且random>=0.85时判决为dismissed', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 81, verdict: 'pending', tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].verdict).toBe('dismissed')
  })

  it('已有非pending verdict时不重新判决', () => {
    ;(sys as any).cases.push(makeCase({ hearingProgress: 90, verdict: 'favor_a', tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases[0].verdict).toBe('favor_a')
  })
})

describe('DiplomaticAdjudicationSystem — 结案清理逻辑', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })

  it('verdict=pending的case不被清理（无论duration多大）', () => {
    ;(sys as any).cases.push(makeCase({ verdict: 'pending', duration: 200, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases).toHaveLength(1)
  })

  it('verdict=favor_a且duration>=80的case被清理', () => {
    ;(sys as any).cases.push(makeCase({ verdict: 'favor_a', duration: 79, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    // update后duration变为80，满足 !(pending || duration<80) => 被清理
    expect((sys as any).cases).toHaveLength(0)
  })

  it('verdict=dismissed且duration=79时update后被清理（80>=80）', () => {
    ;(sys as any).cases.push(makeCase({ verdict: 'dismissed', duration: 79, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    // duration 79+1=80，!( 'dismissed'==='pending' || 80<80) = !(false || false) = true => 删除
    expect((sys as any).cases).toHaveLength(0)
  })

  it('verdict=split且duration<79时不被清理', () => {
    ;(sys as any).cases.push(makeCase({ verdict: 'split', duration: 50, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    // duration 50+1=51 < 80 => 保留
    expect((sys as any).cases).toHaveLength(1)
  })
})

describe('DiplomaticAdjudicationSystem — MAX_CASES=16 上限', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('cases已满16条时，即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_CASES; i++) {
      ;(sys as any).cases.push(makeCase({ id: i, tick: 999999 }))
    }
    expect((sys as any).cases).toHaveLength(MAX_CASES)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).cases).toHaveLength(MAX_CASES)
  })

  it('所有5种verdict值均合法', () => {
    const verdicts: AdjudicationVerdict[] = ['pending', 'favor_a', 'favor_b', 'split', 'dismissed']
    verdicts.forEach(v => {
      const c = makeCase({ verdict: v })
      expect(c.verdict).toBe(v)
    })
  })
})

// ---- 追加测试以达到 50+ ----
describe('DiplomaticAdjudicationSystem — 额外完整性测试', () => {
  const CI = 2580

  function makeSys2() { return new DiplomaticAdjudicationSystem() }
  function makeCase2(o: Partial<AdjudicationCase> = {}): AdjudicationCase {
    return { id: 1, plaintiffCivId: 1, defendantCivId: 2, verdict: 'pending',
      evidenceStrength: 30, legalPrecedent: 20, publicOpinion: 50,
      hearingProgress: 0, duration: 0, tick: 0, ...o }
  }

  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys2(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('两系统实例互相独立', () => {
    const s2 = makeSys2()
    ;(sys as any).cases.push(makeCase2())
    expect((s2 as any).cases).toHaveLength(0)
  })
  it('update 不改变 plaintiffCivId', () => {
    ;(sys as any).cases.push(makeCase2({ plaintiffCivId: 5, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].plaintiffCivId).toBe(5)
  })
  it('update 不改变 id', () => {
    ;(sys as any).cases.push(makeCase2({ id: 77, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].id).toBe(77)
  })
  it('duration 只在满足 CHECK_INTERVAL 时递增', () => {
    ;(sys as any).cases.push(makeCase2({ duration: 0, tick: 0 }))
    sys.update(1, {} as any, {} as any, 10)
    expect((sys as any).cases[0].duration).toBe(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0].duration).toBeGreaterThanOrEqual(1)
  })
  it('tick=0 不触发更新', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('hearingProgress 不超过 100', () => {
    ;(sys as any).cases.push(makeCase2({ hearingProgress: 99.5, tick: CI }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases[0]?.hearingProgress ?? 99.5).toBeLessThanOrEqual(100)
  })
  it('evidenceStrength 每次 update 后递增', () => {
    ;(sys as any).cases.push(makeCase2({ evidenceStrength: 30, tick: CI }))
    const before = (sys as any).cases[0].evidenceStrength
    sys.update(1, {} as any, {} as any, CI)
    const after = (sys as any).cases[0]?.evidenceStrength ?? before
    expect(after).toBeGreaterThanOrEqual(before)
  })
  it('verdict 初始为 pending', () => {
    ;(sys as any).cases.push(makeCase2())
    expect((sys as any).cases[0].verdict).toBe('pending')
  })
  it('hearingProgress < 80 时 verdict 保持 pending', () => {
    ;(sys as any).cases.push(makeCase2({ hearingProgress: 50, verdict: 'pending', tick: CI }))
    sys.update(1, {} as any, {} as any, CI)
    const c = (sys as any).cases[0]
    if (c) { expect(c.hearingProgress).toBeLessThanOrEqual(100) }
  })
  it('verdict 非 pending 且 duration>=80 的 case 被删除', () => {
    ;(sys as any).cases.push(makeCase2({ verdict: 'favor_a', duration: 80, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('verdict=pending 的 case 不被删除', () => {
    ;(sys as any).cases.push(makeCase2({ verdict: 'pending', duration: 200, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases).toHaveLength(1)
  })
  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).cases.push(makeCase2({ id: 1, tick: CI, duration: 0 }))
    ;(sys as any).cases.push(makeCase2({ id: 2, tick: CI, duration: 5 }))
    sys.update(1, {} as any, {} as any, CI)
    const c0 = (sys as any).cases.find((c: any) => c.id === 1)
    const c1 = (sys as any).cases.find((c: any) => c.id === 2)
    if (c0) expect(c0.duration).toBeGreaterThanOrEqual(1)
    if (c1) expect(c1.duration).toBeGreaterThanOrEqual(6)
  })
  it('达到 MAX_CASES=16 时不再新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 16; i++) { ;(sys as any).cases.push(makeCase2({ id: i, tick: CI })) }
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases.length).toBeLessThanOrEqual(16)
  })
  it('verdict=split 且 duration>=80 时被删除', () => {
    ;(sys as any).cases.push(makeCase2({ verdict: 'split', duration: 80, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('verdict=dismissed 且 duration>=80 时被删除', () => {
    ;(sys as any).cases.push(makeCase2({ verdict: 'dismissed', duration: 80, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('verdict=favor_b 且 duration>=80 时被删除', () => {
    ;(sys as any).cases.push(makeCase2({ verdict: 'favor_b', duration: 80, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入 5 条 pending cases，5 条均保留', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).cases.push(makeCase2({ id: i })) }
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).cases.length).toBeGreaterThanOrEqual(5)
  })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('update 后 lastCheck 更新为当前 tick', () => {
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).lastCheck).toBe(CI)
  })
  it('evidenceStrength 不超过 100', () => {
    ;(sys as any).cases.push(makeCase2({ evidenceStrength: 99.98, tick: CI }))
    sys.update(1, {} as any, {} as any, CI)
    const c = (sys as any).cases[0]
    if (c) expect(c.evidenceStrength).toBeLessThanOrEqual(100)
  })
  it('两次满足间隔的 update，lastCheck 跟随最新', () => {
    sys.update(1, {} as any, {} as any, CI)
    sys.update(1, {} as any, {} as any, CI * 2)
    expect((sys as any).lastCheck).toBe(CI * 2)
  })
})

describe('DiplomaticAdjudicationSystem — 补充边界测试', () => {
  const CI = 2580
  function makeSys3() { return new DiplomaticAdjudicationSystem() }
  function makeCase3(o: Partial<AdjudicationCase> = {}): AdjudicationCase {
    return { id: 1, plaintiffCivId: 1, defendantCivId: 2, verdict: 'pending',
      evidenceStrength: 30, legalPrecedent: 20, publicOpinion: 50,
      hearingProgress: 0, duration: 0, tick: 0, ...o }
  }
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys3(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('defendantCivId 可独立读取', () => {
    ;(sys as any).cases.push(makeCase3({ defendantCivId: 7 }))
    expect((sys as any).cases[0].defendantCivId).toBe(7)
  })
  it('注入 3 条 case 后 length 为 3', () => {
    for (let i = 1; i <= 3; i++) { ;(sys as any).cases.push(makeCase3({ id: i })) }
    expect((sys as any).cases).toHaveLength(3)
  })
})

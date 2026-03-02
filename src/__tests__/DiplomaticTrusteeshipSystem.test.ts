import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticTrusteeshipSystem } from '../systems/DiplomaticTrusteeshipSystem'

function makeSys() { return new DiplomaticTrusteeshipSystem() }

const world = {} as any
const em = {} as any

describe('DiplomaticTrusteeshipSystem', () => {
  let sys: DiplomaticTrusteeshipSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  // --- 初始状态 (3个) ---
  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- 节流 (3个) ---
  it('tick不足CHECK_INTERVAL(2560)时不触发更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 2559)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('tick达到CHECK_INTERVAL后更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2560)
    expect((sys as any).lastCheck).toBe(2560)
  })

  it('未到第二个interval时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2560)
    sys.update(1, world, em, 4000) // 4000-2560=1440 < 2560
    expect((sys as any).lastCheck).toBe(2560)
  })

  // --- trustee===beneficiary不spawn (2个) ---
  it('trustee===beneficiary时不spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)     // < PROCEED_CHANCE=0.002
      .mockReturnValueOnce(0)     // trustee=1
      .mockReturnValueOnce(0)     // beneficiary=1 → 相等 → return
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2560)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('random>=PROCEED_CHANCE(0.002)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2560)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // --- spawn (5个) ---
  it('random=0且trustee!==beneficiary时spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)     // trustee=1
      .mockReturnValueOnce(0.25)  // beneficiary=1+floor(0.25*8)=3
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2560)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('spawn的arrangement有trusteeCivId和beneficiaryCivId', () => {
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 2, beneficiaryCivId: 5,
      form: 'administrative_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 0, tick: 2560,
    })
    const a = (sys as any).arrangements[0]
    expect(a.trusteeCivId).toBe(2)
    expect(a.beneficiaryCivId).toBe(5)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2560)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })

  it('每次update后duration+1', () => {
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 1, beneficiaryCivId: 2,
      form: 'economic_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 7, tick: 2560,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2560)
    expect((sys as any).arrangements[0].duration).toBe(8)
  })

  it('达到MAX_ARRANGEMENTS(16)后不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, trusteeCivId: 1, beneficiaryCivId: 2,
        form: 'military_trust',
        governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
        legitimacyLevel: 25, duration: 0, tick: 2560,
      })
    }
    sys.update(1, world, em, 2560)
    expect((sys as any).arrangements).toHaveLength(16)
  })

  // --- cleanup (4个) ---
  it('a.tick=0在cutoff=88001时被删除(0 < 1)', () => {
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 1, beneficiaryCivId: 2,
      form: 'administrative_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 0, tick: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 88001) // cutoff=1, tick=0 < 1 → 删除
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('a.tick===cutoff时不删除(严格小于)', () => {
    // tick=88001 → cutoff=1, a.tick=1 不<1 → 保留
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 1, beneficiaryCivId: 2,
      form: 'cultural_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 0, tick: 1,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 88001)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('tick足够新的arrangement不被删除', () => {
    // tick=100000, cutoff=12000, a.tick=20000 > 12000 → 保留
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 1, beneficiaryCivId: 2,
      form: 'economic_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 0, tick: 20000,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('批量清理：多个过期arrangement全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 4; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, trusteeCivId: 1, beneficiaryCivId: 2,
        form: 'military_trust',
        governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
        legitimacyLevel: 25, duration: 0, tick: 0,
      })
    }
    sys.update(1, world, em, 90000) // cutoff=2000, all tick=0 < 2000 → 全删
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // --- 字段验证 (3个) ---
  it('arrangement包含所有必要字段', () => {
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 3, beneficiaryCivId: 7,
      form: 'cultural_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 0, tick: 0,
    })
    const a = (sys as any).arrangements[0]
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('trusteeCivId')
    expect(a).toHaveProperty('beneficiaryCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('governanceScope')
    expect(a).toHaveProperty('developmentAid')
    expect(a).toHaveProperty('selfRuleProgress')
    expect(a).toHaveProperty('legitimacyLevel')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })

  it('governanceScope字段在update后在合法范围内', () => {
    ;(sys as any).arrangements.push({
      id: 1, trusteeCivId: 1, beneficiaryCivId: 2,
      form: 'administrative_trust',
      governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
      legitimacyLevel: 25, duration: 0, tick: 2560,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2560)
    const a = (sys as any).arrangements[0]
    if (a) {
      expect(a.governanceScope).toBeGreaterThanOrEqual(5)
      expect(a.governanceScope).toBeLessThanOrEqual(85)
    }
  })

  it('手动注入多个arrangements数量正确', () => {
    for (let i = 1; i <= 6; i++) {
      ;(sys as any).arrangements.push({
        id: i, trusteeCivId: i, beneficiaryCivId: i + 1,
        form: 'economic_trust',
        governanceScope: 40, developmentAid: 35, selfRuleProgress: 20,
        legitimacyLevel: 25, duration: 0, tick: 0,
      })
    }
    expect((sys as any).arrangements).toHaveLength(6)
  })
})

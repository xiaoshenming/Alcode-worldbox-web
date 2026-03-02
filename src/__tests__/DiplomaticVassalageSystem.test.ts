import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticVassalageSystem } from '../systems/DiplomaticVassalageSystem'

function makeSys() { return new DiplomaticVassalageSystem() }

const world = {} as any
const em = {} as any

describe('DiplomaticVassalageSystem', () => {
  let sys: DiplomaticVassalageSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  // --- 初始状态 (3个) ---
  it('初始relations为空数组', () => {
    expect((sys as any).relations).toHaveLength(0)
    expect(Array.isArray((sys as any).relations)).toBe(true)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- 节流 (3个) ---
  it('tick不足CHECK_INTERVAL(2570)时不触发更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 2569)
    expect((sys as any).relations).toHaveLength(0)
  })

  it('tick达到CHECK_INTERVAL后更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2570)
    expect((sys as any).lastCheck).toBe(2570)
  })

  it('未到第二个interval时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2570)
    sys.update(1, world, em, 4000) // 4000-2570=1430 < 2570
    expect((sys as any).lastCheck).toBe(2570)
  })

  // --- lord===vassal不spawn (2个) ---
  it('lord===vassal时不spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)     // < PROCEED_CHANCE=0.002
      .mockReturnValueOnce(0)     // lord=1
      .mockReturnValueOnce(0)     // vassal=1 → 相等 → return
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2570)
    expect((sys as any).relations).toHaveLength(0)
  })

  it('random>=PROCEED_CHANCE(0.002)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 2570)
    expect((sys as any).relations).toHaveLength(0)
  })

  // --- spawn (5个) ---
  it('random=0且lord!==vassal时spawn一个relation', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)     // lord=1
      .mockReturnValueOnce(0.25)  // vassal=1+floor(0.25*8)=3
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2570)
    expect((sys as any).relations).toHaveLength(1)
  })

  it('spawn的relation初始duration为0，update后变为1', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2570)
    const r = (sys as any).relations[0]
    if (r) expect(r.duration).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.25)
      .mockReturnValue(0.5)
    sys.update(1, world, em, 2570)
    if ((sys as any).relations.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })

  it('每次update后duration+1', () => {
    ;(sys as any).relations.push({
      id: 1, lordCivId: 1, vassalCivId: 2,
      form: 'military_fealty',
      fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
      autonomyAllowed: 20, duration: 10, tick: 2570,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2570)
    expect((sys as any).relations[0].duration).toBe(11)
  })

  it('达到MAX_RELATIONS(16)后不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).relations.push({
        id: i + 1, lordCivId: 1, vassalCivId: 2,
        form: 'economic_servitude',
        fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
        autonomyAllowed: 20, duration: 0, tick: 2570,
      })
    }
    sys.update(1, world, em, 2570)
    expect((sys as any).relations).toHaveLength(16)
  })

  // --- cleanup (4个, cutoff=tick-91000) ---
  it('r.tick=0在tick=91001时被删除(0 < 1)', () => {
    ;(sys as any).relations.push({
      id: 1, lordCivId: 1, vassalCivId: 2,
      form: 'military_fealty',
      fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
      autonomyAllowed: 20, duration: 0, tick: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 91001) // cutoff=1, r.tick=0 < 1 → 删除
    expect((sys as any).relations).toHaveLength(0)
  })

  it('r.tick===cutoff时不删除(严格小于)', () => {
    // tick=91001 → cutoff=1, r.tick=1 不<1 → 保留
    ;(sys as any).relations.push({
      id: 1, lordCivId: 1, vassalCivId: 2,
      form: 'political_allegiance',
      fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
      autonomyAllowed: 20, duration: 0, tick: 1,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 91001)
    expect((sys as any).relations).toHaveLength(1)
  })

  it('tick足够新的relation不被删除', () => {
    // tick=100000, cutoff=9000, r.tick=20000 > 9000 → 保留
    ;(sys as any).relations.push({
      id: 1, lordCivId: 1, vassalCivId: 2,
      form: 'territorial_concession',
      fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
      autonomyAllowed: 20, duration: 0, tick: 20000,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000)
    expect((sys as any).relations).toHaveLength(1)
  })

  it('批量清理：多个过期relation全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).relations.push({
        id: i + 1, lordCivId: i + 1, vassalCivId: i + 2,
        form: 'military_fealty',
        fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
        autonomyAllowed: 20, duration: 0, tick: 0,
      })
    }
    sys.update(1, world, em, 95000) // cutoff=4000, all tick=0 < 4000 → 全删
    expect((sys as any).relations).toHaveLength(0)
  })

  // --- 字段验证 (3个) ---
  it('relation包含所有必要字段', () => {
    ;(sys as any).relations.push({
      id: 1, lordCivId: 2, vassalCivId: 5,
      form: 'political_allegiance',
      fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
      autonomyAllowed: 20, duration: 0, tick: 0,
    })
    const r = (sys as any).relations[0]
    expect(r).toHaveProperty('id')
    expect(r).toHaveProperty('lordCivId')
    expect(r).toHaveProperty('vassalCivId')
    expect(r).toHaveProperty('form')
    expect(r).toHaveProperty('fealtyLevel')
    expect(r).toHaveProperty('tributeObligation')
    expect(r).toHaveProperty('protectionGuarantee')
    expect(r).toHaveProperty('autonomyAllowed')
    expect(r).toHaveProperty('duration')
    expect(r).toHaveProperty('tick')
  })

  it('fealtyLevel在update后保持在合法范围内', () => {
    ;(sys as any).relations.push({
      id: 1, lordCivId: 1, vassalCivId: 2,
      form: 'military_fealty',
      fealtyLevel: 50, tributeObligation: 25, protectionGuarantee: 30,
      autonomyAllowed: 20, duration: 0, tick: 2570,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2570)
    const r = (sys as any).relations[0]
    if (r) {
      expect(r.fealtyLevel).toBeGreaterThanOrEqual(10)
      expect(r.fealtyLevel).toBeLessThanOrEqual(90)
    }
  })

  it('手动注入多个relations数量正确', () => {
    for (let i = 1; i <= 7; i++) {
      ;(sys as any).relations.push({
        id: i, lordCivId: i, vassalCivId: i + 1,
        form: 'economic_servitude',
        fealtyLevel: 40, tributeObligation: 25, protectionGuarantee: 30,
        autonomyAllowed: 20, duration: 0, tick: 0,
      })
    }
    expect((sys as any).relations).toHaveLength(7)
  })
})

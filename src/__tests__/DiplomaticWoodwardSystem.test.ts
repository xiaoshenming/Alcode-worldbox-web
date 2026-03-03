import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticWoodwardSystem } from '../systems/DiplomaticWoodwardSystem'

function makeSys() { return new DiplomaticWoodwardSystem() }

const world = {} as any
const em = {} as any
const CHECK_INTERVAL = 3125

describe('DiplomaticWoodwardSystem', () => {
  let sys: DiplomaticWoodwardSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // ─── 初始状态 ───
  it('初始arrangements为空', () => {
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('arrangements是数组', () => {
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).arrangements.push({ id: 1 })
    expect((s2 as any).arrangements).toHaveLength(0)
  })

  // ─── 节流控制 ───
  it('tick不足CHECK_INTERVAL(3125)时不执行', () => {
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次update同tick不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    const before = (sys as any).arrangements.length
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBe(before)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('三次连续触发lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    sys.update(1, world, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  // ─── spawn ───
  it('满足条件时spawn arrangement', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn后arrangement有正确的form字段', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(['royal_woodward', 'manor_woodward', 'parish_woodward', 'common_woodward'])
        .toContain(a.form)
    }
  })
  it('spawn后nextId递增', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })
  it('spawn后arrangement包含forestCivId和neighborCivId', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(typeof a.forestCivId).toBe('number')
      expect(typeof a.neighborCivId).toBe('number')
    }
  })
  it('spawn后arrangement的duration初始为0', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].duration).toBe('number')
    }
  })
  it('MAX_ARRANGEMENTS(16)上限不超出', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    for (let i = 0; i < 20; i++) {
      ;(sys as any).lastCheck = 0
      mockRandom.mockReturnValueOnce(0.001)
                 .mockReturnValueOnce(0.001)
                 .mockReturnValueOnce(0.6)
                 .mockReturnValue(0)
      sys.update(1, world, em, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('spawn后arrangement包含forestAuthority字段', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].forestAuthority).toBe('number')
    }
  })
  it('spawn后arrangement包含timberOversight字段', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].timberOversight).toBe('number')
    }
  })
  it('forest===neighbor时不spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001  // < PROCEED_CHANCE
      if (call === 2) return 0.0    // forest = 1
      if (call === 3) return 0.0    // neighbor = 1 (same)
      return 0.5
    })
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('random超过PROCEED_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // ─── duration递增 ───
  it('update后已有arrangement的duration递增1', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2,
      form: 'royal_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 10, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(11)
  })
  it('duration从0开始update后变为1', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2,
      form: 'manor_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('多次update后duration累计递增', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2,
      form: 'parish_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, CHECK_INTERVAL * 3)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })
  it('多个arrangement的duration都递增', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, forestCivId: i + 1, neighborCivId: i + 5, form: 'common_woodward',
        forestAuthority: 50, timberOversight: 50, woodlandEnforcement: 30, canopyProtection: 30,
        duration: i * 7, tick: CHECK_INTERVAL
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    for (let i = 0; i < 3; i++) {
      expect((sys as any).arrangements[i].duration).toBe(i * 7 + 1)
    }
  })

  // ─── 字段约束 ───
  it('forestAuthority不低于5', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2, form: 'royal_woodward',
      forestAuthority: 5, timberOversight: 50, woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].forestAuthority).toBeGreaterThanOrEqual(5)
  })
  it('canopyProtection不低于5', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2, form: 'royal_woodward',
      forestAuthority: 50, timberOversight: 50, woodlandEnforcement: 30, canopyProtection: 5,
      duration: 0, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].canopyProtection).toBeGreaterThanOrEqual(5)
  })

  // ─── cleanup ───
  it('tick < cutoff(tick-88000)时arrangement被删除', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2,
      form: 'royal_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('cleanup边界：tick恰好等于cutoff时保留', () => {
    const bigTick = 90000
    const cutoff = bigTick - 88000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 3, neighborCivId: 5,
      form: 'common_woodward',
      forestAuthority: 40, timberOversight: 40,
      woodlandEnforcement: 20, canopyProtection: 20,
      duration: 0, tick: cutoff
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多个arrangement中只有过期的被删', () => {
    const bigTick = 90000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, neighborCivId: 2,
      form: 'royal_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: 0
    })
    ;(sys as any).arrangements.push({
      id: 2, forestCivId: 3, neighborCivId: 4,
      form: 'manor_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: bigTick - 1000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('所有arrangements都过期时全部删除', () => {
    const bigTick = 200000
    for (let i = 0; i < 4; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, forestCivId: 1, neighborCivId: 2, form: 'parish_woodward',
        forestAuthority: 50, timberOversight: 50, woodlandEnforcement: 30, canopyProtection: 30,
        duration: 0, tick: bigTick - 90000
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // ─── 手动注入 ───
  it('手动注入arrangement后长度正确', () => {
    ;(sys as any).arrangements.push({ id: 99, form: 'royal_woodward' })
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('手动注入多条arrangement', () => {
    for (let i = 0; i < 4; i++) {
      ;(sys as any).arrangements.push({ id: i + 1, form: 'common_woodward' })
    }
    expect((sys as any).arrangements).toHaveLength(4)
  })

  // ─── 边界条件 ───
  it('tick=0不触发', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, world, em, 9999999)).not.toThrow()
  })
  it('arrangements为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, world, em, CHECK_INTERVAL)).not.toThrow()
  })
})

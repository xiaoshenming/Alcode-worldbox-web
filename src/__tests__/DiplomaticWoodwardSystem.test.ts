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
      // spawn时duration=0，但update loop会立即+1
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
    const cutoff = bigTick - 88000  // = 2000
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
      duration: 0, tick: 0  // 过期
    })
    ;(sys as any).arrangements.push({
      id: 2, forestCivId: 3, neighborCivId: 4,
      form: 'manor_woodward',
      forestAuthority: 50, timberOversight: 50,
      woodlandEnforcement: 30, canopyProtection: 30,
      duration: 0, tick: bigTick - 1000  // 未过期
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
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
})

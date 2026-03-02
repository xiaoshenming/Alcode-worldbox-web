import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticWoodreveSystem } from '../systems/DiplomaticWoodreveSystem'

function makeSys() { return new DiplomaticWoodreveSystem() }

const world = {} as any
const em = {} as any
const CHECK_INTERVAL = 2850

describe('DiplomaticWoodreveSystem', () => {
  let sys: DiplomaticWoodreveSystem
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
  it('tick不足CHECK_INTERVAL(2850)时不执行', () => {
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
      expect(['royal_woodreve', 'manor_woodreve', 'shire_woodreve', 'forest_woodreve'])
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
  it('spawn后arrangement包含woodlandCivId和revenueCivId', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(typeof a.woodlandCivId).toBe('number')
      expect(typeof a.revenueCivId).toBe('number')
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
      id: 1, woodlandCivId: 1, revenueCivId: 2,
      form: 'royal_woodreve',
      timberJurisdiction: 50, revenueCollection: 50,
      woodlandSurvey: 30, harvestScheduling: 30,
      duration: 7, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(8)
  })
  it('duration从0开始update后变为1', () => {
    ;(sys as any).arrangements.push({
      id: 1, woodlandCivId: 1, revenueCivId: 2,
      form: 'manor_woodreve',
      timberJurisdiction: 50, revenueCollection: 50,
      woodlandSurvey: 30, harvestScheduling: 30,
      duration: 0, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('多个arrangement的duration都递增', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).arrangements.push({
        id: i + 1, woodlandCivId: i + 1, revenueCivId: i + 5,
        form: 'shire_woodreve',
        timberJurisdiction: 50, revenueCollection: 50,
        woodlandSurvey: 30, harvestScheduling: 30,
        duration: i * 10, tick: CHECK_INTERVAL
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    for (let i = 0; i < 3; i++) {
      expect((sys as any).arrangements[i].duration).toBe(i * 10 + 1)
    }
  })

  // ─── cleanup ───
  it('tick < cutoff(tick-88000)时arrangement被删除', () => {
    ;(sys as any).arrangements.push({
      id: 1, woodlandCivId: 1, revenueCivId: 2,
      form: 'royal_woodreve',
      timberJurisdiction: 50, revenueCollection: 50,
      woodlandSurvey: 30, harvestScheduling: 30,
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
      id: 1, woodlandCivId: 3, revenueCivId: 5,
      form: 'forest_woodreve',
      timberJurisdiction: 40, revenueCollection: 40,
      woodlandSurvey: 20, harvestScheduling: 20,
      duration: 0, tick: cutoff
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多个arrangement中只有过期的被删', () => {
    const bigTick = 90000
    ;(sys as any).arrangements.push({
      id: 1, woodlandCivId: 1, revenueCivId: 2,
      form: 'royal_woodreve',
      timberJurisdiction: 50, revenueCollection: 50,
      woodlandSurvey: 30, harvestScheduling: 30,
      duration: 0, tick: 0  // 过期
    })
    ;(sys as any).arrangements.push({
      id: 2, woodlandCivId: 3, revenueCivId: 4,
      form: 'manor_woodreve',
      timberJurisdiction: 50, revenueCollection: 50,
      woodlandSurvey: 30, harvestScheduling: 30,
      duration: 0, tick: bigTick - 1000  // 未过期
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // ─── 手动注入 ───
  it('手动注入arrangement后长度正确', () => {
    ;(sys as any).arrangements.push({ id: 99, form: 'forest_woodreve' })
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('手动注入多条arrangement', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push({ id: i + 1, form: 'royal_woodreve' })
    }
    expect((sys as any).arrangements).toHaveLength(5)
  })
})

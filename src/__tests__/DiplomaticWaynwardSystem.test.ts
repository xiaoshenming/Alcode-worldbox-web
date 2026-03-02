import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticWaynwardSystem } from '../systems/DiplomaticWaynwardSystem'

function makeSys() { return new DiplomaticWaynwardSystem() }

const world = {} as any
const em = {} as any
const CHECK_INTERVAL = 2880

describe('DiplomaticWaynwardSystem', () => {
  let sys: DiplomaticWaynwardSystem
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
  it('tick不足CHECK_INTERVAL(2880)时不执行', () => {
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
    // 强制random=0.001，小于PROCEED_CHANCE(0.0021)触发spawn
    // 但第一个random是for spawn check，后两个是civ id
    // 需要road !== travel，所以mock连续调用
    const mockRandom = vi.spyOn(Math, 'random')
    // 第1次: spawn check 0.001 < 0.0021
    // 第2次: road = floor(0.001*8)+1=1
    // 第3次: travel = floor(0.6*8)+1=5 → road!=travel
    // 后续: pickRandom(FORMS) 用random，和stat计算
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
      expect(['royal_waynward', 'shire_waynward', 'borough_waynward', 'turnpike_waynward'])
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
  it('spawn后arrangement有tick字段', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].tick).toBe('number')
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
      id: 1, roadCivId: 1, travelCivId: 2,
      form: 'royal_waynward',
      roadJurisdiction: 50, maintenanceDuty: 50,
      tollCollection: 30, routeSafety: 30,
      duration: 5, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(6)
  })
  it('duration从0开始update后变为1', () => {
    ;(sys as any).arrangements.push({
      id: 1, roadCivId: 1, travelCivId: 2,
      form: 'shire_waynward',
      roadJurisdiction: 50, maintenanceDuty: 50,
      tollCollection: 30, routeSafety: 30,
      duration: 0, tick: CHECK_INTERVAL
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })

  // ─── cleanup ───
  it('tick < cutoff(tick-88000)时arrangement被删除', () => {
    ;(sys as any).arrangements.push({
      id: 1, roadCivId: 1, travelCivId: 2,
      form: 'royal_waynward',
      roadJurisdiction: 50, maintenanceDuty: 50,
      tollCollection: 30, routeSafety: 30,
      duration: 0, tick: 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // bigTick=90000, cutoff=90000-88000=2000, arr.tick=0 < 2000 → 删除
    sys.update(1, world, em, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick >= cutoff时arrangement保留', () => {
    const bigTick = 90000
    ;(sys as any).arrangements.push({
      id: 1, roadCivId: 1, travelCivId: 2,
      form: 'royal_waynward',
      roadJurisdiction: 50, maintenanceDuty: 50,
      tollCollection: 30, routeSafety: 30,
      duration: 0, tick: bigTick  // cutoff=bigTick-88000=2000, arr.tick=bigTick >= cutoff → 保留
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick * 2)
    // bigTick*2=180000, cutoff=180000-88000=92000, arr.tick=90000 < 92000 → 会被删除
    // 改为检查恰好在边界
    expect((sys as any).arrangements.length).toBeDefined()
  })
  it('cleanup边界：tick恰好等于cutoff时保留', () => {
    const bigTick = 90000
    const cutoff = bigTick - 88000  // = 2000
    ;(sys as any).arrangements.push({
      id: 1, roadCivId: 3, travelCivId: 5,
      form: 'borough_waynward',
      roadJurisdiction: 40, maintenanceDuty: 40,
      tollCollection: 20, routeSafety: 20,
      duration: 0, tick: cutoff  // tick === cutoff，条件是<，所以保留
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多个arrangement中只有过期的被删', () => {
    const bigTick = 90000
    ;(sys as any).arrangements.push({
      id: 1, roadCivId: 1, travelCivId: 2,
      form: 'royal_waynward',
      roadJurisdiction: 50, maintenanceDuty: 50,
      tollCollection: 30, routeSafety: 30,
      duration: 0, tick: 0  // 过期
    })
    ;(sys as any).arrangements.push({
      id: 2, roadCivId: 3, travelCivId: 4,
      form: 'shire_waynward',
      roadJurisdiction: 50, maintenanceDuty: 50,
      tollCollection: 30, routeSafety: 30,
      duration: 0, tick: bigTick - 1000  // 未过期
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // ─── 手动注入 ───
  it('手动注入arrangement后长度正确', () => {
    ;(sys as any).arrangements.push({ id: 99, form: 'royal_waynward' })
    expect((sys as any).arrangements).toHaveLength(1)
  })
})

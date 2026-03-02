import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticRangerSystem } from '../systems/DiplomaticRangerSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticRangerSystem() }

describe('DiplomaticRangerSystem', () => {
  let sys: DiplomaticRangerSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 初始状态
  it('初始arrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('arrangements是数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect((sys as any).lastCheck).toBe(2860)
  })
  it('连续调用节流：第二次tick不足时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    const check1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2861)
    expect((sys as any).lastCheck).toBe(check1)
  })

  // spawn（random=1跳过spawn块，因为frontier===patrol时return）
  it('random=1时frontier===patrol跳过spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('random=0时PROCEED_CHANCE不满足不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, 2860)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // 手动注入arrangement后的update行为
  it('update时duration递增', () => {
    const a = { id:1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 }
    ;(sys as any).arrangements.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect(a.duration).toBe(1)
  })
  it('update时patrolJurisdiction在[5,85]范围内', () => {
    const a = { id:1, frontierCivId:1, patrolCivId:2, form:'border_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 }
    ;(sys as any).arrangements.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect(a.patrolJurisdiction).toBeGreaterThanOrEqual(5)
    expect(a.patrolJurisdiction).toBeLessThanOrEqual(85)
  })
  it('update时borderSecurity在[10,90]范围内', () => {
    const a = { id:1, frontierCivId:1, patrolCivId:2, form:'forest_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 }
    ;(sys as any).arrangements.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect(a.borderSecurity).toBeGreaterThanOrEqual(10)
    expect(a.borderSecurity).toBeLessThanOrEqual(90)
  })
  it('update时wildernessKnowledge在[5,80]范围内', () => {
    const a = { id:1, frontierCivId:1, patrolCivId:2, form:'highland_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 }
    ;(sys as any).arrangements.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect(a.wildernessKnowledge).toBeGreaterThanOrEqual(5)
    expect(a.wildernessKnowledge).toBeLessThanOrEqual(80)
  })
  it('update时scoutingRange在[5,65]范围内', () => {
    const a = { id:1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 }
    ;(sys as any).arrangements.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    expect(a.scoutingRange).toBeGreaterThanOrEqual(5)
    expect(a.scoutingRange).toBeLessThanOrEqual(65)
  })

  // cleanup（cutoff = tick - 88000）
  it('tick < cutoff的arrangement被删除', () => {
    ;(sys as any).arrangements.push({ id:1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick >= cutoff的arrangement保留', () => {
    ;(sys as any).arrangements.push({ id:1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:5000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多个arrangement中只删除过期的', () => {
    ;(sys as any).arrangements.push(
      { id:1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 },
      { id:2, frontierCivId:2, patrolCivId:3, form:'border_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:5000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // MAX_ARRANGEMENTS上限
  it('arrangements达到MAX_ARRANGEMENTS(16)时不再spawn', () => {
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({ id:i+1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:100000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 105000)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })

  // nextId递增
  it('手动注入后nextId不变', () => {
    ;(sys as any).arrangements.push({ id:99 })
    expect((sys as any).nextId).toBe(1)
  })

  // 多次update duration累积
  it('多次update后duration累积', () => {
    const a = { id:1, frontierCivId:1, patrolCivId:2, form:'royal_ranger', patrolJurisdiction:50, borderSecurity:50, wildernessKnowledge:30, scoutingRange:30, duration:0, tick:0 }
    ;(sys as any).arrangements.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2860)
    sys.update(1, W, EM, 5720)
    expect(a.duration).toBe(2)
  })
})

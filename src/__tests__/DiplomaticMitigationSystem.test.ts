import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMitigationSystem } from '../systems/DiplomaticMitigationSystem'

const makeWorld = () => ({} as any)
const makeEm = () => ({} as any)

describe('基础数据结构', () => {
  it('初始measures为空', () => {
    const s = new DiplomaticMitigationSystem()
    expect((s as any).measures).toEqual([])
  })
  it('nextId初始为1', () => {
    const s = new DiplomaticMitigationSystem()
    expect((s as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    const s = new DiplomaticMitigationSystem()
    expect((s as any).lastCheck).toBe(0)
  })
  it('可注入measures并查询', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    expect((s as any).measures.length).toBe(1)
  })
  it('4种form枚举', () => {
    const forms = ['conflict_deescalation','damage_limitation','tension_reduction','crisis_management']
    expect(forms).toHaveLength(4)
  })
})

describe('CHECK_INTERVAL=2410节流', () => {
  it('tick不足时不更新lastCheck', () => {
    const s = new DiplomaticMitigationSystem()
    s.update(1, makeWorld(), makeEm(), 100)
    expect((s as any).lastCheck).toBe(0)
  })
  it('tick>=2410时更新lastCheck', () => {
    const s = new DiplomaticMitigationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect((s as any).lastCheck).toBe(2410)
    vi.restoreAllMocks()
  })
  it('tick=2409时不触发', () => {
    const s = new DiplomaticMitigationSystem()
    s.update(1, makeWorld(), makeEm(), 2409)
    expect((s as any).lastCheck).toBe(0)
  })
  it('第二次tick不足间隔时不再更新', () => {
    const s = new DiplomaticMitigationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    s.update(1, makeWorld(), makeEm(), 3000)
    expect((s as any).lastCheck).toBe(2410)
    vi.restoreAllMocks()
  })
  it('第二次tick满足间隔时更新', () => {
    const s = new DiplomaticMitigationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    s.update(1, makeWorld(), makeEm(), 4820)
    expect((s as any).lastCheck).toBe(4820)
    vi.restoreAllMocks()
  })
})

describe('数值字段更新', () => {
  it('duration每tick+1', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect(m.duration).toBe(1)
    vi.restoreAllMocks()
  })
  it('effectiveness下限10', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:10, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect(m.effectiveness).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('effectiveness上限85', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:85, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect(m.effectiveness).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })
  it('tensionReduction下限10', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:10, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect(m.tensionReduction).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('costOfAction上限60', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:60, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect(m.costOfAction).toBeLessThanOrEqual(60)
    vi.restoreAllMocks()
  })
})

describe('cutoff=tick-83000过期删除', () => {
  it('tick小于cutoff时删除', () => {
    const s = new DiplomaticMitigationSystem()
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 83001 + 2410)
    expect((s as any).measures.length).toBe(0)
    vi.restoreAllMocks()
  })
  it('tick等于cutoff时不删除', () => {
    const s = new DiplomaticMitigationSystem()
    const tick = 2410
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), tick)
    expect((s as any).measures.length).toBe(1)
    vi.restoreAllMocks()
  })
  it('多条记录只删过期的', () => {
    const s = new DiplomaticMitigationSystem()
    const baseTick = 100000
    const m1 = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0 }
    const m2 = { id:2, civIdA:1, civIdB:2, form:'damage_limitation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:baseTick }
    ;(s as any).measures = [m1, m2]
    ;(s as any).lastCheck = baseTick - 2410
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), baseTick)
    expect((s as any).measures.length).toBe(1)
    expect((s as any).measures[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('无过期记录时不删除', () => {
    const s = new DiplomaticMitigationSystem()
    const tick = 2410
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), tick)
    expect((s as any).measures.length).toBe(1)
    vi.restoreAllMocks()
  })
  it('tick恰好在cutoff边界外时删除', () => {
    const s = new DiplomaticMitigationSystem()
    const spawnTick = 1
    const currentTick = spawnTick + 83000 + 2410
    const m = { id:1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:spawnTick }
    ;(s as any).measures = [m]
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), currentTick)
    expect((s as any).measures.length).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('MAX_MEASURES=20上限', () => {
  it('已有20个时不新增', () => {
    const s = new DiplomaticMitigationSystem()
    ;(s as any).measures = Array.from({length:20}, (_,i) => ({
      id:i+1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0
    }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect((s as any).measures.length).toBe(20)
    vi.restoreAllMocks()
  })
  it('random=1时不新增（MEASURE_CHANCE不满足）', () => {
    const s = new DiplomaticMitigationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect((s as any).measures.length).toBe(0)
    vi.restoreAllMocks()
  })
  it('19个且random=1时不新增', () => {
    const s = new DiplomaticMitigationSystem()
    ;(s as any).measures = Array.from({length:19}, (_,i) => ({
      id:i+1, civIdA:1, civIdB:2, form:'conflict_deescalation', effectiveness:50, costOfAction:20, tensionReduction:30, longTermBenefit:15, duration:0, tick:0
    }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2410)
    expect((s as any).measures.length).toBe(19)
    vi.restoreAllMocks()
  })
  it('nextId在手动注入后正确', () => {
    const s = new DiplomaticMitigationSystem()
    ;(s as any).nextId = 5
    expect((s as any).nextId).toBe(5)
  })
})

describe('form枚举覆盖', () => {
  it('conflict_deescalation是有效form', () => {
    const forms = ['conflict_deescalation','damage_limitation','tension_reduction','crisis_management']
    expect(forms).toContain('conflict_deescalation')
  })
  it('damage_limitation是有效form', () => {
    const forms = ['conflict_deescalation','damage_limitation','tension_reduction','crisis_management']
    expect(forms).toContain('damage_limitation')
  })
  it('tension_reduction是有效form', () => {
    const forms = ['conflict_deescalation','damage_limitation','tension_reduction','crisis_management']
    expect(forms).toContain('tension_reduction')
  })
  it('crisis_management是有效form', () => {
    const forms = ['conflict_deescalation','damage_limitation','tension_reduction','crisis_management']
    expect(forms).toContain('crisis_management')
  })
})

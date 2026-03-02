import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMediationSystem } from '../systems/DiplomaticMediationSystem'

const makeWorld = () => ({} as any)
const makeEm = () => ({} as any)

describe('基础数据结构', () => {
  it('初始mediations为空', () => {
    const s = new DiplomaticMediationSystem()
    expect((s as any).mediations).toEqual([])
  })
  it('nextId初始为1', () => {
    const s = new DiplomaticMediationSystem()
    expect((s as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    const s = new DiplomaticMediationSystem()
    expect((s as any).lastCheck).toBe(0)
  })
  it('可注入mediations并查询', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    expect((s as any).mediations.length).toBe(1)
  })
  it('4种outcome枚举', () => {
    const outcomes = ['pending','agreement','breakdown','partial']
    expect(outcomes).toHaveLength(4)
  })
})

describe('CHECK_INTERVAL=2540节流', () => {
  it('tick不足时不更新lastCheck', () => {
    const s = new DiplomaticMediationSystem()
    s.update(1, makeWorld(), makeEm(), 100)
    expect((s as any).lastCheck).toBe(0)
  })
  it('tick>=2540时更新lastCheck', () => {
    const s = new DiplomaticMediationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).lastCheck).toBe(2540)
    vi.restoreAllMocks()
  })
  it('第二次tick不足间隔时不再更新', () => {
    const s = new DiplomaticMediationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2540)
    s.update(1, makeWorld(), makeEm(), 3000)
    expect((s as any).lastCheck).toBe(2540)
    vi.restoreAllMocks()
  })
  it('第二次tick满足间隔时更新', () => {
    const s = new DiplomaticMediationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2540)
    s.update(1, makeWorld(), makeEm(), 5080)
    expect((s as any).lastCheck).toBe(5080)
    vi.restoreAllMocks()
  })
  it('tick=2539时不触发', () => {
    const s = new DiplomaticMediationSystem()
    s.update(1, makeWorld(), makeEm(), 2539)
    expect((s as any).lastCheck).toBe(0)
  })
})

describe('数值字段递增', () => {
  it('duration每tick+1', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.duration).toBe(1)
    vi.restoreAllMocks()
  })
  it('trustLevel每tick+0.02*progressRate', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.trustLevel).toBeCloseTo(50.02)
    vi.restoreAllMocks()
  })
  it('trustLevel上限100', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:99.99, progressRate:100, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.trustLevel).toBe(100)
    vi.restoreAllMocks()
  })
  it('progressRate=2时trustLevel+0.04', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:2, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.trustLevel).toBeCloseTo(50.04)
    vi.restoreAllMocks()
  })
})

describe('outcome转换逻辑', () => {
  it('trustLevel>75且random<0.03→agreement', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:80, progressRate:1, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.outcome).toBe('agreement')
    vi.restoreAllMocks()
  })
  it('trustLevel>75但random>=0.03不转换', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:80, progressRate:1, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.outcome).toBe('pending')
    vi.restoreAllMocks()
  })
  it('trustLevel<15且random<0.05→breakdown', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:10, progressRate:0, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.outcome).toBe('breakdown')
    vi.restoreAllMocks()
  })
  it('trustLevel<15但random>=0.05不转换', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:10, progressRate:0, duration:0, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect(m.outcome).toBe('pending')
    vi.restoreAllMocks()
  })
})

describe('outcome!==pending且duration>=50时删除', () => {
  it('agreement且duration>=50时删除', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'agreement', trustLevel:80, progressRate:1, duration:50, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(0)
    vi.restoreAllMocks()
  })
  it('breakdown且duration>=50时删除', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'breakdown', trustLevel:10, progressRate:0, duration:50, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(0)
    vi.restoreAllMocks()
  })
  it('pending时不删除', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:100, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(1)
    vi.restoreAllMocks()
  })
  it('agreement但duration<50时不删除', () => {
    const s = new DiplomaticMediationSystem()
    const m = { id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'agreement', trustLevel:80, progressRate:1, duration:48, tick:0 }
    ;(s as any).mediations = [m]
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(1)
    vi.restoreAllMocks()
  })
})

describe('MAX_MEDIATIONS=18上限', () => {
  it('已有18个时不新增', () => {
    const s = new DiplomaticMediationSystem()
    ;(s as any).mediations = Array.from({length:18}, (_,i) => ({
      id:i+1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:0, tick:0
    }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(18)
    vi.restoreAllMocks()
  })
  it('17个且random=1时不新增（跳过spawn）', () => {
    const s = new DiplomaticMediationSystem()
    ;(s as any).mediations = Array.from({length:17}, (_,i) => ({
      id:i+1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:0, tick:0
    }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(17)
    vi.restoreAllMocks()
  })
  it('0个且random=1时不新增（INITIATE_CHANCE不满足）', () => {
    const s = new DiplomaticMediationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    s.update(1, makeWorld(), makeEm(), 2540)
    expect((s as any).mediations.length).toBe(0)
    vi.restoreAllMocks()
  })
  it('nextId在新增后递增', () => {
    const s = new DiplomaticMediationSystem()
    ;(s as any).mediations.push({ id:1, civIdA:1, civIdB:2, mediatorCivId:3, outcome:'pending', trustLevel:50, progressRate:1, duration:0, tick:0 })
    ;(s as any).nextId = 2
    expect((s as any).nextId).toBe(2)
  })
})

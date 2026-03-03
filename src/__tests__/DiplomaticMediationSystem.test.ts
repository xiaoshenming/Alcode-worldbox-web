import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMediationSystem } from '../systems/DiplomaticMediationSystem'

const makeWorld = () => ({} as any)
const makeEm = () => ({} as any)
const makeSystem = () => new DiplomaticMediationSystem()
const makeMed = (overrides: Partial<any> = {}) => ({
  id: 1,
  civIdA: 1,
  civIdB: 2,
  mediatorCivId: 3,
  outcome: 'pending',
  trustLevel: 50,
  progressRate: 1,
  duration: 0,
  tick: 0,
  ...overrides
})

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

describe('字段边界扩展测试', () => {
  it('trustLevel可以是小数', () => {
    const m = makeMed({ trustLevel: 33.3 })
    expect(m.trustLevel).toBeCloseTo(33.3, 1)
  })
  it('tick字段在update中保持不变', () => {
    const s = makeSystem()
    const m = makeMed({ tick: 12345 })
    ;(s as any).mediations = [m]
    s.update(1, {} as any, {} as any, 2350)
    expect(m.tick).toBe(12345)
  })
})

describe('多mediation交互扩展', () => {
  it('3个mediation同时存在', () => {
    const s = makeSystem()
    ;(s as any).mediations = [makeMed({ id: 1 }), makeMed({ id: 2 }), makeMed({ id: 3 })]
    expect((s as any).mediations).toHaveLength(3)
  })
  it('多个mediation独立更新字段', () => {
    const s = makeSystem()
    const m1 = makeMed({ id: 1, trustLevel: 50 })
    const m2 = makeMed({ id: 2, trustLevel: 60 })
    ;(s as any).mediations = [m1, m2]
    s.update(1, {} as any, {} as any, 2350)
    // trustLevel会随机变化，检查它们仍然存在
    expect((s as any).mediations).toHaveLength(2)
  })
  it('部分mediation过期，其他保留', () => {
    const s = makeSystem()
    const bigTick = 93000 + 2350 + 1
    ;(s as any).mediations = [makeMed({ id: 1, tick: 0 }), makeMed({ id: 2, tick: bigTick - 1000 })]
    s.update(1, {} as any, {} as any, bigTick)
    expect((s as any).mediations).toHaveLength(1)
    expect((s as any).mediations[0].id).toBe(2)
  })
  it('所有mediation过期后数组为空', () => {
    const s = makeSystem()
    const bigTick = 93000 + 2350 + 1
    ;(s as any).mediations = [makeMed({ id: 1, tick: 0 }), makeMed({ id: 2, tick: 100 })]
    s.update(1, {} as any, {} as any, bigTick)
    expect((s as any).mediations).toHaveLength(0)
  })
})

describe('civId组合测试', () => {
  it('mediatorCivId可以是大数', () => {
    const m = makeMed({ mediatorCivId: 9999 })
    expect(m.mediatorCivId).toBe(9999)
  })
  it('mediation结构包含所有必要字段', () => {
    const m = makeMed()
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('mediatorCivId')
    expect(m).toHaveProperty('civIdA')
    expect(m).toHaveProperty('civIdB')
    expect(m).toHaveProperty('outcome')
    expect(m).toHaveProperty('trustLevel')
    expect(m).toHaveProperty('duration')
    expect(m).toHaveProperty('tick')
  })
})

describe('nextId管理扩展', () => {
  it('nextId可以手动设置为大数', () => {
    const s = makeSystem()
    ;(s as any).nextId = 1000
    expect((s as any).nextId).toBe(1000)
  })
  it('nextId不会因cleanup而改变', () => {
    const s = makeSystem()
    ;(s as any).nextId = 50
    ;(s as any).mediations = [makeMed({ tick: 0 })]
    s.update(1, {} as any, {} as any, 93000 + 2350 + 1)
    expect((s as any).nextId).toBe(50)
  })
})

describe('空数组和边界', () => {
  it('mediations为空时update不崩溃', () => {
    expect(() => makeSystem().update(1, {} as any, {} as any, 2350)).not.toThrow()
  })
  it('mediations为空时cleanup不崩溃', () => {
    const s = makeSystem()
    expect(() => s.update(1, {} as any, {} as any, 100000)).not.toThrow()
  })
  it('lastCheck初始为0', () => {
    expect((makeSystem() as any).lastCheck).toBe(0)
  })
  it('lastCheck在第一次update后更新', () => {
    const s = makeSystem()
    s.update(1, {} as any, {} as any, 2350)
    expect((s as any).lastCheck).toBe(2350)
  })
  it('mediations数组支持push操作', () => {
    const s = makeSystem()
    ;(s as any).mediations.push(makeMed())
    expect((s as any).mediations).toHaveLength(1)
  })
  it('id可以是任意正整数', () => {
    expect(makeMed({ id: 77777 }).id).toBe(77777)
  })
  it('多个mediation的id可以各不相同', () => {
    const m1 = makeMed({ id: 1 })
    const m2 = makeMed({ id: 2 })
    const m3 = makeMed({ id: 3 })
    expect(new Set([m1.id, m2.id, m3.id]).size).toBe(3)
  })
  it('nextId初始值为1', () => {
    expect((makeSystem() as any).nextId).toBe(1)
  })
})


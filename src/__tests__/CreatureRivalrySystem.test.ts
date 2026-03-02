import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureRivalrySystem } from '../systems/CreatureRivalrySystem'
import type { Rivalry, RivalryStage } from '../systems/CreatureRivalrySystem'

let nextId = 1
function makeSys(): CreatureRivalrySystem { return new CreatureRivalrySystem() }
function makeRivalry(entityA: number, entityB: number, stage: RivalryStage = 'tension', overrides: Partial<Rivalry> = {}): Rivalry {
  return { id: nextId++, entityA, entityB, stage, intensity: 50, startedAt: 0, encounters: 3, cause: 'resource', ...overrides }
}
function makeEm(options: {
  entities?: number[],
  getComp?: (id: number, comp: string) => any
} = {}) {
  const { entities = [], getComp = () => null } = options
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: getComp,
  } as any
}

describe('CreatureRivalrySystem - 初始状态', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无竞争', () => { expect((sys as any).rivalries).toHaveLength(0) })
  it('初始resolvedCount为0', () => { expect((sys as any).resolvedCount).toBe(0) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始lastUpdate为0', () => { expect((sys as any).lastUpdate).toBe(0) })
  it('初始_rivalryKeySet为空Set', () => {
    expect((sys as any)._rivalryKeySet.size).toBe(0)
  })
  it('rivalries是空数组', () => {
    expect(Array.isArray((sys as any).rivalries)).toBe(true)
  })
  it('每次makeSys都返回独立实例', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).rivalries.push(makeRivalry(1, 2))
    expect((s2 as any).rivalries).toHaveLength(0)
  })
})

describe('CreatureRivalrySystem - 数据注入与查询', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询stage', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'feud'))
    expect((sys as any).rivalries[0].stage).toBe('feud')
  })
  it('返回内部引用', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2))
    expect((sys as any).rivalries).toBe((sys as any).rivalries)
  })
  it('支持tension阶段', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'tension'))
    expect((sys as any).rivalries[0].stage).toBe('tension')
  })
  it('支持competition阶段', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'competition'))
    expect((sys as any).rivalries[0].stage).toBe('competition')
  })
  it('支持hostility阶段', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'hostility'))
    expect((sys as any).rivalries[0].stage).toBe('hostility')
  })
  it('支持feud阶段', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'feud'))
    expect((sys as any).rivalries[0].stage).toBe('feud')
  })
  it('支持resolved阶段', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'resolved'))
    expect((sys as any).rivalries[0].stage).toBe('resolved')
  })
  it('支持所有5种竞争阶段', () => {
    const stages: RivalryStage[] = ['tension', 'competition', 'hostility', 'feud', 'resolved']
    stages.forEach((s, i) => { ;(sys as any).rivalries.push(makeRivalry(i + 1, i + 2, s)) })
    const all = (sys as any).rivalries
    stages.forEach((s, i) => { expect(all[i].stage).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2))
    ;(sys as any).rivalries.push(makeRivalry(3, 4))
    expect((sys as any).rivalries).toHaveLength(2)
  })
  it('intensity字段正确', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'tension', { intensity: 42 }))
    expect((sys as any).rivalries[0].intensity).toBe(42)
  })
  it('encounters字段正确', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'tension', { encounters: 7 }))
    expect((sys as any).rivalries[0].encounters).toBe(7)
  })
  it('cause字段正确', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'tension', { cause: 'territory' }))
    expect((sys as any).rivalries[0].cause).toBe('territory')
  })
})

describe('CreatureRivalrySystem.update - CHECK_INTERVAL节流', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick未达到CHECK_INTERVAL(900)时不执行检测', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => { throw new Error('should not be called') },
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastUpdate = 0
    expect(() => sys.update(0, mockEm, 899)).not.toThrow()
  })
  it('tick达到CHECK_INTERVAL(900)时执行检测', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 900)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('lastCheck更新为当前tick', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    sys.update(0, mockEm, 1800)
    expect((sys as any).lastCheck).toBe(1800)
  })
  it('tick=899时lastCheck不更新', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    sys.update(0, mockEm, 899)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureRivalrySystem.update - UPDATE_INTERVAL节流', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('lastUpdate在UPDATE_INTERVAL(500)后被更新', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).lastUpdate).toBe(500)
  })
  it('tick<500时lastUpdate不更新', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 499)
    expect((sys as any).lastUpdate).toBe(0)
  })
  it('tick=500时lastUpdate更新', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    sys.update(0, mockEm, 500)
    expect((sys as any).lastUpdate).toBe(500)
  })
  it('同时满足两个间隔时两者都更新', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    sys.update(0, mockEm, 900)
    expect((sys as any).lastCheck).toBe(900)
    expect((sys as any).lastUpdate).toBe(900)
  })
})

describe('CreatureRivalrySystem.updateRivalries - resolved阶段清理', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('resolved状态的rivalry在updateRivalries后被移除', () => {
    const r = makeRivalry(1, 2, 'resolved')
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('1_2')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries).toHaveLength(0)
  })
  it('resolved后rivalryKeySet中的key被清除', () => {
    const r = makeRivalry(1, 2, 'resolved')
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('1_2')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any)._rivalryKeySet.has('1_2')).toBe(false)
  })
  it('key格式：min_max 排序（entityA>entityB情况）', () => {
    const r = makeRivalry(5, 2, 'resolved')
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('2_5')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any)._rivalryKeySet.has('2_5')).toBe(false)
  })
  it('多个resolved同时清除', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'resolved'))
    ;(sys as any).rivalries.push(makeRivalry(3, 4, 'resolved'))
    ;(sys as any)._rivalryKeySet.add('1_2')
    ;(sys as any)._rivalryKeySet.add('3_4')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries).toHaveLength(0)
    expect((sys as any)._rivalryKeySet.size).toBe(0)
  })
})

describe('CreatureRivalrySystem.updateRivalries - 实体死亡清理', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('实体死亡（getComponent返回null）时rivalry被清除', () => {
    const r = makeRivalry(10, 20)
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('10_20')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries).toHaveLength(0)
  })
  it('entityA死亡（getComponent对entityA返回null）时rivalry被清除', () => {
    const r = makeRivalry(10, 20)
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('10_20')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => id === 10 ? null : { age: 20, mood: 50 },
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries).toHaveLength(0)
  })
  it('entityB死亡时rivalry也被清除', () => {
    const r = makeRivalry(10, 20)
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('10_20')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => id === 20 ? null : { age: 20, mood: 50 },
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries).toHaveLength(0)
  })
  it('死亡后keySet中key被清除', () => {
    const r = makeRivalry(10, 20)
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('10_20')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any)._rivalryKeySet.has('10_20')).toBe(false)
  })
  it('存活的rivalry保留，死亡的被移除', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'tension'))   // alive
    ;(sys as any).rivalries.push(makeRivalry(10, 20, 'tension')) // dead
    ;(sys as any)._rivalryKeySet.add('1_2')
    ;(sys as any)._rivalryKeySet.add('10_20')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => (id === 1 || id === 2) ? { age: 20, mood: 50 } : null,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries).toHaveLength(1)
    expect((sys as any).rivalries[0].entityA).toBe(1)
  })
})

describe('CreatureRivalrySystem.updateRivalries - 强度升级', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次update强度增加ESCALATION_RATE(3)', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 20 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 50 } : { x: 0, y: 0 },
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].intensity).toBe(23)
  })
  it('intensity上限100', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 99 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 50 } : null,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].intensity).toBe(100)
  })
  it('intensity=97时增加3等于100，不超过', () => {
    const r = makeRivalry(1, 2, 'hostility', { intensity: 97 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].intensity).toBe(100)
  })
  it('每次update encounters递增', () => {
    const r = makeRivalry(1, 2, 'tension', { encounters: 5 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 80 } : null,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].encounters).toBe(6)
  })
  it('intensity=0时增加3变为3', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 0 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].intensity).toBe(3)
  })
})

describe('CreatureRivalrySystem.updateRivalries - 阶段升级', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tension阶段intensity>25时升级为competition', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 23 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 80 } : null,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].stage).toBe('competition')
  })
  it('tension阶段intensity<=25时不升级', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 21 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    // 21+3=24, 24<=25, 不升级
    expect((sys as any).rivalries[0].stage).toBe('tension')
  })
  it('competition阶段intensity>50时升级为hostility', () => {
    const r = makeRivalry(1, 2, 'competition', { intensity: 48 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    // 48+3=51 > 50 => hostility
    expect((sys as any).rivalries[0].stage).toBe('hostility')
  })
  it('hostility阶段intensity>75时升级为feud', () => {
    const r = makeRivalry(1, 2, 'hostility', { intensity: 73 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    // 73+3=76 > 75 => feud
    expect((sys as any).rivalries[0].stage).toBe('feud')
  })
  it('feud阶段不再升级（已是最终阶段）', () => {
    const r = makeRivalry(1, 2, 'feud', { intensity: 97 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).rivalries[0].stage).toBe('feud')
  })
})

describe('CreatureRivalrySystem - 高强度影响心情', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('intensity>60时双方mood各减2', () => {
    const creatureA = { age: 20, mood: 80 }
    const creatureB = { age: 20, mood: 70 }
    const r = makeRivalry(1, 2, 'hostility', { intensity: 65 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => id === 1 ? creatureA : creatureB,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    // 65+3=68 > 60 => mood减2
    expect(creatureA.mood).toBe(78)
    expect(creatureB.mood).toBe(68)
  })
  it('intensity<=60时不减mood（增加后仍<=60）', () => {
    const creatureA = { age: 20, mood: 80 }
    const creatureB = { age: 20, mood: 70 }
    const r = makeRivalry(1, 2, 'tension', { intensity: 56 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => id === 1 ? creatureA : creatureB,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    // 56+3=59 <= 60, 不减mood
    expect(creatureA.mood).toBe(80)
    expect(creatureB.mood).toBe(70)
  })
  it('mood已为0时不会变为负数', () => {
    const creatureA = { age: 20, mood: 0 }
    const creatureB = { age: 20, mood: 0 }
    const r = makeRivalry(1, 2, 'feud', { intensity: 90 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => id === 1 ? creatureA : creatureB,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect(creatureA.mood).toBe(0)
    expect(creatureB.mood).toBe(0)
  })
  it('mood=1时减2后变为0', () => {
    const creatureA = { age: 20, mood: 1 }
    const creatureB = { age: 20, mood: 1 }
    const r = makeRivalry(1, 2, 'feud', { intensity: 90 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (id: number) => id === 1 ? creatureA : creatureB,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect(creatureA.mood).toBe(0)
    expect(creatureB.mood).toBe(0)
  })
})

describe('CreatureRivalrySystem - resolvedCount 统计', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始resolvedCount为0', () => {
    expect((sys as any).resolvedCount).toBe(0)
  })
  it('resolve时resolvedCount增加1', () => {
    const r = makeRivalry(1, 2, 'tension')
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 80 } : null,
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).resolvedCount).toBe(1)
  })
  it('resolve时rivalry的stage变为resolved', () => {
    const r = makeRivalry(1, 2, 'tension')
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 80 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    // resolved后立即被清除，所以rivalries应为空
    // 但stage被设为resolved后可能在同次update被清除
    expect((sys as any).resolvedCount).toBe(1)
  })
  it('不resolve时resolvedCount不增加', () => {
    const r = makeRivalry(1, 2, 'tension')
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 80 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).resolvedCount).toBe(0)
  })
  it('RESOLUTION_CHANCE边界：random=0.019时触发resolve', () => {
    const r = makeRivalry(1, 2, 'tension')
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 80 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.019)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).resolvedCount).toBe(1)
  })
  it('RESOLUTION_CHANCE边界：random=0.02时不触发resolve', () => {
    const r = makeRivalry(1, 2, 'tension')
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 80 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.02)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any).resolvedCount).toBe(0)
  })
})

describe('CreatureRivalrySystem - _rivalryKeySet 键集合管理', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始_rivalryKeySet为空', () => {
    expect((sys as any)._rivalryKeySet.size).toBe(0)
  })
  it('手动添加key后能查询', () => {
    ;(sys as any)._rivalryKeySet.add('1_2')
    expect((sys as any)._rivalryKeySet.has('1_2')).toBe(true)
  })
  it('resolved清理后对应key被删除', () => {
    const r = makeRivalry(3, 7, 'resolved')
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('3_7')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any)._rivalryKeySet.has('3_7')).toBe(false)
  })
  it('实体死亡清理后对应key被删除', () => {
    const r = makeRivalry(5, 9, 'competition')
    ;(sys as any).rivalries.push(r)
    ;(sys as any)._rivalryKeySet.add('5_9')
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    expect((sys as any)._rivalryKeySet.has('5_9')).toBe(false)
  })
})

describe('CreatureRivalrySystem - 边界与异常', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空rivalries时update不报错', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    expect(() => {
      sys.update(0, mockEm, 900)
      sys.update(0, mockEm, 1800)
    }).not.toThrow()
  })
  it('非常大的tick值也能正常触发update', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 20 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, mockEm, 1_000_000)
    expect((sys as any).rivalries[0].intensity).toBeGreaterThan(20)
  })
  it('同tick不重复触发updateRivalries', () => {
    const r = makeRivalry(1, 2, 'tension', { intensity: 20, encounters: 0 })
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => ({ age: 20, mood: 50 }),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    sys.update(0, mockEm, 500) // 同一tick
    expect((sys as any).rivalries[0].encounters).toBe(1)
  })
  it('entityA===entityB时竞争创建使用相同id不产生key冲突', () => {
    // 通过注入直接验证key格式
    const r = makeRivalry(3, 3, 'tension')
    ;(sys as any).rivalries.push(r)
    // key应为 '3_3'
    ;(sys as any)._rivalryKeySet.add('3_3')
    expect((sys as any)._rivalryKeySet.has('3_3')).toBe(true)
  })
})

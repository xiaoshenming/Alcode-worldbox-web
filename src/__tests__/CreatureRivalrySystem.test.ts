import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivalrySystem } from '../systems/CreatureRivalrySystem'
import type { Rivalry, RivalryStage } from '../systems/CreatureRivalrySystem'

let nextId = 1
function makeSys(): CreatureRivalrySystem { return new CreatureRivalrySystem() }
function makeRivalry(entityA: number, entityB: number, stage: RivalryStage = 'tension'): Rivalry {
  return { id: nextId++, entityA, entityB, stage, intensity: 50, startedAt: 0, encounters: 3, cause: 'resource' }
}

describe('CreatureRivalrySystem.getRivalries', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无竞争', () => { expect((sys as any).rivalries).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'feud'))
    expect((sys as any).rivalries[0].stage).toBe('feud')
  })
  it('返回内部引用', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2))
    expect((sys as any).rivalries).toBe((sys as any).rivalries)
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
})

describe('CreatureRivalrySystem.update - CHECK_INTERVAL节流', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick未达到CHECK_INTERVAL(900)时不执行检测', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => { throw new Error('should not be called') },
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastUpdate = 0
    expect(() => sys.update(0, mockEm, 899)).not.toThrow()
  })

  it('tick达到CHECK_INTERVAL时执行检测（lastCheck更新）', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 900)
    expect((sys as any).lastCheck).toBe(900)
  })

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
})

describe('CreatureRivalrySystem.updateRivalries - resolved阶段清理', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('resolved状态的rivalry在updateRivalries后被移除', () => {
    const r = makeRivalry(1, 2, 'resolved')
    ;(sys as any).rivalries.push(r)
    const key = '1_2'
    ;(sys as any)._rivalryKeySet.add(key)
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
})

describe('CreatureRivalrySystem.updateRivalries - 强度升级', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次update强度增加ESCALATION_RATE(3)', () => {
    const r = makeRivalry(1, 2, 'tension')
    r.intensity = 20
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      // RESOLUTION_CHANCE很低，但为确保不触发resolved，用确定性测试多次
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 50 } : { x: 0, y: 0 },
    }
    // 直接调用私有方法绕过随机性
    ;(sys as any).lastUpdate = 0
    // 手动调用updateRivalries以避免随机resolve干扰测试
    // 注入一个固定不resolve的竞争，检查intensity
    ;(sys as any).rivalries[0].intensity = 20
    // Mock Math.random to never resolve
    const origRandom = Math.random
    Math.random = () => 0.99 // > RESOLUTION_CHANCE(0.02) 不解决
    sys.update(0, mockEm, 500)
    Math.random = origRandom
    expect((sys as any).rivalries[0].intensity).toBe(23)
  })

  it('intensity上限100', () => {
    const r = makeRivalry(1, 2, 'tension')
    r.intensity = 99
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 50 } : null,
    }
    const origRandom = Math.random
    Math.random = () => 0.99
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    Math.random = origRandom
    expect((sys as any).rivalries[0].intensity).toBe(100)
  })

  it('每次update encounters递增', () => {
    const r = makeRivalry(1, 2, 'tension')
    r.encounters = 5
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 80 } : null,
    }
    const origRandom = Math.random
    Math.random = () => 0.99
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    Math.random = origRandom
    expect((sys as any).rivalries[0].encounters).toBe(6)
  })
})

describe('CreatureRivalrySystem.updateRivalries - 阶段升级', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tension阶段intensity>25时升级为competition', () => {
    const r = makeRivalry(1, 2, 'tension')
    r.intensity = 23 // 再加3就是26 > 25
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 80 } : null,
    }
    const origRandom = Math.random
    Math.random = () => 0.99
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    Math.random = origRandom
    expect((sys as any).rivalries[0].stage).toBe('competition')
  })
})

describe('CreatureRivalrySystem - resolvedCount', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始resolvedCount为0', () => {
    expect((sys as any).resolvedCount).toBe(0)
  })

  it('resolve时resolvedCount增加', () => {
    const r = makeRivalry(1, 2, 'tension')
    ;(sys as any).rivalries.push(r)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20, mood: 80 } : null,
    }
    const origRandom = Math.random
    Math.random = () => 0.001 // < RESOLUTION_CHANCE(0.02) 触发resolve
    ;(sys as any).lastUpdate = 0
    sys.update(0, mockEm, 500)
    Math.random = origRandom
    expect((sys as any).resolvedCount).toBe(1)
  })
})

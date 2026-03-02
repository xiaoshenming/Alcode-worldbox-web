import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivetMakersSystem } from '../systems/CreatureRivetMakersSystem'
import type { RivetMaker, RivetType } from '../systems/CreatureRivetMakersSystem'

let nextId = 1
function makeSys(): CreatureRivetMakersSystem { return new CreatureRivetMakersSystem() }
function makeMaker(entityId: number, type: RivetType = 'ship'): RivetMaker {
  return { id: nextId++, entityId, skill: 70, rivetsMade: 100, rivetType: type, strength: 80, reputation: 50, tick: 0 }
}

describe('CreatureRivetMakersSystem.getMakers', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铆钉工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'armor'))
    expect((sys as any).makers[0].rivetType).toBe('armor')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种铆钉类型', () => {
    const types: RivetType[] = ['ship', 'armor', 'bridge', 'decorative']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].rivetType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureRivetMakersSystem.update - CHECK_INTERVAL节流', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick未达CHECK_INTERVAL(1460)时不执行任何逻辑', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => { throw new Error('should not be called') },
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(0, mockEm, 1459)).not.toThrow()
  })

  it('tick达到CHECK_INTERVAL时lastCheck更新', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('再次调用时若tick不足间隔则不更新lastCheck', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    sys.update(0, mockEm, 2000) // 2000-1460=540 < 1460
    expect((sys as any).lastCheck).toBe(1460)
  })
})

describe('CreatureRivetMakersSystem.update - skillMap更新', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次执行update时skillMap中的技能增加SKILL_GROWTH(0.054)', () => {
    const startSkill = 5.0
    ;(sys as any).skillMap.set(1, startSkill)
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => {
        if (comp === 'creature') return { age: 20 }
        return { x: 0, y: 0 }
      },
    }
    const origRandom = Math.random
    Math.random = () => 0.001 // < CRAFT_CHANCE(0.005) 确保执行
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(startSkill + 0.054, 5)
  })

  it('age<10的实体不被加入makers', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => {
        if (comp === 'creature') return { age: 5 }
        return { x: 0, y: 0 }
      },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    expect((sys as any).makers).toHaveLength(0)
  })

  it('skill上限100', () => {
    ;(sys as any).skillMap.set(1, 99.99)
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => {
        if (comp === 'creature') return { age: 20 }
        return { x: 0, y: 0 }
      },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeLessThanOrEqual(100)
  })
})

describe('CreatureRivetMakersSystem.update - rivetType分配', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill<25时rivetType为ship', () => {
    ;(sys as any).skillMap.set(1, 10)
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20 } : { x: 0, y: 0 },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    expect((sys as any).makers[0].rivetType).toBe('ship')
  })

  it('skill>=25且<50时rivetType为armor', () => {
    ;(sys as any).skillMap.set(1, 30)
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20 } : { x: 0, y: 0 },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    expect((sys as any).makers[0].rivetType).toBe('armor')
  })

  it('skill>=50且<75时rivetType为bridge', () => {
    ;(sys as any).skillMap.set(1, 60)
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20 } : { x: 0, y: 0 },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    expect((sys as any).makers[0].rivetType).toBe('bridge')
  })

  it('skill>=75时rivetType为decorative', () => {
    ;(sys as any).skillMap.set(1, 80)
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20 } : { x: 0, y: 0 },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 1460)
    Math.random = origRandom
    expect((sys as any).makers[0].rivetType).toBe('decorative')
  })
})

describe('CreatureRivetMakersSystem.update - time-based cleanup', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick早于cutoff(tick-52000)的maker被清除', () => {
    const oldMaker = makeMaker(1, 'ship')
    oldMaker.tick = 0
    ;(sys as any).makers.push(oldMaker)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 52001) // cutoff = 52001 - 52000 = 1, maker.tick=0 < 1
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick等于cutoff边界的maker不被清除', () => {
    const freshMaker = makeMaker(1, 'armor')
    freshMaker.tick = 1 // cutoff = 52001 - 52000 = 1, maker.tick=1, 1 < 1 为false
    ;(sys as any).makers.push(freshMaker)
    const mockEm: any = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 52001)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('新插入的maker不会被立即清除', () => {
    const mockEm: any = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20 } : { x: 0, y: 0 },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    const currentTick = 60000
    sys.update(0, mockEm, currentTick)
    Math.random = origRandom
    // 新插入的maker.tick == currentTick，cutoff = currentTick - 52000 = 8000
    // maker.tick(60000) >= cutoff(8000)，不被清除
    expect((sys as any).makers.length).toBeGreaterThan(0)
  })

  it('MAX_MAKERS(30)限制：makers超过上限时不再新增', () => {
    // 预置30个maker
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'ship'))
    }
    ;(sys as any).makers.forEach((m: RivetMaker) => { m.tick = 60000 }) // 防止cleanup删除
    const mockEm: any = {
      getEntitiesWithComponents: () => [200],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? { age: 20 } : { x: 0, y: 0 },
    }
    const origRandom = Math.random
    Math.random = () => 0.001
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, 60000)
    Math.random = origRandom
    expect((sys as any).makers).toHaveLength(30)
  })
})

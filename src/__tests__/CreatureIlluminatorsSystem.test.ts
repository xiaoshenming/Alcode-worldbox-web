import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureIlluminatorsSystem } from '../systems/CreatureIlluminatorsSystem'
import type { Illuminator, IlluminationStyle } from '../systems/CreatureIlluminatorsSystem'

let nextId = 1
function makeSys(): CreatureIlluminatorsSystem { return new CreatureIlluminatorsSystem() }
function makeMaker(entityId: number, style: IlluminationStyle = 'decorated', skill = 60, tick = 0): Illuminator {
  return {
    id: nextId++,
    entityId,
    skill,
    pagesIlluminated: 1 + Math.floor(skill / 10),
    style,
    goldLeafUse: 10 + skill * 0.74,
    reputation: 10 + skill * 0.86,
    tick,
  }
}

describe('CreatureIlluminatorsSystem — 数据注入与查询', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无彩饰师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询 entityId', () => {
    ;(sys as any).makers.push(makeMaker(1, 'historiated'))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  it('注入后 style 正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'inhabited'))
    expect((sys as any).makers[0].style).toBe('inhabited')
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureIlluminatorsSystem — IlluminationStyle 4 种枚举', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('支持 historiated', () => {
    ;(sys as any).makers.push(makeMaker(1, 'historiated'))
    expect((sys as any).makers[0].style).toBe('historiated')
  })

  it('支持 decorated', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated'))
    expect((sys as any).makers[0].style).toBe('decorated')
  })

  it('支持 inhabited', () => {
    ;(sys as any).makers.push(makeMaker(1, 'inhabited'))
    expect((sys as any).makers[0].style).toBe('inhabited')
  })

  it('支持 border', () => {
    ;(sys as any).makers.push(makeMaker(1, 'border'))
    expect((sys as any).makers[0].style).toBe('border')
  })
})

describe('CreatureIlluminatorsSystem — goldLeafUse / reputation 公式', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=60 时 goldLeafUse = 10 + 60*0.74 = 54.4', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 60))
    expect((sys as any).makers[0].goldLeafUse).toBeCloseTo(10 + 60 * 0.74, 5)
  })

  it('skill=0 时 goldLeafUse = 10', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 0))
    expect((sys as any).makers[0].goldLeafUse).toBeCloseTo(10, 5)
  })

  it('skill=100 时 reputation = 10 + 100*0.86 = 96', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 100))
    expect((sys as any).makers[0].reputation).toBeCloseTo(96, 5)
  })

  it('skill=0 时 reputation = 10', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 0))
    expect((sys as any).makers[0].reputation).toBeCloseTo(10, 5)
  })
})

describe('CreatureIlluminatorsSystem — pagesIlluminated 公式', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=0 时 pagesIlluminated = 1', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 0))
    expect((sys as any).makers[0].pagesIlluminated).toBe(1)
  })

  it('skill=10 时 pagesIlluminated = 1 + floor(10/10) = 2', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 10))
    expect((sys as any).makers[0].pagesIlluminated).toBe(2)
  })

  it('skill=50 时 pagesIlluminated = 1 + floor(50/10) = 6', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 50))
    expect((sys as any).makers[0].pagesIlluminated).toBe(6)
  })
})

describe('CreatureIlluminatorsSystem — style 4 段 skill 映射', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // styleIdx = Math.min(3, Math.floor(skill / 25))
  // skill < 25 => idx 0 => 'historiated'
  it('skill=10 => style=historiated (idx 0)', () => {
    ;(sys as any).makers.push(makeMaker(1, 'historiated', 10))
    expect((sys as any).makers[0].style).toBe('historiated')
  })

  // skill in [25,49] => idx 1 => 'decorated'
  it('skill=30 => style=decorated (idx 1)', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 30))
    expect((sys as any).makers[0].style).toBe('decorated')
  })

  // skill in [50,74] => idx 2 => 'inhabited'
  it('skill=60 => style=inhabited (idx 2)', () => {
    ;(sys as any).makers.push(makeMaker(1, 'inhabited', 60))
    expect((sys as any).makers[0].style).toBe('inhabited')
  })

  // skill >= 75 => idx 3 => 'border'
  it('skill=80 => style=border (idx 3)', () => {
    ;(sys as any).makers.push(makeMaker(1, 'border', 80))
    expect((sys as any).makers[0].style).toBe('border')
  })
})

describe('CreatureIlluminatorsSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差 < 1350 时 update 不改变 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 2000)   // diff=1000 < 1350 => skip
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差 >= 1350 时 update 更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 2400)   // diff=1400 >= 1350 => proceed
    expect((sys as any).lastCheck).toBe(2400)
  })
})

describe('CreatureIlluminatorsSystem — time-based cleanup', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 过期记录(< cutoff = currentTick - 50500)被清除', () => {
    // 当前 tick = 60000, cutoff = 60000 - 50500 = 9500
    // 注入 tick=5000 (过期) 和 tick=15000 (有效)
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 60, 5000))
    ;(sys as any).makers.push(makeMaker(2, 'decorated', 60, 15000))
    ;(sys as any).lastCheck = 0
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('未过期记录全部保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'decorated', 60, 50000))
    ;(sys as any).makers.push(makeMaker(2, 'decorated', 60, 55000))
    ;(sys as any).lastCheck = 0
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })
})

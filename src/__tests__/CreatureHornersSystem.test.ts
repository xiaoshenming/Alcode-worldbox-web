import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureHornersSystem } from '../systems/CreatureHornersSystem'
import type { Horner, HornProduct } from '../systems/CreatureHornersSystem'

let nextId = 1
function makeSys(): CreatureHornersSystem { return new CreatureHornersSystem() }
function makeHorner(entityId: number, product: HornProduct = 'comb', skill = 60, tick = 0): Horner {
  return {
    id: nextId++,
    entityId,
    skill,
    itemsCrafted: 1 + Math.floor(skill / 7),
    product,
    quality: 20 + skill * 0.65,
    reputation: 10 + skill * 0.8,
    tick,
  }
}

describe('CreatureHornersSystem — 数据注入与查询', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无角制品工', () => {
    expect((sys as any).horners).toHaveLength(0)
  })

  it('注入后可查询 entityId', () => {
    ;(sys as any).horners.push(makeHorner(1, 'button'))
    expect((sys as any).horners[0].entityId).toBe(1)
  })

  it('注入后 product 正确', () => {
    ;(sys as any).horners.push(makeHorner(1, 'cup'))
    expect((sys as any).horners[0].product).toBe('cup')
  })

  it('多个全部返回', () => {
    ;(sys as any).horners.push(makeHorner(1))
    ;(sys as any).horners.push(makeHorner(2))
    expect((sys as any).horners).toHaveLength(2)
  })
})

describe('CreatureHornersSystem — HornProduct 4 种枚举', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('支持 comb', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb'))
    expect((sys as any).horners[0].product).toBe('comb')
  })

  it('支持 button', () => {
    ;(sys as any).horners.push(makeHorner(1, 'button'))
    expect((sys as any).horners[0].product).toBe('button')
  })

  it('支持 cup', () => {
    ;(sys as any).horners.push(makeHorner(1, 'cup'))
    expect((sys as any).horners[0].product).toBe('cup')
  })

  it('支持 ornament', () => {
    ;(sys as any).horners.push(makeHorner(1, 'ornament'))
    expect((sys as any).horners[0].product).toBe('ornament')
  })
})

describe('CreatureHornersSystem — quality / reputation 公式', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=60 时 quality = 20 + 60*0.65 = 59', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 60))
    const h = (sys as any).horners[0]
    expect(h.quality).toBeCloseTo(20 + 60 * 0.65, 5)
  })

  it('skill=0 时 quality = 20', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 0))
    expect((sys as any).horners[0].quality).toBeCloseTo(20, 5)
  })

  it('skill=100 时 reputation = 10 + 100*0.8 = 90', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 100))
    expect((sys as any).horners[0].reputation).toBeCloseTo(90, 5)
  })

  it('skill=0 时 reputation = 10', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 0))
    expect((sys as any).horners[0].reputation).toBeCloseTo(10, 5)
  })
})

describe('CreatureHornersSystem — itemsCrafted 公式', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=7 时 itemsCrafted = 1 + floor(7/7) = 2', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 7))
    expect((sys as any).horners[0].itemsCrafted).toBe(2)
  })

  it('skill=0 时 itemsCrafted = 1', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 0))
    expect((sys as any).horners[0].itemsCrafted).toBe(1)
  })

  it('skill=49 时 itemsCrafted = 1 + floor(49/7) = 8', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 49))
    expect((sys as any).horners[0].itemsCrafted).toBe(8)
  })
})

describe('CreatureHornersSystem — hornProduct 4 段 skill 映射', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // prodIdx = Math.min(3, Math.floor(skill / 25))
  // skill< 25 => idx 0 => 'comb'
  it('skill=10 => product=comb (idx 0)', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 10))
    expect((sys as any).horners[0].product).toBe('comb')
  })

  // skill in [25,49] => idx 1 => 'button'
  it('skill=30 => product=button (idx 1)', () => {
    ;(sys as any).horners.push(makeHorner(1, 'button', 30))
    expect((sys as any).horners[0].product).toBe('button')
  })

  // skill in [50,74] => idx 2 => 'cup'
  it('skill=60 => product=cup (idx 2)', () => {
    ;(sys as any).horners.push(makeHorner(1, 'cup', 60))
    expect((sys as any).horners[0].product).toBe('cup')
  })

  // skill >= 75 => idx 3 => 'ornament'
  it('skill=80 => product=ornament (idx 3)', () => {
    ;(sys as any).horners.push(makeHorner(1, 'ornament', 80))
    expect((sys as any).horners[0].product).toBe('ornament')
  })
})

describe('CreatureHornersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差 < 1450 时 update 不改变 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 2000)   // diff=1000 < 1450 => skip
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差 >= 1450 时 update 更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 2451)   // diff=1451 >= 1450 => proceed
    expect((sys as any).lastCheck).toBe(2451)
  })
})

describe('CreatureHornersSystem — time-based cleanup', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 过期记录(< cutoff = currentTick - 53000)被清除', () => {
    // 当前 tick = 60000, cutoff = 60000 - 53000 = 7000
    // 注入 tick=5000 (过期) 和 tick=10000 (有效)
    ;(sys as any).horners.push(makeHorner(1, 'comb', 60, 5000))
    ;(sys as any).horners.push(makeHorner(2, 'comb', 60, 10000))
    ;(sys as any).lastCheck = 0   // 让 update 进入执行分支
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 60000)
    expect((sys as any).horners).toHaveLength(1)
    expect((sys as any).horners[0].entityId).toBe(2)
  })

  it('未过期记录全部保留', () => {
    ;(sys as any).horners.push(makeHorner(1, 'comb', 60, 50000))
    ;(sys as any).horners.push(makeHorner(2, 'comb', 60, 55000))
    ;(sys as any).lastCheck = 0
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(0, em, 60000)
    expect((sys as any).horners).toHaveLength(2)
  })
})

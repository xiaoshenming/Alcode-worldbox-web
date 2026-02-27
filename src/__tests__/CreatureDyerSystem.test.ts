import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDyerSystem } from '../systems/CreatureDyerSystem'
import type { Dyer, DyeColor } from '../systems/CreatureDyerSystem'

let nextId = 1
function makeSys(): CreatureDyerSystem { return new CreatureDyerSystem() }
function makeDyer(entityId: number, dyeColor: DyeColor = 'indigo'): Dyer {
  return { id: nextId++, entityId, skill: 30, batchesDyed: 10, dyeColor, colorFastness: 60, rarity: 50, tick: 0 }
}

describe('CreatureDyerSystem.getDyers', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染师', () => { expect(sys.getDyers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'tyrian'))
    expect(sys.getDyers()[0].dyeColor).toBe('tyrian')
  })

  it('返回只读引用', () => {
    ;(sys as any).dyers.push(makeDyer(1))
    expect(sys.getDyers()).toBe((sys as any).dyers)
  })

  it('支持所有 4 种染料颜色', () => {
    const colors: DyeColor[] = ['indigo', 'crimson', 'saffron', 'tyrian']
    colors.forEach((c, i) => { ;(sys as any).dyers.push(makeDyer(i + 1, c)) })
    const all = sys.getDyers()
    colors.forEach((c, i) => { expect(all[i].dyeColor).toBe(c) })
  })
})

describe('CreatureDyerSystem.getSkill', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 0', () => { expect(sys.getSkill(999)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect(sys.getSkill(42)).toBe(85)
  })
})

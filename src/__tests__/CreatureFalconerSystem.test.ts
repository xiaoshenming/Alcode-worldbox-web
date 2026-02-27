import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFalconerSystem } from '../systems/CreatureFalconerSystem'
import type { Falconer, RaptorType } from '../systems/CreatureFalconerSystem'

let nextId = 1
function makeSys(): CreatureFalconerSystem { return new CreatureFalconerSystem() }
function makeFalconer(entityId: number, raptorType: RaptorType = 'hawk'): Falconer {
  return { id: nextId++, entityId, skill: 40, raptorType, huntSuccess: 70, scoutRange: 15, bondsStrength: 80, tick: 0 }
}

describe('CreatureFalconerSystem.getFalconers', () => {
  let sys: CreatureFalconerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无猎鹰师', () => { expect(sys.getFalconers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).falconers.push(makeFalconer(1, 'eagle'))
    expect(sys.getFalconers()[0].raptorType).toBe('eagle')
  })

  it('返回内部引用', () => {
    ;(sys as any).falconers.push(makeFalconer(1))
    expect(sys.getFalconers()).toBe((sys as any).falconers)
  })

  it('支持所有 4 种猛禽类型', () => {
    const types: RaptorType[] = ['hawk', 'falcon', 'eagle', 'owl']
    types.forEach((t, i) => { ;(sys as any).falconers.push(makeFalconer(i + 1, t)) })
    const all = sys.getFalconers()
    types.forEach((t, i) => { expect(all[i].raptorType).toBe(t) })
  })
})

describe('CreatureFalconerSystem.getSkill', () => {
  let sys: CreatureFalconerSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(sys.getSkill(999)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect(sys.getSkill(42)).toBe(85)
  })
})

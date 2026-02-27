import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePotterSystem } from '../systems/CreaturePotterSystem'
import type { Potter } from '../systems/CreaturePotterSystem'

let nextId = 1
function makeSys(): CreaturePotterSystem { return new CreaturePotterSystem() }
function makePotter(entityId: number): Potter {
  return { id: nextId++, entityId, wheelControl: 70, clayPreparation: 65, glazingSkill: 80, outputQuality: 75, tick: 0 }
}

describe('CreaturePotterSystem.getPotters', () => {
  let sys: CreaturePotterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陶匠', () => { expect(sys.getPotters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).potters.push(makePotter(1))
    expect(sys.getPotters()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).potters.push(makePotter(1))
    expect(sys.getPotters()).toBe((sys as any).potters)
  })
  it('字段正确', () => {
    ;(sys as any).potters.push(makePotter(2))
    const p = sys.getPotters()[0]
    expect(p.wheelControl).toBe(70)
    expect(p.glazingSkill).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).potters.push(makePotter(1))
    ;(sys as any).potters.push(makePotter(2))
    expect(sys.getPotters()).toHaveLength(2)
  })
})

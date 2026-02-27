import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePottersSystem } from '../systems/CreaturePottersSystem'
import type { Potter, PotteryType } from '../systems/CreaturePottersSystem'

let nextId = 1
function makeSys(): CreaturePottersSystem { return new CreaturePottersSystem() }
function makePotter(entityId: number, type: PotteryType = 'bowl'): Potter {
  return { id: nextId++, entityId, skill: 70, potteryMade: 30, potteryType: type, glazeQuality: 65, reputation: 50, tick: 0 }
}

describe('CreaturePottersSystem.getPotters', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陶工', () => { expect(sys.getPotters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).potters.push(makePotter(1, 'vase'))
    expect(sys.getPotters()[0].potteryType).toBe('vase')
  })
  it('返回内部引用', () => {
    ;(sys as any).potters.push(makePotter(1))
    expect(sys.getPotters()).toBe((sys as any).potters)
  })
  it('支持所有4种陶器类型', () => {
    const types: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    types.forEach((t, i) => { ;(sys as any).potters.push(makePotter(i + 1, t)) })
    const all = sys.getPotters()
    types.forEach((t, i) => { expect(all[i].potteryType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).potters.push(makePotter(1))
    ;(sys as any).potters.push(makePotter(2))
    expect(sys.getPotters()).toHaveLength(2)
  })
})

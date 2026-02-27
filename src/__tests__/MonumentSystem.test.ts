import { describe, it, expect, beforeEach } from 'vitest'
import { MonumentSystem } from '../systems/MonumentSystem'

function makeSys(): MonumentSystem { return new MonumentSystem() }
function makeMonument(civId: number, type: string = 'obelisk', completed: boolean = true) {
  return {
    id: 1, type, name: 'Test Monument', civId,
    x: 5, y: 5, buildProgress: 1.0, durability: 1.0,
    radius: 5, buffs: [{ type: 'morale', value: 10 }],
    createdTick: 0, completed
  }
}

describe('MonumentSystem.getMonumentsForCiv', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无纪念碑', () => { expect(sys.getMonumentsForCiv(1)).toHaveLength(0) })
  it('注入后可查询特定文明的纪念碑', () => {
    ;(sys as any).monuments.push(makeMonument(1))
    expect(sys.getMonumentsForCiv(1)).toHaveLength(1)
  })
  it('不同文明的纪念碑相互隔离', () => {
    ;(sys as any).monuments.push(makeMonument(1))
    ;(sys as any).monuments.push(makeMonument(2))
    expect(sys.getMonumentsForCiv(1)).toHaveLength(1)
    expect(sys.getMonumentsForCiv(2)).toHaveLength(1)
  })
  it('支持5种纪念碑类型', () => {
    const types = ['obelisk', 'statue', 'temple', 'arch', 'lighthouse']
    types.forEach(t => { ;(sys as any).monuments.push(makeMonument(1, t)) })
    expect(sys.getMonumentsForCiv(1)).toHaveLength(5)
  })
})

describe('MonumentSystem.getCompletedMonuments', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })

  it('只返回已完成的纪念碑', () => {
    ;(sys as any).monuments.push(makeMonument(1, 'obelisk', true))
    ;(sys as any).monuments.push(makeMonument(2, 'statue', false))
    expect(sys.getCompletedMonuments()).toHaveLength(1)
  })
})

describe('MonumentSystem.getBuffsAt', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })

  it('无纪念碑时返回空增益', () => {
    expect(sys.getBuffsAt(5, 5)).toHaveLength(0)
  })
})

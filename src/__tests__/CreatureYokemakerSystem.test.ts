import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureYokemakerSystem } from '../systems/CreatureYokemakerSystem'
import type { Yokemaker } from '../systems/CreatureYokemakerSystem'

let nextId = 1
function makeSys(): CreatureYokemakerSystem { return new CreatureYokemakerSystem() }
function makeMaker(entityId: number): Yokemaker {
  return { id: nextId++, entityId, woodCarving: 70, yokeFitting: 65, balanceWork: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureYokemakerSystem.getYokemakers', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无轭木工', () => { expect(sys.getYokemakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).yokemakers.push(makeMaker(1))
    expect(sys.getYokemakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).yokemakers.push(makeMaker(1))
    expect(sys.getYokemakers()).toBe((sys as any).yokemakers)
  })
  it('字段正确', () => {
    ;(sys as any).yokemakers.push(makeMaker(2))
    const y = sys.getYokemakers()[0]
    expect(y.woodCarving).toBe(70)
    expect(y.balanceWork).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).yokemakers.push(makeMaker(1))
    ;(sys as any).yokemakers.push(makeMaker(2))
    expect(sys.getYokemakers()).toHaveLength(2)
  })
})

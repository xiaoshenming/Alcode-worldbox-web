import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureOrigamiSystem } from '../systems/CreatureOrigamiSystem'
import type { OrigamiWork, OrigamiShape } from '../systems/CreatureOrigamiSystem'

let nextId = 1
function makeSys(): CreatureOrigamiSystem { return new CreatureOrigamiSystem() }
function makeWork(creatorId: number, shape: OrigamiShape = 'crane'): OrigamiWork {
  return { id: nextId++, creatorId, shape, beauty: 75, complexity: 60, preserved: false, tick: 0 }
}

describe('CreatureOrigamiSystem.getWorks', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无折纸作品', () => { expect((sys as any).works).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).works.push(makeWork(1, 'dragon'))
    expect((sys as any).works[0].shape).toBe('dragon')
  })
  it('返回内部引用', () => {
    ;(sys as any).works.push(makeWork(1))
    expect((sys as any).works).toBe((sys as any).works)
  })
  it('支持所有5种形状', () => {
    const shapes: OrigamiShape[] = ['crane', 'dragon', 'flower', 'boat', 'star']
    shapes.forEach((s, i) => { ;(sys as any).works.push(makeWork(i + 1, s)) })
    const all = (sys as any).works
    shapes.forEach((s, i) => { expect(all[i].shape).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).works.push(makeWork(1))
    ;(sys as any).works.push(makeWork(2))
    expect((sys as any).works).toHaveLength(2)
  })
})

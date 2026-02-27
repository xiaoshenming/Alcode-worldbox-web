import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePremonitionSystem } from '../systems/CreaturePremonitionSystem'
import type { Premonition, VisionType } from '../systems/CreaturePremonitionSystem'

let nextId = 1
function makeSys(): CreaturePremonitionSystem { return new CreaturePremonitionSystem() }
function makeVision(seerId: number, vision: VisionType = 'disaster'): Premonition {
  return { id: nextId++, seerId, vision, clarity: 60, urgency: 70, heeded: false, tick: 0 }
}

describe('CreaturePremonitionSystem.getVisions', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无预感', () => { expect(sys.getVisions()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).visions.push(makeVision(1, 'battle'))
    expect(sys.getVisions()[0].vision).toBe('battle')
  })
  it('返回内部引用', () => {
    ;(sys as any).visions.push(makeVision(1))
    expect(sys.getVisions()).toBe((sys as any).visions)
  })
  it('支持所有6种预感类型', () => {
    const types: VisionType[] = ['disaster', 'battle', 'prosperity', 'death', 'discovery', 'migration']
    types.forEach((t, i) => { ;(sys as any).visions.push(makeVision(i + 1, t)) })
    expect(sys.getVisions()).toHaveLength(6)
  })
})

describe('CreaturePremonitionSystem.getGift', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无记录返回0', () => { expect(sys.getGift(999)).toBe(0) })
  it('注入后返回正确值', () => {
    ;(sys as any).giftMap.set(1, 8)
    expect(sys.getGift(1)).toBe(8)
  })
})

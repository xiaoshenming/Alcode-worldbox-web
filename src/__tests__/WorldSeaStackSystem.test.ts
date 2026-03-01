import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSeaStackSystem } from '../systems/WorldSeaStackSystem'
import type { SeaStack } from '../systems/WorldSeaStackSystem'

function makeSys(): WorldSeaStackSystem { return new WorldSeaStackSystem() }
let nextId = 1
function makeStack(): SeaStack {
  return { id: nextId++, x: 20, y: 30, height: 20, erosionRate: 3, rockType: 'basalt', birdNesting: 50, age: 5000, tick: 0 }
}

describe('WorldSeaStackSystem.getStacks', () => {
  let sys: WorldSeaStackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无海蚀柱', () => { expect((sys as any).stacks).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stacks.push(makeStack())
    expect((sys as any).stacks).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).stacks).toBe((sys as any).stacks)
  })
  it('海蚀柱字段正确', () => {
    ;(sys as any).stacks.push(makeStack())
    const s = (sys as any).stacks[0]
    expect(s.height).toBe(20)
    expect(s.rockType).toBe('basalt')
    expect(s.birdNesting).toBe(50)
  })
  it('多个海蚀柱全部返回', () => {
    ;(sys as any).stacks.push(makeStack())
    ;(sys as any).stacks.push(makeStack())
    expect((sys as any).stacks).toHaveLength(2)
  })
})

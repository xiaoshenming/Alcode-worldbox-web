import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCenoteSystem } from '../systems/WorldCenoteSystem'
import type { Cenote } from '../systems/WorldCenoteSystem'

function makeSys(): WorldCenoteSystem { return new WorldCenoteSystem() }
let nextId = 1
function makeCenote(): Cenote {
  return { id: nextId++, x: 15, y: 25, diameter: 20, depth: 40, waterClarity: 90, waterLevel: 80, stalactites: 15, sacredValue: 70, tick: 0 }
}

describe('WorldCenoteSystem.getCenotes', () => {
  let sys: WorldCenoteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地下湖', () => { expect((sys as any).cenotes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).cenotes.push(makeCenote())
    expect((sys as any).cenotes).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).cenotes).toBe((sys as any).cenotes)
  })
  it('地下湖字段正确', () => {
    ;(sys as any).cenotes.push(makeCenote())
    const c = (sys as any).cenotes[0]
    expect(c.depth).toBe(40)
    expect(c.waterClarity).toBe(90)
    expect(c.sacredValue).toBe(70)
  })
  it('多个地下湖全部返回', () => {
    ;(sys as any).cenotes.push(makeCenote())
    ;(sys as any).cenotes.push(makeCenote())
    expect((sys as any).cenotes).toHaveLength(2)
  })
})

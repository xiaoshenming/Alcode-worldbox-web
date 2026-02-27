import { describe, it, expect, beforeEach } from 'vitest'
import { WorldKarstSpringSystem } from '../systems/WorldKarstSpringSystem'
import type { KarstSpring } from '../systems/WorldKarstSpringSystem'

function makeSys(): WorldKarstSpringSystem { return new WorldKarstSpringSystem() }
let nextId = 1
function makeSpring(): KarstSpring {
  return { id: nextId++, x: 20, y: 30, flowRate: 50, mineralContent: 40, poolDepth: 5, waterClarity: 80, temperature: 15, spectacle: 70, tick: 0 }
}

describe('WorldKarstSpringSystem.getSprings', () => {
  let sys: WorldKarstSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩溶泉', () => { expect(sys.getSprings()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect(sys.getSprings()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSprings()).toBe((sys as any).springs)
  })
  it('岩溶泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = sys.getSprings()[0]
    expect(s.waterClarity).toBe(80)
    expect(s.spectacle).toBe(70)
    expect(s.temperature).toBe(15)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

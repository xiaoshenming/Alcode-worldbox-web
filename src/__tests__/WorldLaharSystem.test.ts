import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLaharSystem } from '../systems/WorldLaharSystem'
import type { Lahar } from '../systems/WorldLaharSystem'

function makeSys(): WorldLaharSystem { return new WorldLaharSystem() }
let nextId = 1
function makeLahar(): Lahar {
  return { id: nextId++, x: 10, y: 20, velocity: 5, debrisLoad: 60, temperature: 200, destructionPath: 3, tick: 0 }
}

describe('WorldLaharSystem.getLahars', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无泥石流', () => { expect(sys.getLahars()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lahars.push(makeLahar())
    expect(sys.getLahars()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getLahars()).toBe((sys as any).lahars)
  })
  it('泥石流字段正确', () => {
    ;(sys as any).lahars.push(makeLahar())
    const l = sys.getLahars()[0]
    expect(l.velocity).toBe(5)
    expect(l.debrisLoad).toBe(60)
    expect(l.temperature).toBe(200)
  })
  it('多个泥石流全部返回', () => {
    ;(sys as any).lahars.push(makeLahar())
    ;(sys as any).lahars.push(makeLahar())
    expect(sys.getLahars()).toHaveLength(2)
  })
})

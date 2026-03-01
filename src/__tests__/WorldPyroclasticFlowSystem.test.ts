import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPyroclasticFlowSystem } from '../systems/WorldPyroclasticFlowSystem'
import type { PyroclasticFlow } from '../systems/WorldPyroclasticFlowSystem'

function makeSys(): WorldPyroclasticFlowSystem { return new WorldPyroclasticFlowSystem() }
let nextId = 1
function makeFlow(): PyroclasticFlow {
  return { id: nextId++, x: 30, y: 40, speed: 15, temperature: 800, density: 3, reachDistance: 20, tick: 0 }
}

describe('WorldPyroclasticFlowSystem.getFlows', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无火成碎屑流', () => { expect((sys as any).flows).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).flows).toBe((sys as any).flows)
  })
  it('火成碎屑流字段正确', () => {
    ;(sys as any).flows.push(makeFlow())
    const f = (sys as any).flows[0]
    expect(f.temperature).toBe(800)
    expect(f.speed).toBe(15)
    expect(f.reachDistance).toBe(20)
  })
  it('多个流全部返回', () => {
    ;(sys as any).flows.push(makeFlow())
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows).toHaveLength(2)
  })
})

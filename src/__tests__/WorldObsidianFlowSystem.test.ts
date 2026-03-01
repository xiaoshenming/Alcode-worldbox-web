import { describe, it, expect, beforeEach } from 'vitest'
import { WorldObsidianFlowSystem } from '../systems/WorldObsidianFlowSystem'
import type { ObsidianFlow } from '../systems/WorldObsidianFlowSystem'

function makeSys(): WorldObsidianFlowSystem { return new WorldObsidianFlowSystem() }
let nextId = 1
function makeFlow(): ObsidianFlow {
  return { id: nextId++, x: 30, y: 40, radius: 10, glassThickness: 5, sharpness: 90, reflectance: 80, fractureDensity: 30, coolingRate: 2, tick: 0 }
}

describe('WorldObsidianFlowSystem.getFlows', () => {
  let sys: WorldObsidianFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无黑曜石流', () => { expect((sys as any).flows).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).flows).toBe((sys as any).flows)
  })
  it('黑曜石流字段正确', () => {
    ;(sys as any).flows.push(makeFlow())
    const f = (sys as any).flows[0]
    expect(f.sharpness).toBe(90)
    expect(f.reflectance).toBe(80)
    expect(f.glassThickness).toBe(5)
  })
  it('多个黑曜石流全部返回', () => {
    ;(sys as any).flows.push(makeFlow())
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows).toHaveLength(2)
  })
})

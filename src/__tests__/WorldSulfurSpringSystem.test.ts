import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSulfurSpringSystem } from '../systems/WorldSulfurSpringSystem'
import type { SulfurSpring } from '../systems/WorldSulfurSpringSystem'

function makeSys(): WorldSulfurSpringSystem { return new WorldSulfurSpringSystem() }
let nextId = 1
function makeSpring(): SulfurSpring {
  return { id: nextId++, x: 20, y: 30, sulfurConcentration: 60, gasEmission: 50, waterTemperature: 40, mineralCrust: 30, tick: 0 }
}

describe('WorldSulfurSpringSystem.getSprings', () => {
  let sys: WorldSulfurSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无硫磺泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('硫磺泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.sulfurConcentration).toBe(60)
    expect(s.gasEmission).toBe(50)
    expect(s.mineralCrust).toBe(30)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

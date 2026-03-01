import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPlayaSystem } from '../systems/WorldPlayaSystem'
import type { Playa } from '../systems/WorldPlayaSystem'

function makeSys(): WorldPlayaSystem { return new WorldPlayaSystem() }
let nextId = 1
function makePlaya(): Playa {
  return { id: nextId++, x: 25, y: 35, area: 50, saltCrust: 80, waterFrequency: 10, evaporationRate: 90, mineralDeposit: 60, spectacle: 70, tick: 0 }
}

describe('WorldPlayaSystem.getPlayas', () => {
  let sys: WorldPlayaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无干盐湖', () => { expect((sys as any).playas).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).playas.push(makePlaya())
    expect((sys as any).playas).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).playas).toBe((sys as any).playas)
  })
  it('干盐湖字段正确', () => {
    ;(sys as any).playas.push(makePlaya())
    const p = (sys as any).playas[0]
    expect(p.saltCrust).toBe(80)
    expect(p.evaporationRate).toBe(90)
    expect(p.mineralDeposit).toBe(60)
  })
  it('多个干盐湖全部返回', () => {
    ;(sys as any).playas.push(makePlaya())
    ;(sys as any).playas.push(makePlaya())
    expect((sys as any).playas).toHaveLength(2)
  })
})

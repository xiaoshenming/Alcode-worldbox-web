import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSinterSystem } from '../systems/WorldSinterSystem'
import type { SinterFormation } from '../systems/WorldSinterSystem'

function makeSys(): WorldSinterSystem { return new WorldSinterSystem() }
let nextId = 1
function makeFormation(): SinterFormation {
  return { id: nextId++, x: 20, y: 30, mineralDensity: 70, porosity: 30, thermalGradient: 50, depositionRate: 5, age: 2000, tick: 0 }
}

describe('WorldSinterSystem.getFormations', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无硅华', () => { expect((sys as any).formations).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).formations.push(makeFormation())
    expect((sys as any).formations).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).formations).toBe((sys as any).formations)
  })
  it('硅华字段正确', () => {
    ;(sys as any).formations.push(makeFormation())
    const f = (sys as any).formations[0]
    expect(f.mineralDensity).toBe(70)
    expect(f.thermalGradient).toBe(50)
    expect(f.depositionRate).toBe(5)
  })
  it('多个硅华全部返回', () => {
    ;(sys as any).formations.push(makeFormation())
    ;(sys as any).formations.push(makeFormation())
    expect((sys as any).formations).toHaveLength(2)
  })
})

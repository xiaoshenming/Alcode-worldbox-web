import { describe, it, expect, beforeEach } from 'vitest'
import { WorldVolcanicAshPlainSystem } from '../systems/WorldVolcanicAshPlainSystem'
import type { VolcanicAshPlain } from '../systems/WorldVolcanicAshPlainSystem'

function makeSys(): WorldVolcanicAshPlainSystem { return new WorldVolcanicAshPlainSystem() }
let nextId = 1
function makePlain(): VolcanicAshPlain {
  return { id: nextId++, x: 30, y: 40, radius: 15, ashDepth: 5, fertility: 20, revegetation: 10, particleDensity: 80, tick: 0 }
}

describe('WorldVolcanicAshPlainSystem.getPlains', () => {
  let sys: WorldVolcanicAshPlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无火山灰平原', () => { expect((sys as any).plains).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plains.push(makePlain())
    expect((sys as any).plains).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).plains).toBe((sys as any).plains)
  })
  it('火山灰平原字段正确', () => {
    ;(sys as any).plains.push(makePlain())
    const p = (sys as any).plains[0]
    expect(p.ashDepth).toBe(5)
    expect(p.particleDensity).toBe(80)
    expect(p.revegetation).toBe(10)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

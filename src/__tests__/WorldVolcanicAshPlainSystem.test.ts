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

  it('初始无火山灰平原', () => { expect(sys.getPlains()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plains.push(makePlain())
    expect(sys.getPlains()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPlains()).toBe((sys as any).plains)
  })
  it('火山灰平原字段正确', () => {
    ;(sys as any).plains.push(makePlain())
    const p = sys.getPlains()[0]
    expect(p.ashDepth).toBe(5)
    expect(p.particleDensity).toBe(80)
    expect(p.revegetation).toBe(10)
  })
})

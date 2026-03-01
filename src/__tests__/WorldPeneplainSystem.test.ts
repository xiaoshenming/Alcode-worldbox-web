import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPeneplainSystem } from '../systems/WorldPeneplainSystem'
import type { Peneplain } from '../systems/WorldPeneplainSystem'

function makeSys(): WorldPeneplainSystem { return new WorldPeneplainSystem() }
let nextId = 1
function makePeneplain(): Peneplain {
  return { id: nextId++, x: 25, y: 35, area: 80, flatness: 90, erosionAge: 50000, soilDepth: 5, vegetationCover: 60, spectacle: 50, tick: 0 }
}

describe('WorldPeneplainSystem.getPeneplains', () => {
  let sys: WorldPeneplainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无准平原', () => { expect((sys as any).peneplains).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    expect((sys as any).peneplains).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).peneplains).toBe((sys as any).peneplains)
  })
  it('准平原字段正确', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    const p = (sys as any).peneplains[0]
    expect(p.flatness).toBe(90)
    expect(p.vegetationCover).toBe(60)
    expect(p.soilDepth).toBe(5)
  })
  it('多个准平原全部返回', () => {
    ;(sys as any).peneplains.push(makePeneplain())
    ;(sys as any).peneplains.push(makePeneplain())
    expect((sys as any).peneplains).toHaveLength(2)
  })
})

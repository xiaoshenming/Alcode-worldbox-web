import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMolybdenumSpringSystem } from '../systems/WorldMolybdenumSpringSystem'
import type { MolybdenumSpringZone } from '../systems/WorldMolybdenumSpringSystem'

function makeSys(): WorldMolybdenumSpringSystem { return new WorldMolybdenumSpringSystem() }
let nextId = 1
function makeZone(): MolybdenumSpringZone {
  return { id: nextId++, x: 20, y: 30, molybdenumContent: 40, springFlow: 50, tick: 0 } as MolybdenumSpringZone
}

describe('WorldMolybdenumSpringSystem.getZones', () => {
  let sys: WorldMolybdenumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Molybdenum泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Molybdenum泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.molybdenumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WorldActiniumSpringSystem } from '../systems/WorldActiniumSpringSystem'
import type { ActiniumSpringZone } from '../systems/WorldActiniumSpringSystem'

function makeSys(): WorldActiniumSpringSystem { return new WorldActiniumSpringSystem() }
let nextId = 1
function makeZone(): ActiniumSpringZone {
  return { id: nextId++, x: 20, y: 30, actiniumContent: 5, springFlow: 40, uraniumOreWeathering: 30, alphaRadiation: 10, tick: 0 }
}

describe('WorldActiniumSpringSystem.getZones', () => {
  let sys: WorldActiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锕泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('锕泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.actiniumContent).toBe(5)
    expect(z.alphaRadiation).toBe(10)
    expect(z.springFlow).toBe(40)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

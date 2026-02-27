import { describe, it, expect, beforeEach } from 'vitest'
import { WorldProtactiniumSpringSystem } from '../systems/WorldProtactiniumSpringSystem'
import type { ProtactiniumSpringZone } from '../systems/WorldProtactiniumSpringSystem'

function makeSys(): WorldProtactiniumSpringSystem { return new WorldProtactiniumSpringSystem() }
let nextId = 1
function makeZone(): ProtactiniumSpringZone {
  return { id: nextId++, x: 20, y: 30, protactiniumContent: 40, springFlow: 50, tick: 0 } as ProtactiniumSpringZone
}

describe('WorldProtactiniumSpringSystem.getZones', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Protactinium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Protactinium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.protactiniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCobaltSpringSystem } from '../systems/WorldCobaltSpringSystem'
import type { CobaltSpringZone } from '../systems/WorldCobaltSpringSystem'

function makeSys(): WorldCobaltSpringSystem { return new WorldCobaltSpringSystem() }
let nextId = 1
function makeZone(): CobaltSpringZone {
  return { id: nextId++, x: 20, y: 30, cobaltContent: 40, springFlow: 50, tick: 0 } as CobaltSpringZone
}

describe('WorldCobaltSpringSystem.getZones', () => {
  let sys: WorldCobaltSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Cobalt泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Cobalt泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.cobaltContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})

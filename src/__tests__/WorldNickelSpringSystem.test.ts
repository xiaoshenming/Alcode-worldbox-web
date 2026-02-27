import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNickelSpringSystem } from '../systems/WorldNickelSpringSystem'
import type { NickelSpringZone } from '../systems/WorldNickelSpringSystem'

function makeSys(): WorldNickelSpringSystem { return new WorldNickelSpringSystem() }
let nextId = 1
function makeZone(): NickelSpringZone {
  return { id: nextId++, x: 20, y: 30, nickelContent: 40, springFlow: 50, tick: 0 } as NickelSpringZone
}

describe('WorldNickelSpringSystem.getZones', () => {
  let sys: WorldNickelSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Nickel泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Nickel泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.nickelContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})

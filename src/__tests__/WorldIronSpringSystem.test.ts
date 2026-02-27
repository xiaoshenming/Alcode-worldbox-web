import { describe, it, expect, beforeEach } from 'vitest'
import { WorldIronSpringSystem } from '../systems/WorldIronSpringSystem'
import type { IronSpringZone } from '../systems/WorldIronSpringSystem'

function makeSys(): WorldIronSpringSystem { return new WorldIronSpringSystem() }
let nextId = 1
function makeZone(): IronSpringZone {
  return { id: nextId++, x: 20, y: 30, ironContent: 40, springFlow: 50, tick: 0 } as IronSpringZone
}

describe('WorldIronSpringSystem.getZones', () => {
  let sys: WorldIronSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Iron泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Iron泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.ironContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

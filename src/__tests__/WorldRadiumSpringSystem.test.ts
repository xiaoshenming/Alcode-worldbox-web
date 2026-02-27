import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRadiumSpringSystem } from '../systems/WorldRadiumSpringSystem'
import type { RadiumSpringZone } from '../systems/WorldRadiumSpringSystem'

function makeSys(): WorldRadiumSpringSystem { return new WorldRadiumSpringSystem() }
let nextId = 1
function makeZone(): RadiumSpringZone {
  return { id: nextId++, x: 20, y: 30, radiumContent: 40, springFlow: 50, tick: 0 } as RadiumSpringZone
}

describe('WorldRadiumSpringSystem.getZones', () => {
  let sys: WorldRadiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Radium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Radium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.radiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

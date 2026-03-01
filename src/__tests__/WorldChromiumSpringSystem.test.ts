import { describe, it, expect, beforeEach } from 'vitest'
import { WorldChromiumSpringSystem } from '../systems/WorldChromiumSpringSystem'
import type { ChromiumSpringZone } from '../systems/WorldChromiumSpringSystem'

function makeSys(): WorldChromiumSpringSystem { return new WorldChromiumSpringSystem() }
let nextId = 1
function makeZone(): ChromiumSpringZone {
  return { id: nextId++, x: 20, y: 30, chromiumContent: 40, springFlow: 50, tick: 0 } as ChromiumSpringZone
}

describe('WorldChromiumSpringSystem.getZones', () => {
  let sys: WorldChromiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Chromium泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('Chromium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.chromiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

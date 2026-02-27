import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRadonSpringSystem } from '../systems/WorldRadonSpringSystem'
import type { RadonSpringZone } from '../systems/WorldRadonSpringSystem'

function makeSys(): WorldRadonSpringSystem { return new WorldRadonSpringSystem() }
let nextId = 1
function makeZone(): RadonSpringZone {
  return { id: nextId++, x: 20, y: 30, radonContent: 40, springFlow: 50, tick: 0 } as RadonSpringZone
}

describe('WorldRadonSpringSystem.getZones', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Radon泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Radon泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.radonContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

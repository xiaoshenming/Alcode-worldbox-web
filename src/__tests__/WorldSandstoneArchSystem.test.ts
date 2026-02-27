import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSandstoneArchSystem } from '../systems/WorldSandstoneArchSystem'
import type { SandstoneArchZone } from '../systems/WorldSandstoneArchSystem'

function makeSys(): WorldSandstoneArchSystem { return new WorldSandstoneArchSystem() }
let nextId = 1
function makeZone(): SandstoneArchZone {
  return { id: nextId++, x: 20, y: 30, span: 12, height: 8, erosion: 30, stability: 70, tick: 0 }
}

describe('WorldSandstoneArchSystem.getZones', () => {
  let sys: WorldSandstoneArchSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无砂岩拱', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('砂岩拱字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.span).toBe(12)
    expect(z.stability).toBe(70)
    expect(z.erosion).toBe(30)
  })
})

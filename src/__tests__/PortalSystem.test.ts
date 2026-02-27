import { describe, it, expect, beforeEach } from 'vitest'
import { PortalSystem } from '../systems/PortalSystem'
import type { Portal } from '../systems/PortalSystem'

function makeSys(): PortalSystem { return new PortalSystem() }
let nextId = 1
function makePortal(pairedId: number): Portal {
  return {
    id: nextId++, x: 5, y: 5, pairedId,
    color: '#ff0', active: true, cooldown: 0
  }
}

describe('PortalSystem.getPortals', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无传送门', () => { expect(sys.getPortals()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).portals.set(1, makePortal(2))
    expect(sys.getPortals()).toHaveLength(1)
  })
  it('传送门字段正确', () => {
    ;(sys as any).portals.set(1, makePortal(2))
    const p = sys.getPortals()[0]
    expect(p.pairedId).toBe(2)
    expect(p.active).toBe(true)
  })
  it('多个传送门全部返回', () => {
    ;(sys as any).portals.set(1, makePortal(2))
    ;(sys as any).portals.set(2, makePortal(1))
    expect(sys.getPortals()).toHaveLength(2)
  })
})

describe('PortalSystem.getPortalAt', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无传送门时返回null', () => {
    expect(sys.getPortalAt(5, 5)).toBeNull()
  })
  it('注入后可查询坐标', () => {
    const p = makePortal(2)
    ;(sys as any).portals.set(p.id, p)
    // getPortalAt searches by proximity
    const result = sys.getPortalAt(5, 5)
    expect(result).not.toBeNull()
  })
})

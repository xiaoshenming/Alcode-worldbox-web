import { describe, it, expect, beforeEach } from 'vitest'
import { ZoneManagementSystem } from '../systems/ZoneManagementSystem'

function makeSys(): ZoneManagementSystem { return new ZoneManagementSystem() }
let nextId = 1
function makeZone() {
  return { id: nextId++, x: 0, y: 0, w: 10, h: 10, type: 'farming', name: 'Farm Zone', description: 'A farming area' }
}

describe('ZoneManagementSystem.getZone', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('不存在的id返回undefined', () => {
    expect(sys.getZone(999)).toBeUndefined()
  })
  it('注入后可查询', () => {
    const z = makeZone()
    ;(sys as any).zones.set(z.id, z)
    expect(sys.getZone(z.id)).toBeDefined()
    expect(sys.getZone(z.id)!.type).toBe('farming')
  })
  it('多个区域相互独立', () => {
    const z1 = makeZone()
    const z2 = makeZone()
    z2.type = 'military'
    ;(sys as any).zones.set(z1.id, z1)
    ;(sys as any).zones.set(z2.id, z2)
    expect(sys.getZone(z1.id)!.type).toBe('farming')
    expect(sys.getZone(z2.id)!.type).toBe('military')
  })
})

describe('ZoneManagementSystem.getZoneAt', () => {
  let sys: ZoneManagementSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无区域时返回null', () => {
    expect(sys.getZoneAt(5, 5)).toBeNull()
  })
  it('坐标在区域内时返回类型', () => {
    const z = makeZone()  // x=0,y=0,w=10,h=10
    ;(sys as any).zones.set(z.id, z)
    expect(sys.getZoneAt(5, 5)).toBe('farming')
  })
  it('坐标在区域外时返回null', () => {
    const z = makeZone()
    ;(sys as any).zones.set(z.id, z)
    expect(sys.getZoneAt(50, 50)).toBeNull()
  })
})

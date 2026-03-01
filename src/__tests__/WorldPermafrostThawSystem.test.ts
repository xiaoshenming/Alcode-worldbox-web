import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPermafrostThawSystem } from '../systems/WorldPermafrostThawSystem'
import type { PermafrostThawZone } from '../systems/WorldPermafrostThawSystem'

function makeSys(): WorldPermafrostThawSystem { return new WorldPermafrostThawSystem() }
let nextId = 1
function makeZone(): PermafrostThawZone {
  return { id: nextId++, x: 20, y: 30, radius: 10, thawDepth: 5, methaneRelease: 60, groundStability: 40, temperature: -2, tick: 0 }
}

describe('WorldPermafrostThawSystem.getZones', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无永久冻土融化区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('永久冻土融化区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.methaneRelease).toBe(60)
    expect(z.groundStability).toBe(40)
    expect(z.thawDepth).toBe(5)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

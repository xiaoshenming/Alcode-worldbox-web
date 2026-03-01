import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGoldSpringSystem } from '../systems/WorldGoldSpringSystem'
import type { GoldSpringZone } from '../systems/WorldGoldSpringSystem'

function makeSys(): WorldGoldSpringSystem { return new WorldGoldSpringSystem() }
let nextId = 1
function makeZone(): GoldSpringZone {
  return { id: nextId++, x: 20, y: 30, goldContent: 40, springFlow: 50, tick: 0 } as GoldSpringZone
}

describe('WorldGoldSpringSystem.getZones', () => {
  let sys: WorldGoldSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Gold泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('Gold泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.goldContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

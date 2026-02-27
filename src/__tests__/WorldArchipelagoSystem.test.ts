import { describe, it, expect, beforeEach } from 'vitest'
import { WorldArchipelagoSystem } from '../systems/WorldArchipelagoSystem'
import type { Archipelago } from '../systems/WorldArchipelagoSystem'

function makeSys(): WorldArchipelagoSystem { return new WorldArchipelagoSystem() }
let nextId = 1
function makeArchipelago(): Archipelago {
  return { id: nextId++, x: 40, y: 50, radius: 20, islandCount: 8, volcanicActivity: 30, coralGrowth: 60, biodiversity: 80, seaDepth: 50, tick: 0 }
}

describe('WorldArchipelagoSystem.getArchipelagos', () => {
  let sys: WorldArchipelagoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无群岛', () => { expect(sys.getArchipelagos()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).archipelagos.push(makeArchipelago())
    expect(sys.getArchipelagos()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getArchipelagos()).toBe((sys as any).archipelagos)
  })
  it('群岛字段正确', () => {
    ;(sys as any).archipelagos.push(makeArchipelago())
    const a = sys.getArchipelagos()[0]
    expect(a.islandCount).toBe(8)
    expect(a.biodiversity).toBe(80)
    expect(a.seaDepth).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

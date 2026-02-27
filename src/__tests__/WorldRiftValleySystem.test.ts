import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRiftValleySystem } from '../systems/WorldRiftValleySystem'
import type { RiftValley } from '../systems/WorldRiftValleySystem'

function makeSys(): WorldRiftValleySystem { return new WorldRiftValleySystem() }
let nextId = 1
function makeRift(): RiftValley {
  return { id: nextId++, x: 20, y: 30, length: 80, width: 15, depth: 50, tectonicActivity: 70, lakeFormation: 40, volcanicVents: 3, tick: 0 }
}

describe('WorldRiftValleySystem.getRifts', () => {
  let sys: WorldRiftValleySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无裂谷', () => { expect(sys.getRifts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rifts.push(makeRift())
    expect(sys.getRifts()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getRifts()).toBe((sys as any).rifts)
  })
  it('裂谷字段正确', () => {
    ;(sys as any).rifts.push(makeRift())
    const r = sys.getRifts()[0]
    expect(r.tectonicActivity).toBe(70)
    expect(r.lakeFormation).toBe(40)
    expect(r.volcanicVents).toBe(3)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPumiceFieldSystem } from '../systems/WorldPumiceFieldSystem'
import type { PumiceField } from '../systems/WorldPumiceFieldSystem'

function makeSys(): WorldPumiceFieldSystem { return new WorldPumiceFieldSystem() }
let nextId = 1
function makeField(): PumiceField {
  return { id: nextId++, x: 20, y: 30, size: 15, buoyancy: 80, mineralContent: 40, driftSpeed: 2, age: 1000, tick: 0 }
}

describe('WorldPumiceFieldSystem.getFields', () => {
  let sys: WorldPumiceFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无浮石场', () => { expect(sys.getFields()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFields()).toBe((sys as any).fields)
  })
  it('浮石场字段正确', () => {
    ;(sys as any).fields.push(makeField())
    const f = sys.getFields()[0]
    expect(f.buoyancy).toBe(80)
    expect(f.mineralContent).toBe(40)
    expect(f.driftSpeed).toBe(2)
  })
})

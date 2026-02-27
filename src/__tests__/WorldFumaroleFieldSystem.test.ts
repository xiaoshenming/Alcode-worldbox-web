import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFumaroleFieldSystem } from '../systems/WorldFumaroleFieldSystem'
import type { FumaroleField } from '../systems/WorldFumaroleFieldSystem'

function makeSys(): WorldFumaroleFieldSystem { return new WorldFumaroleFieldSystem() }
let nextId = 1
function makeField(): FumaroleField {
  return { id: nextId++, x: 30, y: 40, ventCount: 8, gasEmission: 70, sulfurDeposit: 50, heatIntensity: 80, age: 2000, tick: 0 }
}

describe('WorldFumaroleFieldSystem.getFields', () => {
  let sys: WorldFumaroleFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无喷气孔群', () => { expect(sys.getFields()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFields()).toBe((sys as any).fields)
  })
  it('喷气孔群字段正确', () => {
    ;(sys as any).fields.push(makeField())
    const f = sys.getFields()[0]
    expect(f.ventCount).toBe(8)
    expect(f.gasEmission).toBe(70)
    expect(f.heatIntensity).toBe(80)
  })
  it('多个喷气孔群全部返回', () => {
    ;(sys as any).fields.push(makeField())
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(2)
  })
})

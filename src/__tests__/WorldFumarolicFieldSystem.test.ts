import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFumarolicFieldSystem } from '../systems/WorldFumarolicFieldSystem'
import type { FumarolicField } from '../systems/WorldFumarolicFieldSystem'

function makeSys(): WorldFumarolicFieldSystem { return new WorldFumarolicFieldSystem() }
let nextId = 1
function makeField(): FumarolicField {
  return { id: nextId++, x: 25, y: 35, gasIntensity: 70, sulfurDeposit: 50, heatOutput: 80, ventCount: 6, tick: 0 }
}

describe('WorldFumarolicFieldSystem.getFields', () => {
  let sys: WorldFumarolicFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无喷气孔场', () => { expect(sys.getFields()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFields()).toBe((sys as any).fields)
  })
  it('喷气孔场字段正确', () => {
    ;(sys as any).fields.push(makeField())
    const f = sys.getFields()[0]
    expect(f.gasIntensity).toBe(70)
    expect(f.heatOutput).toBe(80)
    expect(f.ventCount).toBe(6)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

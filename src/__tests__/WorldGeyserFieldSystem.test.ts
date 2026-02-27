import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeyserFieldSystem } from '../systems/WorldGeyserFieldSystem'
import type { GeyserField } from '../systems/WorldGeyserFieldSystem'

function makeSys(): WorldGeyserFieldSystem { return new WorldGeyserFieldSystem() }
let nextId = 1
function makeField(): GeyserField {
  return { id: nextId++, x: 20, y: 30, geyserCount: 5, eruptionInterval: 200, waterTemperature: 90, mineralContent: 45, lastEruption: 0, tick: 0 }
}

describe('WorldGeyserFieldSystem.getFields', () => {
  let sys: WorldGeyserFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无间歇泉群', () => { expect(sys.getFields()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFields()).toBe((sys as any).fields)
  })
  it('间歇泉群字段正确', () => {
    ;(sys as any).fields.push(makeField())
    const f = sys.getFields()[0]
    expect(f.geyserCount).toBe(5)
    expect(f.eruptionInterval).toBe(200)
    expect(f.waterTemperature).toBe(90)
  })
  it('多个间歇泉群全部返回', () => {
    ;(sys as any).fields.push(makeField())
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(2)
  })
})

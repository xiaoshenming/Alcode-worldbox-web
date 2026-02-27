import { describe, it, expect, beforeEach } from 'vitest'
import { WorldObsidianFieldSystem } from '../systems/WorldObsidianFieldSystem'
import type { ObsidianField } from '../systems/WorldObsidianFieldSystem'

function makeSys(): WorldObsidianFieldSystem { return new WorldObsidianFieldSystem() }
let nextId = 1
function makeField(): ObsidianField {
  return { id: nextId++, x: 30, y: 40, deposit: 80, sharpness: 90, miningActivity: 50, tradeValue: 70, age: 3000, tick: 0 }
}

describe('WorldObsidianFieldSystem.getFields', () => {
  let sys: WorldObsidianFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无黑曜石场', () => { expect(sys.getFields()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFields()).toBe((sys as any).fields)
  })
  it('黑曜石场字段正确', () => {
    ;(sys as any).fields.push(makeField())
    const f = sys.getFields()[0]
    expect(f.deposit).toBe(80)
    expect(f.sharpness).toBe(90)
    expect(f.tradeValue).toBe(70)
  })
  it('多个黑曜石场全部返回', () => {
    ;(sys as any).fields.push(makeField())
    ;(sys as any).fields.push(makeField())
    expect(sys.getFields()).toHaveLength(2)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMangroveSwampSystem } from '../systems/WorldMangroveSwampSystem'
import type { MangroveSwamp } from '../systems/WorldMangroveSwampSystem'

function makeSys(): WorldMangroveSwampSystem { return new WorldMangroveSwampSystem() }
let nextId = 1
function makeSwamp(): MangroveSwamp {
  return { id: nextId++, x: 20, y: 30, density: 80, rootDepth: 5, biodiversity: 90, coastalProtection: 70, waterFiltration: 60, tick: 0 }
}

describe('WorldMangroveSwampSystem.getSwamps', () => {
  let sys: WorldMangroveSwampSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无红树林沼泽', () => { expect(sys.getSwamps()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swamps.push(makeSwamp())
    expect(sys.getSwamps()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSwamps()).toBe((sys as any).swamps)
  })
  it('红树林沼泽字段正确', () => {
    ;(sys as any).swamps.push(makeSwamp())
    const s = sys.getSwamps()[0]
    expect(s.density).toBe(80)
    expect(s.biodiversity).toBe(90)
    expect(s.coastalProtection).toBe(70)
  })
})

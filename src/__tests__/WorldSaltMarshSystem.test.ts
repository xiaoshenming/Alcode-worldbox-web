import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSaltMarshSystem } from '../systems/WorldSaltMarshSystem'
import type { SaltMarsh } from '../systems/WorldSaltMarshSystem'

function makeSys(): WorldSaltMarshSystem { return new WorldSaltMarshSystem() }
let nextId = 1
function makeMarsh(): SaltMarsh {
  return { id: nextId++, x: 20, y: 30, radius: 12, salinity: 30, vegetationDensity: 70, tidalRange: 4, biodiversity: 80, tick: 0 }
}

describe('WorldSaltMarshSystem.getMarshes', () => {
  let sys: WorldSaltMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无盐沼', () => { expect(sys.getMarshes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).marshes.push(makeMarsh())
    expect(sys.getMarshes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getMarshes()).toBe((sys as any).marshes)
  })
  it('盐沼字段正确', () => {
    ;(sys as any).marshes.push(makeMarsh())
    const m = sys.getMarshes()[0]
    expect(m.salinity).toBe(30)
    expect(m.biodiversity).toBe(80)
    expect(m.tidalRange).toBe(4)
  })
  it('多个盐沼全部返回', () => {
    ;(sys as any).marshes.push(makeMarsh())
    ;(sys as any).marshes.push(makeMarsh())
    expect(sys.getMarshes()).toHaveLength(2)
  })
})

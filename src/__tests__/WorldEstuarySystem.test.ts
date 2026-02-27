import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEstuarySystem } from '../systems/WorldEstuarySystem'
import type { Estuary } from '../systems/WorldEstuarySystem'

function makeSys(): WorldEstuarySystem { return new WorldEstuarySystem() }
let nextId = 1
function makeEstuary(): Estuary {
  return { id: nextId++, x: 20, y: 30, width: 15, salinity: 20, tidalRange: 5, biodiversity: 85, sedimentFlow: 60, spectacle: 70, tick: 0 }
}

describe('WorldEstuarySystem.getEstuaries', () => {
  let sys: WorldEstuarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无河口', () => { expect(sys.getEstuaries()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).estuaries.push(makeEstuary())
    expect(sys.getEstuaries()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getEstuaries()).toBe((sys as any).estuaries)
  })
  it('河口字段正确', () => {
    ;(sys as any).estuaries.push(makeEstuary())
    const e = sys.getEstuaries()[0]
    expect(e.salinity).toBe(20)
    expect(e.biodiversity).toBe(85)
    expect(e.tidalRange).toBe(5)
  })
  it('多个河口全部返回', () => {
    ;(sys as any).estuaries.push(makeEstuary())
    ;(sys as any).estuaries.push(makeEstuary())
    expect(sys.getEstuaries()).toHaveLength(2)
  })
})

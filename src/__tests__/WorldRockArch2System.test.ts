import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRockArch2System } from '../systems/WorldRockArch2System'
import type { RockArch2 } from '../systems/WorldRockArch2System'

function makeSys(): WorldRockArch2System { return new WorldRockArch2System() }
let nextId = 1
function makeArch(): RockArch2 {
  return { id: nextId++, x: 20, y: 30, spanWidth: 15, archHeight: 10, thickness: 3, stability: 80, erosionRate: 2, spectacle: 85, tick: 0 }
}

describe('WorldRockArch2System.getArches', () => {
  let sys: WorldRockArch2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩石拱', () => { expect(sys.getArches()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).arches.push(makeArch())
    expect(sys.getArches()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getArches()).toBe((sys as any).arches)
  })
  it('岩石拱字段正确', () => {
    ;(sys as any).arches.push(makeArch())
    const a = sys.getArches()[0]
    expect(a.spanWidth).toBe(15)
    expect(a.stability).toBe(80)
    expect(a.spectacle).toBe(85)
  })
})

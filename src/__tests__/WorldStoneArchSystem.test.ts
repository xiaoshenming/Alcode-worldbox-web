import { describe, it, expect, beforeEach } from 'vitest'
import { WorldStoneArchSystem } from '../systems/WorldStoneArchSystem'
import type { StoneArch } from '../systems/WorldStoneArchSystem'

function makeSys(): WorldStoneArchSystem { return new WorldStoneArchSystem() }
let nextId = 1
function makeArch(): StoneArch {
  return { id: nextId++, x: 20, y: 30, span: 15, height: 10, thickness: 3, rockType: 2, structuralIntegrity: 80, spectacle: 85, tick: 0 }
}

describe('WorldStoneArchSystem.getArches', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石拱', () => { expect(sys.getArches()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).arches.push(makeArch())
    expect(sys.getArches()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getArches()).toBe((sys as any).arches)
  })
  it('石拱字段正确', () => {
    ;(sys as any).arches.push(makeArch())
    const a = sys.getArches()[0]
    expect(a.span).toBe(15)
    expect(a.structuralIntegrity).toBe(80)
    expect(a.spectacle).toBe(85)
  })
  it('多个石拱全部返回', () => {
    ;(sys as any).arches.push(makeArch())
    ;(sys as any).arches.push(makeArch())
    expect(sys.getArches()).toHaveLength(2)
  })
})

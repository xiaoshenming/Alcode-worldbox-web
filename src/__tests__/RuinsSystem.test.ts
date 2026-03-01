import { describe, it, expect, beforeEach } from 'vitest'
import { RuinsSystem } from '../systems/RuinsSystem'
import type { Ruin } from '../systems/RuinsSystem'

function makeSys(): RuinsSystem { return new RuinsSystem() }
let nextId = 1
function makeRuin(x: number = 5, y: number = 5): Ruin {
  return {
    id: nextId++, x, y, originCivName: 'Ancient Civ',
    createdTick: 0, value: 50, discovered: false
  }
}

describe('RuinsSystem.getRuins', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无废墟', () => { expect(sys.getRuins()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getRuins().push(makeRuin())
    expect(sys.getRuins()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;sys.getRuins().push(makeRuin())
    expect(sys.getRuins()).toBe(sys.getRuins())
  })
  it('废墟字段正确', () => {
    ;sys.getRuins().push(makeRuin(10, 20))
    const r = sys.getRuins()[0]
    expect(r.x).toBe(10)
    expect(r.y).toBe(20)
    expect(r.discovered).toBe(false)
    expect(r.value).toBe(50)
  })
  it('多个废墟全部返回', () => {
    ;sys.getRuins().push(makeRuin(1, 1))
    ;sys.getRuins().push(makeRuin(2, 2))
    ;sys.getRuins().push(makeRuin(3, 3))
    expect(sys.getRuins()).toHaveLength(3)
  })
})

describe('RuinsSystem.getRuinAt', () => {
  let sys: RuinsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无废墟时返回undefined', () => {
    expect(sys.getRuinAt(5, 5)).toBeUndefined()
  })
  it('注入后可按坐标查询', () => {
    ;sys.getRuins().push(makeRuin(5, 5))
    const r = sys.getRuinAt(5, 5)
    expect(r).toBeDefined()
    expect(r!.x).toBe(5)
  })
  it('坐标不匹配时返回undefined', () => {
    ;sys.getRuins().push(makeRuin(5, 5))
    expect(sys.getRuinAt(99, 99)).toBeUndefined()
  })
})

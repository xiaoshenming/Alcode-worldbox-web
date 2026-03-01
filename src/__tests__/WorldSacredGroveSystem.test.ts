import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSacredGroveSystem } from '../systems/WorldSacredGroveSystem'
import type { SacredGrove } from '../systems/WorldSacredGroveSystem'

function makeSys(): WorldSacredGroveSystem { return new WorldSacredGroveSystem() }
let nextId = 1
function makeGrove(x = 20, y = 30): SacredGrove {
  return { id: nextId++, x, y, radius: 10, power: 7, spiritCount: 3, age: 200, blessingType: 'healing', discoveredBy: new Set() }
}

describe('WorldSacredGroveSystem.getGroves', () => {
  let sys: WorldSacredGroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无圣林', () => { expect(sys.getGroves()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getGroves().push(makeGrove())
    expect(sys.getGroves()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getGroves()).toBe(sys.getGroves())
  })
  it('圣林字段正确', () => {
    ;sys.getGroves().push(makeGrove())
    const g = sys.getGroves()[0]
    expect(g.power).toBe(7)
    expect(g.blessingType).toBe('healing')
  })
})

describe('WorldSacredGroveSystem.getGroveAt', () => {
  let sys: WorldSacredGroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无圣林时返回undefined', () => { expect(sys.getGroveAt(20, 30)).toBeUndefined() })
  it('坐标在范围内时返回圣林', () => {
    ;sys.getGroves().push(makeGrove(20, 30))
    expect(sys.getGroveAt(20, 30)).toBeDefined()
  })
})

describe('WorldSacredGroveSystem.getGroveCount', () => {
  let sys: WorldSacredGroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始数量为0', () => { expect(sys.getGroveCount()).toBe(0) })
  it('注入后数量正确', () => {
    ;sys.getGroves().push(makeGrove())
    ;sys.getGroves().push(makeGrove())
    expect(sys.getGroveCount()).toBe(2)
  })
})

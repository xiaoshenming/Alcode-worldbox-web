import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTravertineSystem } from '../systems/WorldTravertineSystem'
import type { TravertineFormation } from '../systems/WorldTravertineSystem'

function makeSys(): WorldTravertineSystem { return new WorldTravertineSystem() }
let nextId = 1
function makeFormation(): TravertineFormation {
  return { id: nextId++, x: 20, y: 30, thickness: 5, mineralPurity: 80, depositionRate: 3, porosity: 20, age: 3000, tick: 0 }
}

describe('WorldTravertineSystem.getFormations', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石灰华', () => { expect(sys.getFormations()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).formations.push(makeFormation())
    expect(sys.getFormations()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFormations()).toBe((sys as any).formations)
  })
  it('石灰华字段正确', () => {
    ;(sys as any).formations.push(makeFormation())
    const f = sys.getFormations()[0]
    expect(f.mineralPurity).toBe(80)
    expect(f.depositionRate).toBe(3)
    expect(f.porosity).toBe(20)
  })
  it('多个石灰华全部返回', () => {
    ;(sys as any).formations.push(makeFormation())
    ;(sys as any).formations.push(makeFormation())
    expect(sys.getFormations()).toHaveLength(2)
  })
})

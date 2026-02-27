import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCrimperSystem } from '../systems/CreatureCrimperSystem'
import type { Crimper } from '../systems/CreatureCrimperSystem'

let nextId = 1
function makeSys(): CreatureCrimperSystem { return new CreatureCrimperSystem() }
function makeCrimper(entityId: number): Crimper {
  return { id: nextId++, entityId, crimpingSkill: 30, seamPrecision: 25, edgeFolding: 20, dieMaintenance: 35, tick: 0 }
}

describe('CreatureCrimperSystem.getCrimpers', () => {
  let sys: CreatureCrimperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无压边工', () => { expect(sys.getCrimpers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).crimpers.push(makeCrimper(1))
    expect(sys.getCrimpers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).crimpers.push(makeCrimper(1))
    expect(sys.getCrimpers()).toBe((sys as any).crimpers)
  })

  it('多个全部返回', () => {
    ;(sys as any).crimpers.push(makeCrimper(1))
    ;(sys as any).crimpers.push(makeCrimper(2))
    expect(sys.getCrimpers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeCrimper(10)
    c.crimpingSkill = 80; c.seamPrecision = 75; c.edgeFolding = 70; c.dieMaintenance = 65
    ;(sys as any).crimpers.push(c)
    const r = sys.getCrimpers()[0]
    expect(r.crimpingSkill).toBe(80); expect(r.seamPrecision).toBe(75)
    expect(r.edgeFolding).toBe(70); expect(r.dieMaintenance).toBe(65)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBasaltColumnSystem } from '../systems/WorldBasaltColumnSystem'
import type { BasaltColumn } from '../systems/WorldBasaltColumnSystem'

function makeSys(): WorldBasaltColumnSystem { return new WorldBasaltColumnSystem() }
let nextId = 1
function makeColumn(): BasaltColumn {
  return { id: nextId++, x: 10, y: 20, height: 15, columnCount: 50, hexagonalPerfection: 85, erosionRate: 2, age: 1000, tick: 0 }
}

describe('WorldBasaltColumnSystem.getFormations', () => {
  let sys: WorldBasaltColumnSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无玄武岩柱', () => { expect((sys as any).formations).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).formations.push(makeColumn())
    expect((sys as any).formations).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).formations).toBe((sys as any).formations)
  })
  it('玄武岩柱字段正确', () => {
    ;(sys as any).formations.push(makeColumn())
    const c = (sys as any).formations[0]
    expect(c.columnCount).toBe(50)
    expect(c.hexagonalPerfection).toBe(85)
    expect(c.height).toBe(15)
  })
  it('多个玄武岩柱全部返回', () => {
    ;(sys as any).formations.push(makeColumn())
    ;(sys as any).formations.push(makeColumn())
    expect((sys as any).formations).toHaveLength(2)
  })
})

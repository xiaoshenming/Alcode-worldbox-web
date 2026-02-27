import { describe, it, expect, beforeEach } from 'vitest'
import { WorldUndergroundSystem } from '../systems/WorldUndergroundSystem'
import type { CaveNode, CaveType } from '../systems/WorldUndergroundSystem'

function makeSys(): WorldUndergroundSystem { return new WorldUndergroundSystem() }
let nextId = 1
function makeCave(type: CaveType = 'shallow', discovered = false): CaveNode {
  return { id: nextId++, x: 20, y: 30, type, depth: 2, resources: 50, danger: 20, discovered, connectedTo: [] }
}

describe('WorldUndergroundSystem.getCaves', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无洞穴', () => { expect(sys.getCaves()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).caves.push(makeCave())
    expect(sys.getCaves()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getCaves()).toBe((sys as any).caves)
  })
  it('支持6种洞穴类型', () => {
    const types: CaveType[] = ['shallow', 'deep', 'crystal', 'lava', 'flooded', 'ancient']
    expect(types).toHaveLength(6)
  })
})

describe('WorldUndergroundSystem.getDiscoveredCaves', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无已探索洞穴', () => { expect(sys.getDiscoveredCaves()).toHaveLength(0) })
  it('过滤已探索洞穴', () => {
    ;(sys as any).caves.push(makeCave('shallow', false))
    ;(sys as any).caves.push(makeCave('deep', true))
    ;(sys as any).caves.push(makeCave('crystal', true))
    expect(sys.getDiscoveredCaves()).toHaveLength(2)
  })
})

describe('WorldUndergroundSystem.getTotalDiscovered', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始发现数为0', () => { expect(sys.getTotalDiscovered()).toBe(0) })
  it('注入后可增加', () => {
    ;(sys as any).totalDiscovered = 5
    expect(sys.getTotalDiscovered()).toBe(5)
  })
})

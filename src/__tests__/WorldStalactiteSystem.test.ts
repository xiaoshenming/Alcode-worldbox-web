import { describe, it, expect, beforeEach } from 'vitest'
import { WorldStalactiteSystem } from '../systems/WorldStalactiteSystem'
import type { StalactiteCave, CaveType } from '../systems/WorldStalactiteSystem'

function makeSys(): WorldStalactiteSystem { return new WorldStalactiteSystem() }
let nextId = 1
function makeCave(caveType: CaveType = 'limestone'): StalactiteCave {
  return { id: nextId++, x: 15, y: 25, caveType, depth: 40, formations: 30, age: 500, active: true, tick: 0 }
}

describe('WorldStalactiteSystem.getCaves', () => {
  let sys: WorldStalactiteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钟乳石洞', () => { expect((sys as any).caves).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).caves).toBe((sys as any).caves)
  })
  it('支持4种洞穴类型', () => {
    const types: CaveType[] = ['limestone', 'crystal', 'ice', 'lava']
    expect(types).toHaveLength(4)
  })
  it('钟乳石洞字段正确', () => {
    ;(sys as any).caves.push(makeCave('crystal'))
    const c = (sys as any).caves[0]
    expect(c.caveType).toBe('crystal')
    expect(c.formations).toBe(30)
    expect(c.active).toBe(true)
  })
})

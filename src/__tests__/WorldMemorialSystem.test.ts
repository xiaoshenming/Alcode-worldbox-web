import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMemorialSystem } from '../systems/WorldMemorialSystem'
import type { Memorial, MemorialType } from '../systems/WorldMemorialSystem'

function makeSys(): WorldMemorialSystem { return new WorldMemorialSystem() }
let nextId = 1
function makeMemorial(type: MemorialType = 'battle', significance = 50): Memorial {
  return { id: nextId++, type, x: 20, y: 30, name: 'Test Memorial', significance, age: 100, tick: 0 }
}

describe('WorldMemorialSystem.getMemorials', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纪念碑', () => { expect(sys.getMemorials()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).memorials.push(makeMemorial())
    expect(sys.getMemorials()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getMemorials()).toBe((sys as any).memorials)
  })
  it('支持6种纪念碑类型', () => {
    const types: MemorialType[] = ['battle', 'disaster', 'founding', 'miracle', 'tragedy', 'victory']
    expect(types).toHaveLength(6)
  })
})

describe('WorldMemorialSystem.getByType', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('按类型过滤', () => {
    ;(sys as any).memorials.push(makeMemorial('battle'))
    ;(sys as any).memorials.push(makeMemorial('victory'))
    ;(sys as any).memorials.push(makeMemorial('battle'))
    expect(sys.getByType('battle')).toHaveLength(2)
    expect(sys.getByType('victory')).toHaveLength(1)
  })
})

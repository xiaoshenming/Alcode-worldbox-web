import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHoodooSystem } from '../systems/WorldHoodooSystem'
import type { Hoodoo } from '../systems/WorldHoodooSystem'

function makeSys(): WorldHoodooSystem { return new WorldHoodooSystem() }
let nextId = 1
function makeHoodoo(): Hoodoo {
  return { id: nextId++, x: 30, y: 40, height: 15, capstoneSize: 5, shaftWidth: 3, erosionRate: 0.02, colorBanding: 6, stability: 80, tick: 0 }
}

describe('WorldHoodooSystem.getHoodoos', () => {
  let sys: WorldHoodooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无嶂石岩', () => { expect(sys.getHoodoos()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).hoodoos.push(makeHoodoo())
    expect(sys.getHoodoos()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getHoodoos()).toBe((sys as any).hoodoos)
  })
  it('嶂石岩字段正确', () => {
    ;(sys as any).hoodoos.push(makeHoodoo())
    const h = sys.getHoodoos()[0]
    expect(h.height).toBe(15)
    expect(h.stability).toBe(80)
    expect(h.colorBanding).toBe(6)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

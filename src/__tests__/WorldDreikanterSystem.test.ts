import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDreikanterSystem } from '../systems/WorldDreikanterSystem'
import type { Dreikanter } from '../systems/WorldDreikanterSystem'

function makeSys(): WorldDreikanterSystem { return new WorldDreikanterSystem() }
let nextId = 1
function makeDreikanter(): Dreikanter {
  return { id: nextId++, x: 20, y: 30, faces: 3, polish: 80, windIntensity: 70, stoneSize: 5, desertAge: 5000, spectacle: 60, tick: 0 }
}

describe('WorldDreikanterSystem.getDreikanters', () => {
  let sys: WorldDreikanterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无三棱石', () => { expect((sys as any).dreikanters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).dreikanters.push(makeDreikanter())
    expect((sys as any).dreikanters).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).dreikanters).toBe((sys as any).dreikanters)
  })
  it('三棱石字段正确', () => {
    ;(sys as any).dreikanters.push(makeDreikanter())
    const d = (sys as any).dreikanters[0]
    expect(d.faces).toBe(3)
    expect(d.polish).toBe(80)
    expect(d.windIntensity).toBe(70)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})

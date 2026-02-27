import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDrawerSystem } from '../systems/CreatureDrawerSystem'
import type { Drawer } from '../systems/CreatureDrawerSystem'

let nextId = 1
function makeSys(): CreatureDrawerSystem { return new CreatureDrawerSystem() }
function makeDrawer(entityId: number): Drawer {
  return { id: nextId++, entityId, drawingSkill: 30, diePrecision: 25, tensileControl: 20, wireQuality: 35, tick: 0 }
}

describe('CreatureDrawerSystem.getDrawers', () => {
  let sys: CreatureDrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抽线工', () => { expect(sys.getDrawers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).drawers.push(makeDrawer(1))
    expect(sys.getDrawers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).drawers.push(makeDrawer(1))
    expect(sys.getDrawers()).toBe((sys as any).drawers)
  })

  it('多个全部返回', () => {
    ;(sys as any).drawers.push(makeDrawer(1))
    ;(sys as any).drawers.push(makeDrawer(2))
    expect(sys.getDrawers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const d = makeDrawer(10)
    d.drawingSkill = 80; d.diePrecision = 75; d.tensileControl = 70; d.wireQuality = 65
    ;(sys as any).drawers.push(d)
    const r = sys.getDrawers()[0]
    expect(r.drawingSkill).toBe(80); expect(r.diePrecision).toBe(75)
    expect(r.tensileControl).toBe(70); expect(r.wireQuality).toBe(65)
  })
})

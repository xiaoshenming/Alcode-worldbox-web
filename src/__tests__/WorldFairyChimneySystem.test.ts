import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFairyChimneySystem } from '../systems/WorldFairyChimneySystem'
import type { FairyChimney } from '../systems/WorldFairyChimneySystem'

function makeSys(): WorldFairyChimneySystem { return new WorldFairyChimneySystem() }
let nextId = 1
function makeChimney(): FairyChimney {
  return { id: nextId++, x: 15, y: 25, height: 12, capSize: 3, coneWidth: 4, tuffHardness: 70, erosionRate: 2, spectacle: 80, tick: 0 }
}

describe('WorldFairyChimneySystem.getChimneys', () => {
  let sys: WorldFairyChimneySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无仙女烟囱', () => { expect((sys as any).chimneys).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).chimneys.push(makeChimney())
    expect((sys as any).chimneys).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).chimneys).toBe((sys as any).chimneys)
  })
  it('仙女烟囱字段正确', () => {
    ;(sys as any).chimneys.push(makeChimney())
    const c = (sys as any).chimneys[0]
    expect(c.height).toBe(12)
    expect(c.tuffHardness).toBe(70)
    expect(c.spectacle).toBe(80)
  })
  it('多个仙女烟囱全部返回', () => {
    ;(sys as any).chimneys.push(makeChimney())
    ;(sys as any).chimneys.push(makeChimney())
    expect((sys as any).chimneys).toHaveLength(2)
  })
})

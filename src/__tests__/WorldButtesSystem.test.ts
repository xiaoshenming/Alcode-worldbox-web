import { describe, it, expect, beforeEach } from 'vitest'
import { WorldButtesSystem } from '../systems/WorldButtesSystem'
import type { Butte } from '../systems/WorldButtesSystem'

function makeSys(): WorldButtesSystem { return new WorldButtesSystem() }
let nextId = 1
function makeButte(): Butte {
  return { id: nextId++, x: 25, y: 35, radius: 5, elevation: 30, capIntegrity: 80, erosionRate: 2, colorBanding: 70, windExposure: 60, tick: 0 }
}

describe('WorldButtesSystem.getButtes', () => {
  let sys: WorldButtesSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无孤峰', () => { expect(sys.getButtes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).buttes.push(makeButte())
    expect(sys.getButtes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getButtes()).toBe((sys as any).buttes)
  })
  it('孤峰字段正确', () => {
    ;(sys as any).buttes.push(makeButte())
    const b = sys.getButtes()[0]
    expect(b.elevation).toBe(30)
    expect(b.capIntegrity).toBe(80)
    expect(b.colorBanding).toBe(70)
  })
  it('多个孤峰全部返回', () => {
    ;(sys as any).buttes.push(makeButte())
    ;(sys as any).buttes.push(makeButte())
    expect(sys.getButtes()).toHaveLength(2)
  })
})

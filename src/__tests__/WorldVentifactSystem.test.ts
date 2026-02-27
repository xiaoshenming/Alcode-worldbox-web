import { describe, it, expect, beforeEach } from 'vitest'
import { WorldVentifactSystem } from '../systems/WorldVentifactSystem'
import type { Ventifact } from '../systems/WorldVentifactSystem'

function makeSys(): WorldVentifactSystem { return new WorldVentifactSystem() }
let nextId = 1
function makeVentifact(): Ventifact {
  return { id: nextId++, x: 20, y: 30, facets: 3, polish: 80, windExposure: 90, rockType: 2, abrasionRate: 3, spectacle: 60, tick: 0 }
}

describe('WorldVentifactSystem.getVentifacts', () => {
  let sys: WorldVentifactSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无风棱石', () => { expect(sys.getVentifacts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ventifacts.push(makeVentifact())
    expect(sys.getVentifacts()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getVentifacts()).toBe((sys as any).ventifacts)
  })
  it('风棱石字段正确', () => {
    ;(sys as any).ventifacts.push(makeVentifact())
    const v = sys.getVentifacts()[0]
    expect(v.facets).toBe(3)
    expect(v.polish).toBe(80)
    expect(v.windExposure).toBe(90)
  })
  it('多个风棱石全部返回', () => {
    ;(sys as any).ventifacts.push(makeVentifact())
    ;(sys as any).ventifacts.push(makeVentifact())
    expect(sys.getVentifacts()).toHaveLength(2)
  })
})

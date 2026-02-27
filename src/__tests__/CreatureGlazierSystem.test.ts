import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGlazierSystem } from '../systems/CreatureGlazierSystem'
import type { Glazier } from '../systems/CreatureGlazierSystem'

let nextId = 1
function makeSys(): CreatureGlazierSystem { return new CreatureGlazierSystem() }
function makeGlazier(entityId: number): Glazier {
  return { id: nextId++, entityId, glassCutting: 50, leadWorking: 60, designPrecision: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureGlazierSystem.getGlaziers', () => {
  let sys: CreatureGlazierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无玻璃工', () => { expect(sys.getGlaziers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).glaziers.push(makeGlazier(1))
    expect(sys.getGlaziers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).glaziers.push(makeGlazier(1))
    expect(sys.getGlaziers()).toBe((sys as any).glaziers)
  })
  it('多个全部返回', () => {
    ;(sys as any).glaziers.push(makeGlazier(1))
    ;(sys as any).glaziers.push(makeGlazier(2))
    expect(sys.getGlaziers()).toHaveLength(2)
  })
  it('四字段数据完整', () => {
    const g = makeGlazier(10)
    g.glassCutting = 90; g.leadWorking = 85; g.designPrecision = 80; g.outputQuality = 75
    ;(sys as any).glaziers.push(g)
    const r = sys.getGlaziers()[0]
    expect(r.glassCutting).toBe(90); expect(r.leadWorking).toBe(85)
    expect(r.designPrecision).toBe(80); expect(r.outputQuality).toBe(75)
  })
})

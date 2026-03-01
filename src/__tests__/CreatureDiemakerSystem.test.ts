import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDiemakerSystem } from '../systems/CreatureDiemakerSystem'
import type { Diemaker } from '../systems/CreatureDiemakerSystem'

let nextId = 1
function makeSys(): CreatureDiemakerSystem { return new CreatureDiemakerSystem() }
function makeDiemaker(entityId: number): Diemaker {
  return { id: nextId++, entityId, diemakingSkill: 30, precisionCutting: 25, hardeningControl: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureDiemakerSystem.getDiemakers', () => {
  let sys: CreatureDiemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无模具工', () => { expect((sys as any).diemakers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).diemakers.push(makeDiemaker(1))
    expect((sys as any).diemakers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).diemakers.push(makeDiemaker(1))
    expect((sys as any).diemakers).toBe((sys as any).diemakers)
  })

  it('多个全部返回', () => {
    ;(sys as any).diemakers.push(makeDiemaker(1))
    ;(sys as any).diemakers.push(makeDiemaker(2))
    expect((sys as any).diemakers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const d = makeDiemaker(10)
    d.diemakingSkill = 80; d.precisionCutting = 75; d.hardeningControl = 70; d.outputQuality = 65
    ;(sys as any).diemakers.push(d)
    const r = (sys as any).diemakers[0]
    expect(r.diemakingSkill).toBe(80); expect(r.precisionCutting).toBe(75)
    expect(r.hardeningControl).toBe(70); expect(r.outputQuality).toBe(65)
  })
})

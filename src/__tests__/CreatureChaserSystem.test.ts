import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChaserSystem } from '../systems/CreatureChaserSystem'
import type { Chaser } from '../systems/CreatureChaserSystem'

let nextId = 1
function makeSys(): CreatureChaserSystem { return new CreatureChaserSystem() }
function makeChaser(entityId: number): Chaser {
  return { id: nextId++, entityId, chasingSkill: 30, hammerControl: 25, reliefDepth: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureChaserSystem.getChasers', () => {
  let sys: CreatureChaserSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无追逐者', () => { expect(sys.getChasers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chasers.push(makeChaser(1))
    expect(sys.getChasers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).chasers.push(makeChaser(1))
    expect(sys.getChasers()).toBe((sys as any).chasers)
  })

  it('多个全部返回', () => {
    ;(sys as any).chasers.push(makeChaser(1))
    ;(sys as any).chasers.push(makeChaser(2))
    expect(sys.getChasers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeChaser(10)
    c.chasingSkill = 80; c.hammerControl = 75; c.reliefDepth = 70; c.outputQuality = 65
    ;(sys as any).chasers.push(c)
    const r = sys.getChasers()[0]
    expect(r.chasingSkill).toBe(80); expect(r.hammerControl).toBe(75)
    expect(r.reliefDepth).toBe(70); expect(r.outputQuality).toBe(65)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTurnerSystem } from '../systems/CreatureTurnerSystem'
import type { Turner } from '../systems/CreatureTurnerSystem'

let nextId = 1
function makeSys(): CreatureTurnerSystem { return new CreatureTurnerSystem() }
function makeTurner(entityId: number): Turner {
  return { id: nextId++, entityId, turningSkill: 70, latheControl: 65, shapeAccuracy: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureTurnerSystem.getTurners', () => {
  let sys: CreatureTurnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车工', () => { expect(sys.getTurners()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).turners.push(makeTurner(1))
    expect(sys.getTurners()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).turners.push(makeTurner(1))
    expect(sys.getTurners()).toBe((sys as any).turners)
  })
  it('字段正确', () => {
    ;(sys as any).turners.push(makeTurner(2))
    const t = sys.getTurners()[0]
    expect(t.turningSkill).toBe(70)
    expect(t.shapeAccuracy).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).turners.push(makeTurner(1))
    ;(sys as any).turners.push(makeTurner(2))
    expect(sys.getTurners()).toHaveLength(2)
  })
})

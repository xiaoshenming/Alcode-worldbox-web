import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSpinnerSystem } from '../systems/CreatureSpinnerSystem'
import type { Spinner } from '../systems/CreatureSpinnerSystem'

let nextId = 1
function makeSys(): CreatureSpinnerSystem { return new CreatureSpinnerSystem() }
function makeSpinner(entityId: number): Spinner {
  return { id: nextId++, entityId, spinningSkill: 70, latheControl: 65, formPrecision: 80, symmetryQuality: 75, tick: 0 }
}

describe('CreatureSpinnerSystem.getSpinners', () => {
  let sys: CreatureSpinnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无旋工', () => { expect(sys.getSpinners()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    expect(sys.getSpinners()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    expect(sys.getSpinners()).toBe((sys as any).spinners)
  })
  it('字段正确', () => {
    ;(sys as any).spinners.push(makeSpinner(2))
    const s = sys.getSpinners()[0]
    expect(s.spinningSkill).toBe(70)
    expect(s.symmetryQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    ;(sys as any).spinners.push(makeSpinner(2))
    expect(sys.getSpinners()).toHaveLength(2)
  })
})

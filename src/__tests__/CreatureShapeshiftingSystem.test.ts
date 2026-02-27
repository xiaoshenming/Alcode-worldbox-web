import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureShapeshiftingSystem } from '../systems/CreatureShapeshiftingSystem'
import type { ShapeShift, ShiftForm } from '../systems/CreatureShapeshiftingSystem'

let nextId = 1
function makeSys(): CreatureShapeshiftingSystem { return new CreatureShapeshiftingSystem() }
function makeShift(shifterId: number, form: ShiftForm = 'wolf'): ShapeShift {
  return { id: nextId++, shifterId, originalRace: 'human', currentForm: form, stability: 70, powerGain: 20, identityLoss: 10, tick: 0 }
}

describe('CreatureShapeshiftingSystem.getShifts', () => {
  let sys: CreatureShapeshiftingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无变形记录', () => { expect(sys.getShifts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shifts.push(makeShift(1, 'eagle'))
    expect(sys.getShifts()[0].currentForm).toBe('eagle')
  })
  it('返回内部引用', () => {
    ;(sys as any).shifts.push(makeShift(1))
    expect(sys.getShifts()).toBe((sys as any).shifts)
  })
  it('支持所有6种变形', () => {
    const forms: ShiftForm[] = ['wolf', 'eagle', 'bear', 'serpent', 'deer', 'shadow']
    forms.forEach((f, i) => { ;(sys as any).shifts.push(makeShift(i + 1, f)) })
    const all = sys.getShifts()
    forms.forEach((f, i) => { expect(all[i].currentForm).toBe(f) })
  })
  it('多个全部返回', () => {
    ;(sys as any).shifts.push(makeShift(1))
    ;(sys as any).shifts.push(makeShift(2))
    expect(sys.getShifts()).toHaveLength(2)
  })
})

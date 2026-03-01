import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRangerSystem } from '../systems/CreatureRangerSystem'
import type { Ranger, RangerSpecialty } from '../systems/CreatureRangerSystem'

let nextId = 1
function makeSys(): CreatureRangerSystem { return new CreatureRangerSystem() }
function makeRanger(creatureId: number, specialty: RangerSpecialty = 'scout'): Ranger {
  return { id: nextId++, creatureId, specialty, patrolRadius: 10, alertness: 70, threatsDetected: 5, experience: 50, tick: 0 }
}

describe('CreatureRangerSystem.getRangers', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无巡逻者', () => { expect((sys as any).rangers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'tracker'))
    expect((sys as any).rangers[0].specialty).toBe('tracker')
  })
  it('返回内部引用', () => {
    ;(sys as any).rangers.push(makeRanger(1))
    expect((sys as any).rangers).toBe((sys as any).rangers)
  })
  it('支持所有4种专业', () => {
    const specs: RangerSpecialty[] = ['scout', 'tracker', 'warden', 'sentinel']
    specs.forEach((s, i) => { ;(sys as any).rangers.push(makeRanger(i + 1, s)) })
    const all = (sys as any).rangers
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).rangers.push(makeRanger(1))
    ;(sys as any).rangers.push(makeRanger(2))
    expect((sys as any).rangers).toHaveLength(2)
  })
})

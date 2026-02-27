import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePatternmakerSystem } from '../systems/CreaturePatternmakerSystem'
import type { Patternmaker } from '../systems/CreaturePatternmakerSystem'

let nextId = 1
function makeSys(): CreaturePatternmakerSystem { return new CreaturePatternmakerSystem() }
function makeMaker(entityId: number): Patternmaker {
  return { id: nextId++, entityId, patternSkill: 75, woodCarving: 60, dimensionAccuracy: 80, outputQuality: 70, tick: 0 }
}

describe('CreaturePatternmakerSystem.getPatternmakers', () => {
  let sys: CreaturePatternmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无样式师', () => { expect(sys.getPatternmakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).patternmakers.push(makeMaker(1))
    expect(sys.getPatternmakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).patternmakers.push(makeMaker(1))
    expect(sys.getPatternmakers()).toBe((sys as any).patternmakers)
  })
  it('字段正确', () => {
    ;(sys as any).patternmakers.push(makeMaker(2))
    const p = sys.getPatternmakers()[0]
    expect(p.patternSkill).toBe(75)
    expect(p.dimensionAccuracy).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).patternmakers.push(makeMaker(1))
    ;(sys as any).patternmakers.push(makeMaker(2))
    expect(sys.getPatternmakers()).toHaveLength(2)
  })
})

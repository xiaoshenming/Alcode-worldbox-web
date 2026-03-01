import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAmbidextritySystem } from '../systems/CreatureAmbidextritySystem'
import type { AmbidextrityProfile, HandDominance } from '../systems/CreatureAmbidextritySystem'

let nextId = 1
function makeSys(): CreatureAmbidextritySystem { return new CreatureAmbidextritySystem() }
function makeProfile(entityId: number, dominance: HandDominance = 'right'): AmbidextrityProfile {
  return { id: nextId++, entityId, dominance, leftSkill: 40, rightSkill: 60, trainingTicks: 100, combatBonus: 1.0, craftBonus: 1.0 }
}

describe('CreatureAmbidextritySystem.getProfiles', () => {
  let sys: CreatureAmbidextritySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无档案', () => { expect(sys.getProfiles()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;sys.getProfiles().push(makeProfile(1, 'ambidextrous'))
    expect(sys.getProfiles()[0].dominance).toBe('ambidextrous')
  })

  it('返回内部引用', () => {
    ;sys.getProfiles().push(makeProfile(1))
    expect(sys.getProfiles()).toBe(sys.getProfiles())
  })

  it('支持所有 3 种手部优势', () => {
    const doms: HandDominance[] = ['left', 'right', 'ambidextrous']
    doms.forEach((d, i) => { ;sys.getProfiles().push(makeProfile(i + 1, d)) })
    const all = sys.getProfiles()
    doms.forEach((d, i) => { expect(all[i].dominance).toBe(d) })
  })
})

describe('CreatureAmbidextritySystem.getByEntity', () => {
  let sys: CreatureAmbidextritySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('不存在时返回 undefined', () => {
    expect(sys.getByEntity(999)).toBeUndefined()
  })

  it('存在时返回对应档案', () => {
    ;sys.getProfiles().push(makeProfile(42, 'left'))
    const p = sys.getByEntity(42)
    expect(p).toBeDefined()
    expect(p!.dominance).toBe('left')
  })

  it('多个档案时只返回匹配的', () => {
    ;sys.getProfiles().push(makeProfile(1, 'right'))
    ;sys.getProfiles().push(makeProfile(2, 'ambidextrous'))
    expect(sys.getByEntity(2)!.dominance).toBe('ambidextrous')
  })
})

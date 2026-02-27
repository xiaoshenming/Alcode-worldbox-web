import { describe, it, expect, beforeEach } from 'vitest'
import { FormationSystem } from '../systems/FormationSystem'
import type { Formation, FormationType } from '../systems/FormationSystem'

function makeSys(): FormationSystem { return new FormationSystem() }
let nextId = 1
function makeFormation(civId: number, type: FormationType = 'line'): Formation {
  return {
    id: nextId++, civId, type,
    centerX: 10, centerY: 10,
    members: [1, 2, 3], morale: 100, facing: 0
  }
}

describe('FormationSystem.getFormations', () => {
  let sys: FormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无阵型', () => { expect(sys.getFormations()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).formations.set(1, makeFormation(1))
    expect(sys.getFormations()).toHaveLength(1)
  })
  it('阵型字段正确', () => {
    ;(sys as any).formations.set(1, makeFormation(2, 'wedge'))
    const f = sys.getFormations()[0]
    expect(f.civId).toBe(2)
    expect(f.type).toBe('wedge')
    expect(f.members).toHaveLength(3)
  })
  it('支持5种阵型类型', () => {
    const types: FormationType[] = ['line', 'wedge', 'circle', 'square', 'scatter']
    types.forEach((t, i) => {
      ;(sys as any).formations.set(i + 1, makeFormation(i + 1, t))
    })
    expect(sys.getFormations()).toHaveLength(5)
  })
})

describe('FormationSystem.getFormationBonus', () => {
  let sys: FormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('不存在的阵型返回1.0基础值', () => {
    const bonus = sys.getFormationBonus(999)
    expect(bonus.attack).toBe(1.0)
    expect(bonus.defense).toBe(1.0)
  })
  it('line阵型有攻击加成', () => {
    ;(sys as any).formations.set(1, makeFormation(1, 'line'))
    const bonus = sys.getFormationBonus(1)
    expect(bonus.attack).toBeGreaterThan(1.0)
  })
  it('circle阵型有防御加成', () => {
    ;(sys as any).formations.set(1, makeFormation(1, 'circle'))
    const bonus = sys.getFormationBonus(1)
    expect(bonus.defense).toBeGreaterThan(1.0)
  })
})

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
    const f = makeFormation(1)
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormations()).toHaveLength(1)
  })
  it('阵型字段正确', () => {
    const f = makeFormation(2, 'wedge')
    ;(sys as any).formations.set(f.id, f)
    const result = sys.getFormations()[0]
    expect(result.civId).toBe(2)
    expect(result.type).toBe('wedge')
    expect(result.members).toHaveLength(3)
  })
  it('支持5种阵型类型', () => {
    const types: FormationType[] = ['line', 'wedge', 'circle', 'square', 'scatter']
    types.forEach((t, i) => {
      const f = makeFormation(i + 1, t)
      ;(sys as any).formations.set(f.id, f)
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
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    expect(bonus.attack).toBeGreaterThan(1.0)
  })
  it('circle阵型有防御加成', () => {
    const f = makeFormation(1, 'circle')
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    expect(bonus.defense).toBeGreaterThan(1.0)
  })
})

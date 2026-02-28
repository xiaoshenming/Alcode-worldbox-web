import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAncestorSystem } from '../systems/CreatureAncestorSystem'
import type { AncestorSpirit, AncestorDomain } from '../systems/CreatureAncestorSystem'

// CreatureAncestorSystem 测试:
// - getAncestors()         → 返回内部数组引用
// - getAncestorsForCiv()   → 过滤指定文明的祖先精灵
// update() 依赖 EntityManager + CivManager，不在此测试。

let nextSpiritId = 1

function makeAncSys(): CreatureAncestorSystem {
  return new CreatureAncestorSystem()
}

function makeSpirit(civId: number, domain: AncestorDomain = 'valor', power = 0.5): AncestorSpirit {
  return {
    id: nextSpiritId++,
    name: `Ancestor${nextSpiritId}`,
    species: 'human',
    civId,
    x: 50, y: 50,
    power,
    domain,
    worshippers: 10,
    worshippersStr: '10',
    createdTick: 0,
    shrineBuilt: false,
  }
}

describe('CreatureAncestorSystem.getAncestors', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('初始无祖先精灵', () => {
    expect(sys.getAncestors()).toHaveLength(0)
  })

  it('注入祖先后可查询', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect(sys.getAncestors()).toHaveLength(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect(sys.getAncestors()).toBe((sys as any).ancestors)
  })

  it('多个祖先全部返回', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor'))
    ;(sys as any).ancestors.push(makeSpirit(2, 'harvest'))
    ;(sys as any).ancestors.push(makeSpirit(1, 'wisdom'))
    expect(sys.getAncestors()).toHaveLength(3)
  })

  it('支持所有 5 种领域', () => {
    const domains: AncestorDomain[] = ['valor', 'harvest', 'healing', 'craft', 'wisdom']
    domains.forEach((d, i) => {
      ;(sys as any).ancestors.push(makeSpirit(i + 1, d))
    })
    const all = sys.getAncestors()
    expect(all).toHaveLength(5)
    domains.forEach((d, i) => { expect(all[i].domain).toBe(d) })
  })
})

describe('CreatureAncestorSystem.getAncestorsForCiv', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('无祖先时返回空数组', () => {
    expect(sys.getAncestorsForCiv(1)).toHaveLength(0)
  })

  it('只返回指定文明的祖先', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    ;(sys as any).ancestors.push(makeSpirit(2))
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect(sys.getAncestorsForCiv(1)).toHaveLength(2)
    expect(sys.getAncestorsForCiv(2)).toHaveLength(1)
    expect(sys.getAncestorsForCiv(3)).toHaveLength(0)
  })

  it('所有文明1的祖先 civId 均正确', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor'))
    ;(sys as any).ancestors.push(makeSpirit(1, 'wisdom'))
    const spirits = sys.getAncestorsForCiv(1)
    spirits.forEach(s => { expect(s.civId).toBe(1) })
  })

  it('结果为新数组（不影响内部数组）', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    const result = sys.getAncestorsForCiv(1)
    expect(result).not.toBe((sys as any).ancestors)
  })
})

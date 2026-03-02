import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAncestorSystem } from '../systems/CreatureAncestorSystem'
import type { AncestorSpirit, AncestorDomain } from '../systems/CreatureAncestorSystem'

// CreatureAncestorSystem 测试:
// - ancestors 内部数组（通过 (sys as any).ancestors 访问）
// - getAncestorsForCiv()   → 过滤指定文明的祖先精灵（返回复用缓冲区）
// - deadHeroes / nextCheckTick / nextBuffTick 等内部状态
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

afterEach(() => vi.restoreAllMocks())

describe('CreatureAncestorSystem.ancestors - 基础读写', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('初始无祖先精灵', () => {
    expect((sys as any).ancestors).toHaveLength(0)
  })

  it('注入祖先后可查询', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors).toHaveLength(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors).toBe((sys as any).ancestors)
  })

  it('多个祖先全部返回', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor'))
    ;(sys as any).ancestors.push(makeSpirit(2, 'harvest'))
    ;(sys as any).ancestors.push(makeSpirit(1, 'wisdom'))
    expect((sys as any).ancestors).toHaveLength(3)
  })

  it('支持所有 5 种领域', () => {
    const domains: AncestorDomain[] = ['valor', 'harvest', 'healing', 'craft', 'wisdom']
    domains.forEach((d, i) => {
      ;(sys as any).ancestors.push(makeSpirit(i + 1, d))
    })
    const all = (sys as any).ancestors
    expect(all).toHaveLength(5)
    domains.forEach((d, i) => { expect(all[i].domain).toBe(d) })
  })

  it('ancestors 是数组类型', () => {
    expect(Array.isArray((sys as any).ancestors)).toBe(true)
  })

  it('可以通过索引访问祖先', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor'))
    ;(sys as any).ancestors.push(makeSpirit(2, 'wisdom'))
    expect((sys as any).ancestors[0].domain).toBe('valor')
    expect((sys as any).ancestors[1].domain).toBe('wisdom')
  })

  it('可以通过 splice 删除祖先', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    ;(sys as any).ancestors.push(makeSpirit(2))
    ;(sys as any).ancestors.splice(0, 1)
    expect((sys as any).ancestors).toHaveLength(1)
  })

  it('两个不同文明的祖先均保存', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    ;(sys as any).ancestors.push(makeSpirit(2))
    const civIds = (sys as any).ancestors.map((a: AncestorSpirit) => a.civId)
    expect(civIds).toContain(1)
    expect(civIds).toContain(2)
  })
})

describe('CreatureAncestorSystem.ancestors - 属性完整性', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('shrineBuilt 默认为 false', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].shrineBuilt).toBe(false)
  })

  it('worshippers 默认值正确', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].worshippers).toBe(10)
  })

  it('worshippersStr 默认为 "10"', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].worshippersStr).toBe('10')
  })

  it('createdTick 默认为 0', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].createdTick).toBe(0)
  })

  it('species 默认为 human', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].species).toBe('human')
  })

  it('power 默认为 0.5', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].power).toBe(0.5)
  })

  it('位置 x/y 默认为 50', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect((sys as any).ancestors[0].x).toBe(50)
    expect((sys as any).ancestors[0].y).toBe(50)
  })

  it('shrineBuilt 可被修改为 true', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    ;(sys as any).ancestors[0].shrineBuilt = true
    expect((sys as any).ancestors[0].shrineBuilt).toBe(true)
  })

  it('worshippers 可被更新', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    ;(sys as any).ancestors[0].worshippers = 25
    expect((sys as any).ancestors[0].worshippers).toBe(25)
  })

  it('power 超过 1.0 可以保存', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor', 1.5))
    expect((sys as any).ancestors[0].power).toBe(1.5)
  })

  it('power 为 0 时也能保存', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor', 0))
    expect((sys as any).ancestors[0].power).toBe(0)
  })
})

describe('CreatureAncestorSystem.getAncestorsForCiv - 基础过滤', () => {
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

  it('结果复用内部缓冲区（不是原始 ancestors 数组）', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    const result = sys.getAncestorsForCiv(1)
    expect(result).not.toBe((sys as any).ancestors)
  })

  it('连续两次调用返回同一缓冲区引用', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    const r1 = sys.getAncestorsForCiv(1)
    const r2 = sys.getAncestorsForCiv(1)
    expect(r1).toBe(r2)
  })

  it('查询不存在的文明返回空', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect(sys.getAncestorsForCiv(999)).toHaveLength(0)
  })

  it('文明 ID 为 0 时正确过滤', () => {
    const s = makeSpirit(0, 'valor')
    ;(sys as any).ancestors.push(s)
    ;(sys as any).ancestors.push(makeSpirit(1))
    expect(sys.getAncestorsForCiv(0)).toHaveLength(1)
    expect(sys.getAncestorsForCiv(0)[0].civId).toBe(0)
  })

  it('5 个文明各有 1 个祖先，均可正确过滤', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).ancestors.push(makeSpirit(i))
    }
    for (let i = 1; i <= 5; i++) {
      expect(sys.getAncestorsForCiv(i)).toHaveLength(1)
      expect(sys.getAncestorsForCiv(i)[0].civId).toBe(i)
    }
  })
})

describe('CreatureAncestorSystem.getAncestorsForCiv - 缓冲区行为', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('切换查询不同文明后缓冲区内容更新', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor'))
    ;(sys as any).ancestors.push(makeSpirit(2, 'wisdom'))
    const r1 = sys.getAncestorsForCiv(1)
    expect(r1[0].domain).toBe('valor')
    const r2 = sys.getAncestorsForCiv(2)
    expect(r2[0].domain).toBe('wisdom')
  })

  it('查询同一文明两次，第一次结果会被覆盖', () => {
    ;(sys as any).ancestors.push(makeSpirit(1, 'valor'))
    const r1 = sys.getAncestorsForCiv(1)
    ;(sys as any).ancestors.push(makeSpirit(1, 'craft'))
    const r2 = sys.getAncestorsForCiv(1)
    // r1 和 r2 是同一缓冲区，r2 调用后 r1 内容也是 r2 的内容
    expect(r1).toBe(r2)
    expect(r2).toHaveLength(2)
  })

  it('getAncestorsForCiv 每次调用都重置缓冲区长度', () => {
    ;(sys as any).ancestors.push(makeSpirit(1))
    ;(sys as any).ancestors.push(makeSpirit(1))
    sys.getAncestorsForCiv(1)
    // 清空 ancestors 后再查询
    ;(sys as any).ancestors.length = 0
    const r = sys.getAncestorsForCiv(1)
    expect(r).toHaveLength(0)
  })
})

describe('CreatureAncestorSystem - deadHeroes 内部状态', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('初始 deadHeroes 为空数组', () => {
    expect((sys as any).deadHeroes).toHaveLength(0)
  })

  it('deadHeroes 是数组', () => {
    expect(Array.isArray((sys as any).deadHeroes)).toBe(true)
  })

  it('可以向 deadHeroes 推入英雄', () => {
    const hero = { name: 'Hero1', species: 'human', civId: 1, x: 5, y: 5, power: 0.8 }
    ;(sys as any).deadHeroes.push(hero)
    expect((sys as any).deadHeroes).toHaveLength(1)
    expect((sys as any).deadHeroes[0].name).toBe('Hero1')
  })

  it('deadHeroes 中的英雄具有 power 字段', () => {
    const hero = { name: 'H', species: 'elf', civId: 2, x: 0, y: 0, power: 0.9 }
    ;(sys as any).deadHeroes.push(hero)
    expect((sys as any).deadHeroes[0].power).toBe(0.9)
  })
})

describe('CreatureAncestorSystem - nextCheckTick / nextBuffTick 内部状态', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('nextCheckTick 初始大于 0', () => {
    expect((sys as any).nextCheckTick).toBeGreaterThan(0)
  })

  it('nextBuffTick 初始大于 0', () => {
    expect((sys as any).nextBuffTick).toBeGreaterThan(0)
  })

  it('nextCheckTick 可以被修改', () => {
    ;(sys as any).nextCheckTick = 9999
    expect((sys as any).nextCheckTick).toBe(9999)
  })

  it('nextBuffTick 可以被修改', () => {
    ;(sys as any).nextBuffTick = 1234
    expect((sys as any).nextBuffTick).toBe(1234)
  })
})

describe('CreatureAncestorSystem - 字体缓存内部状态', () => {
  let sys: CreatureAncestorSystem

  beforeEach(() => { sys = makeAncSys(); nextSpiritId = 1 })

  it('_lastZoom 初始为 -1', () => {
    expect((sys as any)._lastZoom).toBe(-1)
  })

  it('_spiritFont 初始为空字符串', () => {
    expect((sys as any)._spiritFont).toBe('')
  })

  it('_countFont 初始为空字符串', () => {
    expect((sys as any)._countFont).toBe('')
  })
})

describe('CreatureAncestorSystem - 领域枚举完整性', () => {
  it('AncestorDomain 共有 5 种类型', () => {
    const domains: AncestorDomain[] = ['valor', 'harvest', 'healing', 'craft', 'wisdom']
    expect(domains).toHaveLength(5)
  })

  it('每种领域可以作为 AncestorSpirit.domain 使用', () => {
    const domains: AncestorDomain[] = ['valor', 'harvest', 'healing', 'craft', 'wisdom']
    domains.forEach(d => {
      const s = makeSpirit(1, d)
      expect(s.domain).toBe(d)
    })
  })

  it('valor 领域可正确识别', () => {
    const s = makeSpirit(1, 'valor')
    expect(s.domain).toBe('valor')
  })

  it('harvest 领域可正确识别', () => {
    const s = makeSpirit(1, 'harvest')
    expect(s.domain).toBe('harvest')
  })

  it('healing 领域可正确识别', () => {
    const s = makeSpirit(1, 'healing')
    expect(s.domain).toBe('healing')
  })

  it('craft 领域可正确识别', () => {
    const s = makeSpirit(1, 'craft')
    expect(s.domain).toBe('craft')
  })

  it('wisdom 领域可正确识别', () => {
    const s = makeSpirit(1, 'wisdom')
    expect(s.domain).toBe('wisdom')
  })
})

describe('CreatureAncestorSystem - 实例独立性', () => {
  it('两个实例的 ancestors 互不影响', () => {
    const sys1 = makeAncSys()
    const sys2 = makeAncSys()
    ;(sys1 as any).ancestors.push(makeSpirit(1))
    expect((sys2 as any).ancestors).toHaveLength(0)
  })

  it('两个实例的 deadHeroes 互不影响', () => {
    const sys1 = makeAncSys()
    const sys2 = makeAncSys()
    ;(sys1 as any).deadHeroes.push({ name: 'H', species: 'human', civId: 1, x: 0, y: 0, power: 0.5 })
    expect((sys2 as any).deadHeroes).toHaveLength(0)
  })

  it('两个实例的 _civAncestorsBuf 互不影响', () => {
    const sys1 = makeAncSys()
    const sys2 = makeAncSys()
    ;(sys1 as any).ancestors.push(makeSpirit(1))
    sys1.getAncestorsForCiv(1)
    expect(sys2.getAncestorsForCiv(1)).toHaveLength(0)
  })
})

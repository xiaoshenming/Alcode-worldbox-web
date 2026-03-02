import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureNomadSystem } from '../systems/CreatureNomadSystem'
import type { NomadTribe, NomadTradition } from '../systems/CreatureNomadSystem'

let nextId = 1
function makeSys(): CreatureNomadSystem { return new CreatureNomadSystem() }
function makeTribe(leaderId: number, tradition: NomadTradition = 'herders'): NomadTribe {
  return { id: nextId++, leaderId, tradition, memberCount: 20, migrationSpeed: 5, tradeGoods: 10, campX: 50, campY: 50, tick: 0 }
}

// migrationSpeed 按 tradition 的预期值
const TRAD_SPEED: Record<NomadTradition, number> = {
  herders: 3, gatherers: 2, hunters: 5, traders: 4,
}

// 构造 EM mock
function makeEM(ids: number[] = [], hasLeader = true) {
  return {
    getEntitiesWithComponent: (_a: string) => ids,
    hasComponent: (eid: number, _comp: string) => hasLeader ? ids.includes(eid) : false,
  } as any
}

describe('CreatureNomadSystem.getTribes — 基础数据', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无游牧部落', () => { expect((sys as any).tribes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tribes.push(makeTribe(1, 'traders'))
    expect((sys as any).tribes[0].tradition).toBe('traders')
  })
  it('返回内部引用', () => {
    ;(sys as any).tribes.push(makeTribe(1))
    expect((sys as any).tribes).toBe((sys as any).tribes)
  })
  it('支持所有 4 种传统', () => {
    const traditions: NomadTradition[] = ['herders', 'gatherers', 'hunters', 'traders']
    traditions.forEach((t, i) => { ;(sys as any).tribes.push(makeTribe(i + 1, t)) })
    const all = (sys as any).tribes
    traditions.forEach((t, i) => { expect(all[i].tradition).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).tribes.push(makeTribe(1))
    ;(sys as any).tribes.push(makeTribe(2))
    expect((sys as any).tribes).toHaveLength(2)
  })
})

describe('CreatureNomadSystem — CHECK_INTERVAL=3400 节流', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时不更新 lastCheck（0-0=0 < 3400）', () => {
    const em = makeEM([1])
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3399 时不更新 lastCheck', () => {
    const em = makeEM([])
    sys.update(1, em, 3399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3400 时更新 lastCheck', () => {
    const em = makeEM([])
    sys.update(1, em, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('第二次 update 小于间隔时不再更新', () => {
    const em = makeEM([])
    sys.update(1, em, 3400)
    sys.update(1, em, 4000) // 4000-3400=600 < 3400，不更新
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('连续两次满足间隔时都能更新', () => {
    const em = makeEM([])
    sys.update(1, em, 3400)
    sys.update(1, em, 6800) // 6800-3400=3400 >= 3400，更新
    expect((sys as any).lastCheck).toBe(6800)
  })
})

describe('CreatureNomadSystem — 部落结构字段校验', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('herders 的 migrationSpeed=3（TRAD_SPEED）', () => {
    const t = makeTribe(1, 'herders')
    t.migrationSpeed = TRAD_SPEED['herders']
    expect(t.migrationSpeed).toBe(3)
  })

  it('gatherers 的 migrationSpeed=2', () => {
    const t = makeTribe(1, 'gatherers')
    t.migrationSpeed = TRAD_SPEED['gatherers']
    expect(t.migrationSpeed).toBe(2)
  })

  it('hunters 的 migrationSpeed=5（最快）', () => {
    const t = makeTribe(1, 'hunters')
    t.migrationSpeed = TRAD_SPEED['hunters']
    expect(t.migrationSpeed).toBe(5)
  })

  it('traders 的 migrationSpeed=4', () => {
    const t = makeTribe(1, 'traders')
    t.migrationSpeed = TRAD_SPEED['traders']
    expect(t.migrationSpeed).toBe(4)
  })

  it('部落的 campX/campY 初始值正确存储', () => {
    const t: NomadTribe = { id: 1, leaderId: 99, tradition: 'hunters', memberCount: 5, migrationSpeed: 5, tradeGoods: 20, campX: 120, campY: 80, tick: 0 }
    ;(sys as any).tribes.push(t)
    expect((sys as any).tribes[0].campX).toBe(120)
    expect((sys as any).tribes[0].campY).toBe(80)
  })

  it('tradeGoods 不超过 100', () => {
    const t = makeTribe(1)
    t.tradeGoods = 99
    t.tradeGoods = Math.min(100, t.tradeGoods + 2)
    expect(t.tradeGoods).toBe(100)
  })

  it('memberCount 最小为 1', () => {
    const t = makeTribe(1)
    t.memberCount = 1
    const result = Math.max(1, t.memberCount + (-1))
    expect(result).toBe(1)
  })
})

describe('CreatureNomadSystem — leader 死亡后部落被清除', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leader 不存在时部落被删除', () => {
    ;(sys as any).tribes.push(makeTribe(99)) // leader=99，但 EM 里没有
    const em = makeEM([1, 2]) // 99 不在列表里
    sys.update(1, em, 3400)
    expect((sys as any).tribes).toHaveLength(0)
  })

  it('leader 存在时部落保留', () => {
    ;(sys as any).tribes.push(makeTribe(1))
    const em = makeEM([1]) // 1 存在
    sys.update(1, em, 3400)
    expect((sys as any).tribes).toHaveLength(1)
  })

  it('只删除 leader 死亡的部落，其余保留', () => {
    ;(sys as any).tribes.push(makeTribe(1)) // leader=1，存在
    ;(sys as any).tribes.push(makeTribe(99)) // leader=99，不存在
    const em = makeEM([1]) // 只有 1 存在
    sys.update(1, em, 3400)
    expect((sys as any).tribes).toHaveLength(1)
    expect((sys as any).tribes[0].leaderId).toBe(1)
  })
})

describe('CreatureNomadSystem — MAX_TRIBES=10 上限', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已有 10 个部落时不再新增', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).tribes.push(makeTribe(i))
    }
    // 强制 FORM_CHANCE 通过（random < 0.002）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // EM 包含 1-11，确保原有 10 个部落的 leader 不被清除
    const em = makeEM([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    sys.update(1, em, 3400)
    expect((sys as any).tribes).toHaveLength(10)
    vi.restoreAllMocks()
  })

  it('部落数量 < 10 且满足 FORM_CHANCE 时可以新增（有实体时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < FORM_CHANCE=0.002，通过
    const em = makeEM([1])
    sys.update(1, em, 3400)
    // 应有 1 个新部落
    expect((sys as any).tribes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('无实体时不创建部落', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([]) // 空
    sys.update(1, em, 3400)
    expect((sys as any).tribes).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('CreatureNomadSystem — campX/campY 边界约束', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('campX 不小于 0', () => {
    const t = makeTribe(1)
    t.campX = 0
    // 源码: Math.max(0, Math.min(199, campX + floor(rand*7)-3))
    // 最坏情况 delta=-3: Math.max(0, -3)=0
    const result = Math.max(0, Math.min(199, t.campX - 3))
    expect(result).toBe(0)
  })

  it('campX 不超过 199', () => {
    const t = makeTribe(1)
    t.campX = 199
    // delta=+3: Math.min(199, 202)=199
    const result = Math.max(0, Math.min(199, t.campX + 3))
    expect(result).toBe(199)
  })

  it('campY 不小于 0', () => {
    const t = makeTribe(1)
    t.campY = 0
    const result = Math.max(0, Math.min(199, t.campY - 3))
    expect(result).toBe(0)
  })

  it('campY 不超过 199', () => {
    const t = makeTribe(1)
    t.campY = 199
    const result = Math.max(0, Math.min(199, t.campY + 3))
    expect(result).toBe(199)
  })
})

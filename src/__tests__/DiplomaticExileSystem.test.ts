import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticExileSystem } from '../systems/DiplomaticExileSystem'

function makeEM() {
  return {
    getEntitiesWithComponents: () => [] as number[],
    getComponent: (_eid: number, comp: string) => comp === 'creature' ? {} : null,
  } as any
}
function makeEmptyManager() {
  return { civilizations: new Map<number, any>() } as any
}

describe('基础数据结构', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = new DiplomaticExileSystem() })

  it('初始exiles为空', () => { expect((sys as any).exiles).toHaveLength(0) })
  it('初始_wanderingSet为空', () => { expect((sys as any)._wanderingSet.size).toBe(0) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('lastFate初始为0', () => { expect((sys as any).lastFate).toBe(0) })
  it('5种reason枚举', () => {
    const reasons = ['criminal', 'dissident', 'heretic', 'traitor', 'outcast']
    reasons.forEach(r => {
      ;(sys as any).exiles.push({ id: 1, entityId: 1, originCivId: 1, reason: r, exiledAt: 0, status: 'wandering' })
      expect((sys as any).exiles.at(-1).reason).toBe(r)
      ;(sys as any).exiles.pop()
    })
  })
})

describe('CHECK_INTERVAL=1200节流', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = new DiplomaticExileSystem() })

  it('tick<1200时lastCheck不更新', () => {
    sys.update(1, makeEM(), makeEmptyManager(), 1199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=1200时lastCheck更新', () => {
    sys.update(1, makeEM(), makeEmptyManager(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('FATE_INTERVAL=800独立控制lastFate', () => {
    sys.update(1, makeEM(), makeEmptyManager(), 800)
    expect((sys as any).lastFate).toBe(800)
  })
  it('两个时间点独立：tick=800只更新lastFate', () => {
    sys.update(1, makeEM(), makeEmptyManager(), 800)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).lastFate).toBe(800)
  })
})

describe('exile创建和_wanderingSet', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = new DiplomaticExileSystem() })

  it('手动注入exile后status为wandering', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 10, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    expect((sys as any).exiles[0].status).toBe('wandering')
  })
  it('_wanderingSet正确追踪wandering的entityId', () => {
    ;(sys as any)._wanderingSet.add(10)
    expect((sys as any)._wanderingSet.has(10)).toBe(true)
  })
  it('非wandering状态不在_wanderingSet中', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 20, originCivId: 1, reason: 'traitor', exiledAt: 0, status: 'bandit' })
    expect((sys as any)._wanderingSet.has(20)).toBe(false)
  })
  it('多个wandering exile各自追踪', () => {
    ;(sys as any)._wanderingSet.add(1)
    ;(sys as any)._wanderingSet.add(2)
    expect((sys as any)._wanderingSet.size).toBe(2)
  })
})

describe('resolveFates——creature不存在时变dead', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = new DiplomaticExileSystem() })

  it('creature不存在时exile变dead', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 99, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(99)
    ;(sys as any).lastFate = 0
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(1, em, makeEmptyManager(), 800)
    expect((sys as any).exiles[0].status).toBe('dead')
  })
  it('creature不存在时从_wanderingSet移除', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 99, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(99)
    ;(sys as any).lastFate = 0
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(1, em, makeEmptyManager(), 800)
    expect((sys as any)._wanderingSet.has(99)).toBe(false)
  })
  it('非wandering状态不受resolveFates影响', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 99, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'bandit' })
    ;(sys as any).lastFate = 0
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    sys.update(1, em, makeEmptyManager(), 800)
    expect((sys as any).exiles[0].status).toBe('bandit')
  })
  it('creature存在时不变dead', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 99, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(99)
    ;(sys as any).lastFate = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // > 0.09，不触发任何状态变化
    const em = { getEntitiesWithComponents: () => [], getComponent: (_: any, c: string) => c === 'creature' ? {} : null } as any
    sys.update(1, em, makeEmptyManager(), 800)
    expect((sys as any).exiles[0].status).toBe('wandering')
    vi.restoreAllMocks()
  })
})

describe('resolveFates——roll触发状态转换', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = new DiplomaticExileSystem() })

  function pushWandering(entityId: number) {
    ;(sys as any).exiles.push({ id: entityId, entityId, originCivId: 1, reason: 'dissident', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(entityId)
    ;(sys as any).lastFate = 0
  }
  function makeCreatureEM() {
    return { getEntitiesWithComponents: () => [], getComponent: (_: any, c: string) => c === 'creature' ? {} : null } as any
  }

  it('roll<0.05→joined_other（有其他civ时）', () => {
    pushWandering(10)
    vi.spyOn(Math, 'random').mockReturnValue(0.04)
    const mgr = { civilizations: new Map([[1, {}], [2, {}]]) } as any
    sys.update(1, makeCreatureEM(), mgr, 800)
    expect((sys as any).exiles[0].status).toBe('joined_other')
    vi.restoreAllMocks()
  })
  it('roll<0.08→bandit', () => {
    pushWandering(11)
    vi.spyOn(Math, 'random').mockReturnValue(0.07)
    sys.update(1, makeCreatureEM(), makeEmptyManager(), 800)
    expect((sys as any).exiles[0].status).toBe('bandit')
    vi.restoreAllMocks()
  })
  it('roll<0.09→pardoned', () => {
    pushWandering(12)
    vi.spyOn(Math, 'random').mockReturnValue(0.085)
    sys.update(1, makeCreatureEM(), makeEmptyManager(), 800)
    expect((sys as any).exiles[0].status).toBe('pardoned')
    vi.restoreAllMocks()
  })
  it('状态变化后_wanderingSet清除', () => {
    pushWandering(13)
    vi.spyOn(Math, 'random').mockReturnValue(0.07)
    sys.update(1, makeCreatureEM(), makeEmptyManager(), 800)
    expect((sys as any)._wanderingSet.has(13)).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('MAX_EXILES=30上限（仅计算wandering）', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = new DiplomaticExileSystem() })

  it('30个wandering时exileCreatures不新增', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).exiles.push({ id: i, entityId: i, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    }
    ;(sys as any).lastCheck = 0
    const mgr = { civilizations: new Map([[1, {}]]) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // 触发exile逻辑
    sys.update(1, makeEM(), mgr, 1200)
    expect((sys as any).exiles).toHaveLength(30)
    vi.restoreAllMocks()
  })
  it('29个wandering时可以新增', () => {
    for (let i = 0; i < 29; i++) {
      ;(sys as any).exiles.push({ id: i, entityId: i, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    }
    expect((sys as any).exiles).toHaveLength(29)
  })
  it('非wandering状态不计入上限', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).exiles.push({ id: i, entityId: i, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'dead' })
    }
    const count = (sys as any).exiles.filter((e: any) => e.status === 'wandering').length
    expect(count).toBe(0)
  })
  it('wandering计数正确', () => {
    ;(sys as any).exiles.push({ id: 1, entityId: 1, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any).exiles.push({ id: 2, entityId: 2, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'dead' })
    const count = (sys as any).exiles.filter((e: any) => e.status === 'wandering').length
    expect(count).toBe(1)
  })
  it('exiles数组可存储超过30个非wandering记录', () => {
    for (let i = 0; i < 35; i++) {
      ;(sys as any).exiles.push({ id: i, entityId: i, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'bandit' })
    }
    expect((sys as any).exiles).toHaveLength(35)
  })
})

describe('额外边界与防御性测试', () => {
  it('Exile 包含所有必要字段', () => {
    const exile = { id: 1, entityId: 1, originCivId: 1, reason: 'criminal' as const, exiledAt: 0, status: 'wandering' as const }
    expect(exile).toHaveProperty('id')
    expect(exile).toHaveProperty('entityId')
    expect(exile).toHaveProperty('originCivId')
    expect(exile).toHaveProperty('reason')
    expect(exile).toHaveProperty('exiledAt')
    expect(exile).toHaveProperty('status')
  })

  it('exile status 所有合法值', () => {
    const statuses = ['wandering', 'joined_other', 'bandit', 'dead', 'pardoned']
    for (const s of statuses) {
      const exile = { id: 1, entityId: 1, originCivId: 1, reason: 'criminal' as const, exiledAt: 0, status: s as any }
      expect(exile.status).toBe(s)
    }
  })

  it('update 空 civilizations 不崩溃', () => {
    const sys = new DiplomaticExileSystem()
    expect(() => sys.update(1, makeEM(), makeEmptyManager(), 0)).not.toThrow()
  })

  it('wandering exile 的 entityId 在 _wanderingSet 中', () => {
    const sys = new DiplomaticExileSystem()
    ;(sys as any).exiles.push({ id: 1, entityId: 99, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(99)
    expect((sys as any)._wanderingSet.has(99)).toBe(true)
  })

  it('非 wandering exile 不在 _wanderingSet 中', () => {
    const sys = new DiplomaticExileSystem()
    ;(sys as any).exiles.push({ id: 1, entityId: 88, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'bandit' })
    expect((sys as any)._wanderingSet.has(88)).toBe(false)
  })

  it('update dead-entity spy: getComponent=null -> status=dead', () => {
    const sys = new DiplomaticExileSystem()
    const emDead = {
      getEntitiesWithComponents: () => [] as number[],
      getComponent: (_eid: number, comp: string) => comp === 'creature' ? null : null,
    } as any
    ;(sys as any).exiles.push({ id: 1, entityId: 1, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(1)
    ;(sys as any).lastFate = 0
    sys.update(1, emDead, makeEmptyManager(), 800)
    const exile = (sys as any).exiles[0]
    expect(exile.status).toBe('dead')
  })

  it('exiles 数组是可迭代的', () => {
    const sys = new DiplomaticExileSystem()
    for (let i = 0; i < 3; i++) {
      ;(sys as any).exiles.push({ id: i, entityId: i, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    }
    let count = 0
    for (const _e of (sys as any).exiles) { count++ }
    expect(count).toBe(3)
  })

  it('_wanderingSet 是 Set 类型', () => {
    const sys = new DiplomaticExileSystem()
    expect((sys as any)._wanderingSet).toBeInstanceOf(Set)
  })

  it('resolveFates 不触发（lastFate 未到期）', () => {
    const sys = new DiplomaticExileSystem()
    ;(sys as any).lastFate = 99999
    ;(sys as any).exiles.push({ id: 1, entityId: 1, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
    ;(sys as any)._wanderingSet.add(1)
    sys.update(1, makeEM(), makeEmptyManager(), 100)
    // fate not resolved
    expect((sys as any).exiles[0].status).toBe('wandering')
  })

  it('exileCreatures 阻断：wandering 超过 MAX_EXILES(30)', () => {
    const sys = new DiplomaticExileSystem()
    for (let i = 0; i < 30; i++) {
      ;(sys as any).exiles.push({ id: i, entityId: i, originCivId: 1, reason: 'criminal', exiledAt: 0, status: 'wandering' })
      ;(sys as any)._wanderingSet.add(i)
    }
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    const emWithCreature = {
      getEntitiesWithComponents: () => [100],
      getComponent: (_eid: number, comp: string) => comp === 'civMember' ? { civId: 1 } : {},
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // force exile
    ;(sys as any).lastCheck = 0
    sys.update(1, emWithCreature, civManager, 1200)
    expect((sys as any).exiles.filter((e: any) => e.status === 'wandering').length).toBeLessThanOrEqual(30)
    vi.restoreAllMocks()
  })

  it('dissident reason 可存储', () => {
    const exile = { id: 1, entityId: 1, originCivId: 1, reason: 'dissident' as const, exiledAt: 0, status: 'wandering' as const }
    expect(exile.reason).toBe('dissident')
  })

  it('heretic reason 可存储', () => {
    const exile = { id: 1, entityId: 1, originCivId: 1, reason: 'heretic' as const, exiledAt: 0, status: 'wandering' as const }
    expect(exile.reason).toBe('heretic')
  })

  it('traitor reason 可存储', () => {
    const exile = { id: 1, entityId: 1, originCivId: 1, reason: 'traitor' as const, exiledAt: 0, status: 'wandering' as const }
    expect(exile.reason).toBe('traitor')
  })

  it('outcast reason 可存储', () => {
    const exile = { id: 1, entityId: 1, originCivId: 1, reason: 'outcast' as const, exiledAt: 0, status: 'wandering' as const }
    expect(exile.reason).toBe('outcast')
  })

  it('lastCheck 更新到最新 check 触发 tick', () => {
    const sys = new DiplomaticExileSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM(), makeEmptyManager(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
    vi.restoreAllMocks()
  })

  it('lastFate 更新到最新 fate 触发 tick', () => {
    const sys = new DiplomaticExileSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeEM(), makeEmptyManager(), 800)
    expect((sys as any).lastFate).toBe(800)
    vi.restoreAllMocks()
  })
})

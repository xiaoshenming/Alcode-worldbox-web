import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureReputationSystem } from '../systems/CreatureReputationSystem'
import type { CreatureReputation, ReputationTier } from '../systems/CreatureReputationSystem'

function makeSys(): CreatureReputationSystem { return new CreatureReputationSystem() }
function makeRep(entityId: number, score: number, tier: ReputationTier = 'neutral'): CreatureReputation {
  return { entityId, score, tier, kills: 0, heals: 0, trades: 0, builds: 0, lastAction: '', lastActionTick: 0, displayStr: `#${entityId} ${tier} (${score})` }
}

describe('CreatureReputationSystem.getReputation', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('无记录返回undefined', () => { expect(sys.getReputation(999)).toBeUndefined() })
  it('注入后可查询', () => {
    ;(sys as any).reputations.set(1, makeRep(1, 80, 'respected'))
    expect(sys.getReputation(1)?.tier).toBe('respected')
  })
  it('支持所有5种声望等级', () => {
    const tiers: ReputationTier[] = ['infamous', 'disliked', 'neutral', 'respected', 'legendary']
    tiers.forEach((t, i) => { ;(sys as any).reputations.set(i, makeRep(i, i * 20, t)) })
    tiers.forEach((t, i) => { expect(sys.getReputation(i)?.tier).toBe(t) })
  })
})

describe('CreatureReputationSystem.getTopReputation', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('空时返回空', () => { expect(sys.getTopReputation(3)).toHaveLength(0) })
  it('按score降序排列', () => {
    ;(sys as any).reputations.set(1, makeRep(1, 50))
    ;(sys as any).reputations.set(2, makeRep(2, 90))
    ;(sys as any).reputations.set(3, makeRep(3, 30))
    const top = sys.getTopReputation(2)
    expect(top[0].score).toBe(90)
    expect(top[1].score).toBe(50)
    expect(top).toHaveLength(2)
  })
})

describe('CreatureReputationSystem.addReputation', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('首次调用为新实体创建记录', () => {
    sys.addReputation(42, 10, 'trade', 100)
    expect(sys.getReputation(42)).toBeDefined()
    expect(sys.getReputation(42)?.score).toBe(10)
  })

  it('重复调用累加score', () => {
    sys.addReputation(1, 20, 'build', 10)
    sys.addReputation(1, 15, 'heal', 20)
    expect(sys.getReputation(1)?.score).toBe(35)
  })

  it('score上限100', () => {
    sys.addReputation(1, 90, 'build', 10)
    sys.addReputation(1, 90, 'build', 20)
    expect(sys.getReputation(1)?.score).toBe(100)
  })

  it('score下限-100', () => {
    sys.addReputation(1, -90, 'kill', 10)
    sys.addReputation(1, -90, 'kill', 20)
    expect(sys.getReputation(1)?.score).toBe(-100)
  })

  it('lastAction和lastActionTick被正确记录', () => {
    sys.addReputation(5, 10, 'trade', 500)
    const rep = sys.getReputation(5)
    expect(rep?.lastAction).toBe('trade')
    expect(rep?.lastActionTick).toBe(500)
  })

  it('tier根据score正确计算', () => {
    sys.addReputation(1, 80, 'build', 1)
    expect(sys.getReputation(1)?.tier).toBe('legendary')
    sys.addReputation(2, 40, 'trade', 1)
    expect(sys.getReputation(2)?.tier).toBe('respected')
    sys.addReputation(3, 0, 'trade', 1)
    expect(sys.getReputation(3)?.tier).toBe('neutral')
    sys.addReputation(4, -30, 'kill', 1)
    expect(sys.getReputation(4)?.tier).toBe('disliked')
    sys.addReputation(5, -70, 'kill', 1)
    expect(sys.getReputation(5)?.tier).toBe('infamous')
  })

  it('displayStr包含entityId、tier、score', () => {
    sys.addReputation(7, 50, 'build', 1)
    const rep = sys.getReputation(7)
    expect(rep?.displayStr).toContain('7')
    expect(rep?.displayStr).toContain('respected')
    expect(rep?.displayStr).toContain('50')
  })
})

describe('CreatureReputationSystem.recordKill/Heal/Trade/Build', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('recordKill扣5分并增kills计数', () => {
    sys.recordKill(1, 10)
    sys.recordKill(1, 20)
    const rep = sys.getReputation(1)
    expect(rep?.score).toBe(-10)
    expect(rep?.kills).toBe(2)
    expect(rep?.lastAction).toBe('kill')
  })

  it('recordHeal加3分并增heals计数', () => {
    sys.recordHeal(1, 10)
    sys.recordHeal(1, 20)
    const rep = sys.getReputation(1)
    expect(rep?.score).toBe(6)
    expect(rep?.heals).toBe(2)
    expect(rep?.lastAction).toBe('heal')
  })

  it('recordTrade加2分并增trades计数', () => {
    sys.recordTrade(1, 10)
    sys.recordTrade(1, 20)
    sys.recordTrade(1, 30)
    const rep = sys.getReputation(1)
    expect(rep?.score).toBe(6)
    expect(rep?.trades).toBe(3)
    expect(rep?.lastAction).toBe('trade')
  })

  it('recordBuild加4分并增builds计数', () => {
    sys.recordBuild(1, 10)
    const rep = sys.getReputation(1)
    expect(rep?.score).toBe(4)
    expect(rep?.builds).toBe(1)
    expect(rep?.lastAction).toBe('build')
  })
})

describe('CreatureReputationSystem tier阈值边界', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('score=-60时是infamous，score=-59时是disliked', () => {
    sys.addReputation(1, -60, 'kill', 1)
    expect(sys.getReputation(1)?.tier).toBe('infamous')
    sys.addReputation(2, -59, 'kill', 1)
    expect(sys.getReputation(2)?.tier).toBe('disliked')
  })

  it('score=60时是respected，score=61时是legendary', () => {
    sys.addReputation(1, 60, 'build', 1)
    expect(sys.getReputation(1)?.tier).toBe('respected')
    sys.addReputation(2, 61, 'build', 1)
    expect(sys.getReputation(2)?.tier).toBe('legendary')
  })
})

describe('CreatureReputationSystem.update decay逻辑', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('decay时正score向0减少1', () => {
    sys.addReputation(1, 10, 'build', 1)
    const mockEm: any = {
      getComponent: (_eid: number, _comp: string) => ({ x: 0, y: 0 }),
      getEntitiesWithComponents: () => [],
    }
    ;(sys as any).nextDecayTick = 0
    sys.update(0, mockEm, 3001)
    expect(sys.getReputation(1)?.score).toBe(9)
  })

  it('decay时负score向0增加1', () => {
    sys.addReputation(1, -10, 'kill', 1)
    const mockEm: any = {
      getComponent: (_eid: number, _comp: string) => ({ x: 0, y: 0 }),
      getEntitiesWithComponents: () => [],
    }
    ;(sys as any).nextDecayTick = 0
    sys.update(0, mockEm, 3001)
    expect(sys.getReputation(1)?.score).toBe(-9)
  })

  it('score=0时decay不改变score', () => {
    sys.addReputation(1, 0, 'trade', 1)
    const mockEm: any = {
      getComponent: (_eid: number, _comp: string) => ({ x: 0, y: 0 }),
      getEntitiesWithComponents: () => [],
    }
    ;(sys as any).nextDecayTick = 0
    sys.update(0, mockEm, 3001)
    expect(sys.getReputation(1)?.score).toBe(0)
  })

  it('update时清除无position组件的死亡实体', () => {
    sys.addReputation(1, 50, 'build', 1)
    const mockEm: any = {
      getComponent: (_eid: number, _comp: string) => null,
      getEntitiesWithComponents: () => [],
    }
    sys.update(0, mockEm, 100)
    expect(sys.getReputation(1)).toBeUndefined()
  })
})

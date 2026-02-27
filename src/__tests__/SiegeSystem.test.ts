import { describe, it, expect, beforeEach } from 'vitest'
import { SiegeSystem, SiegePhase } from '../systems/SiegeSystem'
import type { SiegeInfo } from '../systems/SiegeSystem'

function makeSys(): SiegeSystem { return new SiegeSystem() }
let nextId = 1
function makeSiege(attackerCivId: number, defenderCivId: number): SiegeInfo {
  return {
    id: nextId++, attackerCivId, defenderCivId,
    targetX: 10, targetY: 10,
    phase: SiegePhase.APPROACHING,
    equipment: [],
    wall: { hp: 100, maxHp: 100, breached: false },
    startTick: 0, duration: 0,
    attackerMorale: 100, defenderMorale: 100,
    sortieTimer: 0, breachBonus: 0
  }
}

describe('SiegeSystem.getSieges', () => {
  let sys: SiegeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无围城', () => { expect(sys.getSieges()).toHaveLength(0) })
  it('注入后可查询', () => {
    const s = makeSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()).toHaveLength(1)
  })
  it('围城字段正确', () => {
    const s = makeSiege(3, 4)
    ;(sys as any).sieges.set(s.id, s)
    const result = sys.getSieges()[0]
    expect(result.attackerCivId).toBe(3)
    expect(result.phase).toBe(SiegePhase.APPROACHING)
    expect(result.wall.breached).toBe(false)
  })
  it('支持4种围城阶段', () => {
    const phases = [SiegePhase.APPROACHING, SiegePhase.DEPLOYING, SiegePhase.ASSAULTING, SiegePhase.BREACHING]
    phases.forEach((p, i) => {
      const s = makeSiege(i + 1, i + 10)
      s.phase = p
      ;(sys as any).sieges.set(s.id, s)
    })
    expect(sys.getSieges()).toHaveLength(4)
  })
})

describe('SiegeSystem.getSiegeAt', () => {
  let sys: SiegeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无围城时返回null', () => {
    expect(sys.getSiegeAt(10, 10)).toBeNull()
  })
  it('精确坐标可查询到', () => {
    const s = makeSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSiegeAt(10, 10)).not.toBeNull()
  })
})

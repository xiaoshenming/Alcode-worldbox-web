import { describe, it, expect, beforeEach } from 'vitest'
import { NavalCombatSystem } from '../systems/NavalCombatSystem'
import type { NavalBattle, NavalBattleState } from '../systems/NavalCombatSystem'

function makeSys(): NavalCombatSystem { return new NavalCombatSystem() }
let nextId = 1
function makeBattle(state: NavalBattleState = 'broadside'): NavalBattle {
  return {
    id: nextId++,
    ships: new Map(),
    state, centerX: 10, centerY: 10,
    startTick: 0, lastTick: 0
  }
}

describe('NavalCombatSystem.getActiveBattles', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无海战', () => { expect(sys.getActiveBattles()).toHaveLength(0) })
  it('注入后可查询', () => {
    const b = makeBattle()
    ;(sys as any).battles.set(b.id, b)
    expect(sys.getActiveBattles()).toHaveLength(1)
  })
  it('海战字段正确', () => {
    const b = makeBattle('boarding')
    ;(sys as any).battles.set(b.id, b)
    const result = sys.getActiveBattles()[0]
    expect(result.state).toBe('boarding')
    expect(result.centerX).toBe(10)
  })
  it('支持4种战斗状态', () => {
    const states: NavalBattleState[] = ['approaching', 'broadside', 'boarding', 'retreating']
    states.forEach((s, i) => {
      const b = makeBattle(s)
      ;(sys as any).battles.set(b.id, b)
    })
    expect(sys.getActiveBattles()).toHaveLength(4)
  })
})

describe('NavalCombatSystem.getBattleLog', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys() })

  it('初始日志为空', () => { expect(sys.getBattleLog()).toHaveLength(0) })
  it('注入后可查��', () => {
    ;(sys as any).battleLog.push('Ship sunk!')
    expect(sys.getBattleLog()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).battleLog.push('Battle begins')
    expect(sys.getBattleLog()).toBe((sys as any).battleLog)
  })
})

describe('NavalCombatSystem.getShipCount', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys() })

  it('初始船只数为0', () => { expect(sys.getShipCount()).toBe(0) })
  it('注入ship后增加', () => {
    ;(sys as any).ships.set(1, { shipType: 'warship', civId: 1, hull: 100, maxHull: 100, speed: 0.05, targetX: 0, targetY: 0, cannonCooldown: 0, boarding: false })
    expect(sys.getShipCount()).toBe(1)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { TechSystem } from '../systems/TechSystem'
import type { Civilization } from '../civilization/Civilization'

function makeCiv(overrides: Partial<Civilization> = {}): Civilization {
  return {
    id: 1, name: 'Test', color: '#fff', population: 10,
    territory: new Set(), buildings: [],
    resources: { food: 100, wood: 100, stone: 100, gold: 100 },
    techLevel: 1,
    relations: new Map(), tradeRoutes: [],
    culture: { trait: 'military' as any, strength: 50 },
    religion: { type: 'none' as any, faith: 0, temples: 0, blessing: null, blessingTimer: 0 },
    happiness: 50, taxRate: 1, revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1 },
    treaties: [], embassies: [], diplomaticStance: 'neutral',
    ...overrides
  } as Civilization
}

function makeSys() { return new TechSystem() }

describe('TechSystem', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })

  it('初始tickCounter为0', () => { expect((sys as any).tickCounter).toBe(0) })

  it('static hasTech 未研究技术返回false', () => {
    const civ = makeCiv()
    expect(TechSystem.hasTech(civ, 'archery')).toBe(false)
  })

  it('static hasTech 已完成的技术返回true', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['archery'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'archery')).toBe(true)
  })

  it('static getTechBonus 无完成技术时返回0', () => {
    const civ = makeCiv()
    const bonus = TechSystem.getTechBonus(civ, 'attack')
    expect(bonus).toBe(0)
  })

  it('static getTechBonus 有完成技术时返回累积奖励', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['archery'], researchRate: 1 } })
    const bonus = TechSystem.getTechBonus(civ, 'attack')
    expect(typeof bonus).toBe('number')
  })

  it('可以实例化', () => { expect(sys).toBeDefined() })
})

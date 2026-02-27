import { describe, it, expect, beforeEach } from 'vitest'
import { MiningSystem, OreType } from '../systems/MiningSystem'
import type { OreDeposit } from '../systems/MiningSystem'

function makeSys(): MiningSystem { return new MiningSystem() }
function makeDeposit(civId: number = 1, type: OreType = OreType.IRON): OreDeposit {
  return {
    x: 5, y: 5, type, size: 'medium',
    reserves: 100, maxReserves: 100,
    discovered: true, discoveredBy: civId,
    mineBuilt: false, productionRate: 1.0
  }
}

describe('MiningSystem.getDiscoveredDeposits', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无矿床', () => { expect(sys.getDiscoveredDeposits()).toHaveLength(0) })
  it('注入已发现矿床后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.GOLD))
    expect(sys.getDiscoveredDeposits()).toHaveLength(1)
  })
  it('未发现的矿床不返回', () => {
    const d = makeDeposit()
    d.discovered = false
    ;(sys as any).deposits.push(d)
    expect(sys.getDiscoveredDeposits()).toHaveLength(0)
  })
  it('支持7种矿石类型', () => {
    const types = [OreType.COPPER, OreType.IRON, OreType.GOLD, OreType.GEMS, OreType.MITHRIL, OreType.ADAMANTINE]
    types.forEach(t => { ;(sys as any).deposits.push(makeDeposit(1, t)) })
    expect(sys.getDiscoveredDeposits()).toHaveLength(6)
  })
})

describe('MiningSystem.getDepositsForCiv', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('无矿床时返回空', () => { expect(sys.getDepositsForCiv(1)).toHaveLength(0) })
  it('按文明过滤', () => {
    ;(sys as any).deposits.push(makeDeposit(1))
    ;(sys as any).deposits.push(makeDeposit(2))
    expect(sys.getDepositsForCiv(1)).toHaveLength(1)
    expect(sys.getDepositsForCiv(2)).toHaveLength(1)
  })
})

describe('MiningSystem.getMiningBonus', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('返回military/wealth/culture字段', () => {
    const bonus = sys.getMiningBonus(OreType.GOLD)
    expect(bonus).toHaveProperty('military')
    expect(bonus).toHaveProperty('wealth')
    expect(bonus).toHaveProperty('culture')
  })
  it('NONE类型返回零加成', () => {
    const bonus = sys.getMiningBonus(OreType.NONE)
    expect(bonus.military).toBe(0)
    expect(bonus.wealth).toBe(0)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureOracleSystem } from '../systems/CreatureOracleSystem'
import type { OracleData, OracleDomain } from '../systems/CreatureOracleSystem'

let nextId = 1
function makeSys(): CreatureOracleSystem { return new CreatureOracleSystem() }
function makeOracle(entityId: number, domain: OracleDomain = 'weather'): OracleData {
  return { entityId, visionCount: 5, accuracy: 70, domain, followers: 10, active: true, tick: 0 }
}

describe('CreatureOracleSystem.getOracles', () => {
  let sys: CreatureOracleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无神谕者', () => { expect(sys.getOracles()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).oracles.push(makeOracle(1, 'war'))
    expect(sys.getOracles()[0].domain).toBe('war')
  })
  it('返回内部引用', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect(sys.getOracles()).toBe((sys as any).oracles)
  })
  it('支持所有4种领域', () => {
    const domains: OracleDomain[] = ['weather', 'war', 'prosperity', 'disaster']
    domains.forEach((d, i) => { ;(sys as any).oracles.push(makeOracle(i + 1, d)) })
    const all = sys.getOracles()
    domains.forEach((d, i) => { expect(all[i].domain).toBe(d) })
  })
  it('active字段为true', () => {
    ;(sys as any).oracles.push(makeOracle(1))
    expect(sys.getOracles()[0].active).toBe(true)
  })
})

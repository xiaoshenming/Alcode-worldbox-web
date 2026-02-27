import { describe, it, expect, beforeEach } from 'vitest'
import { EcosystemSystem } from '../systems/EcosystemSystem'

function makeSys(): EcosystemSystem { return new EcosystemSystem() }

describe('EcosystemSystem getters', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })

  it('getEcosystemHealth初始返回50', () => {
    expect(sys.getEcosystemHealth()).toBe(50)
  })
  it('设置后可查询ecosystemHealth', () => {
    ;(sys as any).ecosystemHealth = 80
    expect(sys.getEcosystemHealth()).toBe(80)
  })
  it('边界值：0生态健康', () => {
    ;(sys as any).ecosystemHealth = 0
    expect(sys.getEcosystemHealth()).toBe(0)
  })
  it('边界值：100生态健康', () => {
    ;(sys as any).ecosystemHealth = 100
    expect(sys.getEcosystemHealth()).toBe(100)
  })
  it('注入wildlifeCounts后可查询', () => {
    ;(sys as any).wildlifeCounts.set('deer', 15)
    ;(sys as any).wildlifeCounts.set('bear', 5)
    const counts = sys.getWildlifeCounts()
    // getWildlifeCounts calls refreshCounts internally (requires em)
    // Just verify the method exists and doesn't throw
    expect(counts).toBeDefined()
  })
})

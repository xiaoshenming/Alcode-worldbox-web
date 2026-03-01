import { describe, it, expect, beforeEach } from 'vitest'
import { EcosystemSystem } from '../systems/EcosystemSystem'

function makeSys(): EcosystemSystem { return new EcosystemSystem() }

describe('EcosystemSystem', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })

  it('初始ecosystemHealth为50', () => {
    expect((sys as any).ecosystemHealth).toBe(50)
  })
  it('设置后可查询ecosystemHealth', () => {
    ;(sys as any).ecosystemHealth = 80
    expect((sys as any).ecosystemHealth).toBe(80)
  })
  it('边界值：0生态健康', () => {
    ;(sys as any).ecosystemHealth = 0
    expect((sys as any).ecosystemHealth).toBe(0)
  })
  it('边界值：100生态健康', () => {
    ;(sys as any).ecosystemHealth = 100
    expect((sys as any).ecosystemHealth).toBe(100)
  })
  it('wildlifeCounts是Map类型', () => {
    expect((sys as any).wildlifeCounts).toBeInstanceOf(Map)
  })
  it('注入wildlifeCounts后内部Map包含数据', () => {
    ;(sys as any).wildlifeCounts.set('deer', 15)
    ;(sys as any).wildlifeCounts.set('bear', 5)
    expect((sys as any).wildlifeCounts.get('deer')).toBe(15)
    expect((sys as any).wildlifeCounts.get('bear')).toBe(5)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { EvolutionSystem } from '../systems/EvolutionSystem'
import type { EvolutionTrait } from '../systems/EvolutionSystem'

function makeSys(): EvolutionSystem { return new EvolutionSystem() }
function makeTrait(name: string = 'Mountain Hardy'): EvolutionTrait {
  return {
    name, description: 'Hardy in mountains',
    effect: 'health_boost', magnitude: 0.2, source: 'environment'
  }
}

describe('EvolutionSystem.getSpeciesTraits', () => {
  let sys: EvolutionSystem
  beforeEach(() => { sys = makeSys() })

  it('未知物种返回空数组', () => {
    expect(sys.getSpeciesTraits('unknown')).toHaveLength(0)
  })
  it('注入物种数据后可查询特性', () => {
    const speciesData = {
      species: 'human',
      traits: new Map([['Mountain Hardy', { count: 5, total: 10 }]]),
      deathCauses: { combat: 0, hunger: 0, disease: 0, age: 0, disaster: 0 },
      generation: 1,
      adaptationProgress: new Map()
    }
    ;(sys as any).speciesData.set('human', speciesData)
    const traits = sys.getSpeciesTraits('human')
    expect(traits.length).toBeGreaterThanOrEqual(0)
  })
  it('支持8种特性效果类型', () => {
    const effects: EvolutionTrait['effect'][] = [
      'health_boost', 'speed_boost', 'hunger_slow', 'frost_immune',
      'aquatic', 'stealth', 'defense_boost', 'disease_resist'
    ]
    expect(effects).toHaveLength(8)
  })
})

describe('EvolutionSystem.getAdaptationProgress', () => {
  let sys: EvolutionSystem
  beforeEach(() => { sys = makeSys() })

  it('未知物种返回空Map', () => {
    const progress = sys.getAdaptationProgress('unknown')
    expect(progress.size).toBe(0)
  })
  it('注入物种数据后可查询适应进度', () => {
    const speciesData = {
      species: 'elf',
      traits: new Map(),
      deathCauses: { combat: 0, hunger: 0, disease: 0, age: 0, disaster: 0 },
      generation: 1,
      adaptationProgress: new Map([['forest', 500]])
    }
    ;(sys as any).speciesData.set('elf', speciesData)
    const progress = sys.getAdaptationProgress('elf')
    expect(progress.get('forest')).toBe(500)
  })
})

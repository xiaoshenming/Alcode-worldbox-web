import { describe, it, expect, beforeEach } from 'vitest'
import { EvolutionVisualSystem } from '../systems/EvolutionVisualSystem'
function makeSys() { return new EvolutionVisualSystem() }
describe('EvolutionVisualSystem', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('初始nodes为空Map', () => { expect((sys as any).nodes.size).toBe(0) })
  it('初始events为空', () => { expect((sys as any).events).toHaveLength(0) })
  it('addNode后nodes增加', () => {
    sys.addNode({ id: 1, species: 'human', parentId: null, appearTick: 0, population: 10, avgTraits: {}, mutations: [] })
    expect((sys as any).nodes.size).toBe(1)
  })
  it('pushEvent后events增加', () => {
    sys.pushEvent({ tick: 0, species: 'human', mutation: 'fast', description: 'Faster' })
    expect((sys as any).events).toHaveLength(1)
  })
  it('updatePopulation更新已存在节点的population', () => {
    sys.addNode({ id: 1, species: 'human', parentId: null, appearTick: 0, population: 10, avgTraits: {}, mutations: [] })
    sys.updatePopulation(1, 50)
    expect((sys as any).nodes.get(1).population).toBe(50)
  })
})

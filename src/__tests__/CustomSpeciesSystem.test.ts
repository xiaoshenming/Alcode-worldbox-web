import { describe, it, expect, beforeEach } from 'vitest'
import { CustomSpeciesSystem } from '../systems/CustomSpeciesSystem'
function makeSys() { return new CustomSpeciesSystem() }
function makeSpeciesConfig() {
  return {
    name: 'TestBeast', color: '#ff0000',
    baseHealth: 100, baseSpeed: 1, baseDamage: 10,
    lifespan: 500, reproductionRate: 0.01,
    diet: 'herbivore' as const, size: 'medium' as const, aquatic: false
  }
}
describe('CustomSpeciesSystem', () => {
  let sys: CustomSpeciesSystem
  beforeEach(() => { sys = makeSys() })
  it('getAllSpecies初始为空', () => { expect(sys.getAllSpecies()).toHaveLength(0) })
  it('getSpecies未知id返回null', () => { expect(sys.getSpecies('nonexistent')).toBeNull() })
  it('createSpecies 返回新id', () => {
    const id = sys.createSpecies(makeSpeciesConfig())
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
  it('createSpecies 后 getAllSpecies 增加', () => {
    sys.createSpecies(makeSpeciesConfig())
    expect(sys.getAllSpecies()).toHaveLength(1)
  })
  it('createSpecies 后 getSpecies 返回配置', () => {
    const id = sys.createSpecies(makeSpeciesConfig())
    const cfg = sys.getSpecies(id)
    expect(cfg).not.toBeNull()
    expect(cfg!.name).toBe('TestBeast')
  })
  it('isPanelOpen 初始为false', () => { expect(sys.isPanelOpen()).toBe(false) })
})

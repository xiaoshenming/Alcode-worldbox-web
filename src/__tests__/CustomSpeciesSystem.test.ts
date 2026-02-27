import { describe, it, expect, beforeEach } from 'vitest'
import { CustomSpeciesSystem } from '../systems/CustomSpeciesSystem'
function makeSys() { return new CustomSpeciesSystem() }
describe('CustomSpeciesSystem', () => {
  let sys: CustomSpeciesSystem
  beforeEach(() => { sys = makeSys() })
  it('getAllSpecies初始为空', () => { expect(sys.getAllSpecies()).toHaveLength(0) })
  it('getSpecies未知id返回null', () => { expect(sys.getSpecies('nonexistent')).toBeNull() })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { MapGenSystem } from '../systems/MapGenSystem'
function makeSys() { return new MapGenSystem() }
describe('MapGenSystem', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  it('getRiverCount初始为0', () => { expect(sys.getRiverCount()).toBe(0) })
  it('getClusterCount初始为0', () => { expect(sys.getClusterCount()).toBe(0) })
})

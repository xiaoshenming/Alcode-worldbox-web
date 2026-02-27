import { describe, it, expect, beforeEach } from 'vitest'
import { AutoSaveSystem } from '../systems/AutoSaveSystem'
function makeSys() { return new AutoSaveSystem() }
describe('AutoSaveSystem', () => {
  let sys: AutoSaveSystem
  beforeEach(() => { sys = makeSys() })
  it('getInterval返回正数', () => { expect(sys.getInterval()).toBeGreaterThan(0) })
  it('getLastSaveTime初始为0', () => { expect(sys.getLastSaveTime()).toBe(0) })
  it('getInterval默认值合理（大于100ticks）', () => { expect(sys.getInterval()).toBeGreaterThan(100) })
})

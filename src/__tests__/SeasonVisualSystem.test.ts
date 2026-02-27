import { describe, it, expect, beforeEach } from 'vitest'
import { SeasonVisualSystem } from '../systems/SeasonVisualSystem'
function makeSys() { return new SeasonVisualSystem() }
describe('SeasonVisualSystem', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('初始particles为数组', () => { expect(Array.isArray((sys as any).particles)).toBe(true) })
})

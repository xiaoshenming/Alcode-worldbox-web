import { describe, it, expect, beforeEach } from 'vitest'
import { DayNightRenderer } from '../systems/DayNightRenderer'
function makeSys() { return new DayNightRenderer() }
describe('DayNightRenderer', () => {
  let sys: DayNightRenderer
  beforeEach(() => { sys = makeSys() })
  it('初始cachedIsDay为true', () => { expect((sys as any).cachedIsDay).toBe(true) })
})

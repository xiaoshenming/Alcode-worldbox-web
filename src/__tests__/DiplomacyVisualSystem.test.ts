import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomacyVisualSystem } from '../systems/DiplomacyVisualSystem'
function makeSys() { return new DiplomacyVisualSystem() }
describe('DiplomacyVisualSystem', () => {
  let sys: DiplomacyVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('初始civs为空', () => { expect((sys as any).civs).toHaveLength(0) })
  it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
})

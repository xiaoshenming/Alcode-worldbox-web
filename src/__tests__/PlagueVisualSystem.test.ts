import { describe, it, expect, beforeEach } from 'vitest'
import { PlagueVisualSystem } from '../systems/PlagueVisualSystem'
function makeSys() { return new PlagueVisualSystem() }
describe('PlagueVisualSystem', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('初始zones为空', () => { expect((sys as any).zones).toHaveLength(0) })
  it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
})

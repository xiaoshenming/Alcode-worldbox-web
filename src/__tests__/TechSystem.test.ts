import { describe, it, expect, beforeEach } from 'vitest'
import { TechSystem } from '../systems/TechSystem'
function makeSys() { return new TechSystem() }
describe('TechSystem', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  it('初始tickCounter为0', () => { expect((sys as any).tickCounter).toBe(0) })
})

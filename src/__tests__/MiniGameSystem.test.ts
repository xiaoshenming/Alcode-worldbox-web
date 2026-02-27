import { describe, it, expect, beforeEach } from 'vitest'
import { MiniGameSystem } from '../systems/MiniGameSystem'
function makeSys() { return new MiniGameSystem() }
describe('MiniGameSystem', () => {
  let sys: MiniGameSystem
  beforeEach(() => { sys = makeSys() })
  it('getHistory初始为空', () => { expect(sys.getHistory()).toHaveLength(0) })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { SiegeWarfareSystem } from '../systems/SiegeWarfareSystem'
function makeSys() { return new SiegeWarfareSystem() }
describe('SiegeWarfareSystem', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveSieges初始为空', () => { expect(sys.getActiveSieges()).toHaveLength(0) })
  it('getSiegeAt无围攻时返回undefined', () => { expect(sys.getSiegeAt(0, 0)).toBeUndefined() })
})

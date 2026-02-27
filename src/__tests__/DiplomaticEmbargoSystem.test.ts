import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEmbargoSystem } from '../systems/DiplomaticEmbargoSystem'
function makeSys() { return new DiplomaticEmbargoSystem() }
describe('DiplomaticEmbargoSystem', () => {
  let sys: DiplomaticEmbargoSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getEmbargoes为空', () => { expect(sys.getEmbargoes()).toHaveLength(0) })
  it('注入后getEmbargoes返回数据', () => {
    ;(sys as any).embargoes.push({ id: 1 })
    expect(sys.getEmbargoes()).toHaveLength(1)
  })
})

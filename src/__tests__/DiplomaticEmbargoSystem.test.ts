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
  it('getEmbargoes返回数组', () => { expect(Array.isArray(sys.getEmbargoes())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

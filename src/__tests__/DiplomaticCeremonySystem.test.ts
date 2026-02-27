import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCeremonySystem } from '../systems/DiplomaticCeremonySystem'
function makeSys() { return new DiplomaticCeremonySystem() }
describe('DiplomaticCeremonySystem', () => {
  let sys: DiplomaticCeremonySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCeremonies为空', () => { expect(sys.getCeremonies()).toHaveLength(0) })
  it('注入后getCeremonies返回数据', () => {
    ;(sys as any).ceremonies.push({ id: 1 })
    expect(sys.getCeremonies()).toHaveLength(1)
  })
  it('getCeremonies返回数组', () => { expect(Array.isArray(sys.getCeremonies())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

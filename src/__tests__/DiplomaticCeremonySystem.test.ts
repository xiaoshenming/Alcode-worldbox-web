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
})

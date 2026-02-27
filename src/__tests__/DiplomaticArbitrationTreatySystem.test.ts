import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitrationTreatySystem } from '../systems/DiplomaticArbitrationTreatySystem'
function makeSys() { return new DiplomaticArbitrationTreatySystem() }
describe('DiplomaticArbitrationTreatySystem', () => {
  let sys: DiplomaticArbitrationTreatySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect(sys.getTreaties()).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1 })
    expect(sys.getTreaties()).toHaveLength(1)
  })
})

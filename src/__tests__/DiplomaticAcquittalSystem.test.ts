import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAcquittalSystem } from '../systems/DiplomaticAcquittalSystem'
function makeSys() { return new DiplomaticAcquittalSystem() }
describe('DiplomaticAcquittalSystem', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getVerdicts为空', () => { expect(sys.getVerdicts()).toHaveLength(0) })
  it('注入后getVerdicts返回数据', () => {
    ;(sys as any).verdicts.push({ id: 1 })
    expect(sys.getVerdicts()).toHaveLength(1)
  })
})

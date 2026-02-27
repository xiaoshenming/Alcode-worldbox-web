import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticTariffSystem } from '../systems/DiplomaticTariffSystem'
function makeSys() { return new DiplomaticTariffSystem() }
describe('DiplomaticTariffSystem', () => {
  let sys: DiplomaticTariffSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTariffs为空', () => { expect(sys.getTariffs()).toHaveLength(0) })
  it('注入后getTariffs返回数据', () => {
    ;(sys as any).tariffs.push({ id: 1 })
    expect(sys.getTariffs()).toHaveLength(1)
  })
})

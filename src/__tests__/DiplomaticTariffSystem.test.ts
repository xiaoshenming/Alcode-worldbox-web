import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticTariffSystem } from '../systems/DiplomaticTariffSystem'
function makeSys() { return new DiplomaticTariffSystem() }
describe('DiplomaticTariffSystem', () => {
  let sys: DiplomaticTariffSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTariffs为空', () => { expect((sys as any).tariffs).toHaveLength(0) })
  it('注入后getTariffs返回数据', () => {
    ;(sys as any).tariffs.push({ id: 1 })
    expect((sys as any).tariffs).toHaveLength(1)
  })
  it('getTariffs返回数组', () => { expect(Array.isArray((sys as any).tariffs)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

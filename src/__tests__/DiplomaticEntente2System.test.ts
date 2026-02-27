import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEntente2System } from '../systems/DiplomaticEntente2System'
function makeSys() { return new DiplomaticEntente2System() }
describe('DiplomaticEntente2System', () => {
  let sys: DiplomaticEntente2System
  beforeEach(() => { sys = makeSys() })
  it('初始getEntentes为空', () => { expect(sys.getEntentes()).toHaveLength(0) })
  it('注入后getEntentes返回数据', () => {
    ;(sys as any).ententes.push({ id: 1 })
    expect(sys.getEntentes()).toHaveLength(1)
  })
})

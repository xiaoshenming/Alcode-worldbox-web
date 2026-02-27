import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticTradeGuildSystem } from '../systems/DiplomaticTradeGuildSystem'
function makeSys() { return new DiplomaticTradeGuildSystem() }
describe('DiplomaticTradeGuildSystem', () => {
  let sys: DiplomaticTradeGuildSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGuilds为空', () => { expect(sys.getGuilds()).toHaveLength(0) })
  it('注入后getGuilds返回数据', () => {
    ;(sys as any).guilds.push({ id: 1 })
    expect(sys.getGuilds()).toHaveLength(1)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticTradeGuildSystem } from '../systems/DiplomaticTradeGuildSystem'
function makeSys() { return new DiplomaticTradeGuildSystem() }
describe('DiplomaticTradeGuildSystem', () => {
  let sys: DiplomaticTradeGuildSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGuilds为空', () => { expect((sys as any).guilds).toHaveLength(0) })
  it('注入后getGuilds返回数据', () => {
    ;(sys as any).guilds.push({ id: 1 })
    expect((sys as any).guilds).toHaveLength(1)
  })
  it('getGuilds返回数组', () => { expect(Array.isArray((sys as any).guilds)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})

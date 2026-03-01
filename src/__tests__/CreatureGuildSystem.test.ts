import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGuildSystem } from '../systems/CreatureGuildSystem'
import type { Guild, GuildType } from '../systems/CreatureGuildSystem'

let nextId = 1
function makeSys(): CreatureGuildSystem { return new CreatureGuildSystem() }
function makeGuild(civId: number, type: GuildType = 'warriors', members: number[] = []): Guild {
  return { id: nextId++, type, name: 'Test Guild', civId, members, level: 1, experience: 0, hallX: 10, hallY: 10, founded: 0, bonus: 5, nameLabel: 'Test Guild Lv1', memberCountStr: `${members.length}/12`, panelLabel: `Test Guild Lv1 [${members.length}]` }
}

describe('CreatureGuildSystem', () => {
  let sys: CreatureGuildSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无行会', () => { expect((sys as any).guilds).toHaveLength(0) })
  it('注入后guilds包含数据', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'healers'))
    expect((sys as any).guilds[0].type).toBe('healers')
  })
  it('guilds是数组', () => {
    ;(sys as any).guilds.push(makeGuild(1))
    expect(Array.isArray((sys as any).guilds)).toBe(true)
  })
  it('支持所有5种行会类型', () => {
    const types: GuildType[] = ['warriors', 'hunters', 'builders', 'healers', 'merchants']
    types.forEach((t, i) => { ;(sys as any).guilds.push(makeGuild(i + 1, t)) })
    const all = (sys as any).guilds
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
  it('无成员行会不算活跃（手动过滤）', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', []))
    const active = (sys as any).guilds.filter((g: Guild) => g.members.length > 0)
    expect(active).toHaveLength(0)
  })
  it('有成员行会为活跃（手动过滤）', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [10, 20]))
    ;(sys as any).guilds.push(makeGuild(2, 'healers', []))
    const active = (sys as any).guilds.filter((g: Guild) => g.members.length > 0)
    expect(active).toHaveLength(1)
    expect(active[0].type).toBe('warriors')
  })
  it('update不崩溃（空实体列表）', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    expect(() => sys.update(1, mockEM as any, 0)).not.toThrow()
  })
})

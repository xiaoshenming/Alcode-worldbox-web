import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGuildSystem } from '../systems/CreatureGuildSystem'
import type { Guild, GuildType } from '../systems/CreatureGuildSystem'

let nextId = 1
function makeSys(): CreatureGuildSystem { return new CreatureGuildSystem() }
function makeGuild(civId: number, type: GuildType = 'warriors', members: number[] = []): Guild {
  return { id: nextId++, type, name: 'Test Guild', civId, members, level: 1, experience: 0, hallX: 10, hallY: 10, founded: 0, bonus: 5, nameLabel: 'Test Guild Lv1', memberCountStr: `${members.length}/12` }
}

describe('CreatureGuildSystem.getGuilds', () => {
  let sys: CreatureGuildSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无行会', () => { expect(sys.getGuilds()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'healers'))
    expect(sys.getGuilds()[0].type).toBe('healers')
  })
  it('返回内部引用', () => {
    ;(sys as any).guilds.push(makeGuild(1))
    expect(sys.getGuilds()).toBe((sys as any).guilds)
  })
  it('支持所有 5 种行会类型', () => {
    const types: GuildType[] = ['warriors', 'hunters', 'builders', 'healers', 'merchants']
    types.forEach((t, i) => { ;(sys as any).guilds.push(makeGuild(i + 1, t)) })
    const all = sys.getGuilds()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureGuildSystem.getActiveGuilds', () => {
  let sys: CreatureGuildSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无成员行会不算活跃', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', []))
    expect(sys.getActiveGuilds()).toHaveLength(0)
  })
  it('有成员行会为活跃', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [10, 20]))
    ;(sys as any).guilds.push(makeGuild(2, 'healers', []))
    expect(sys.getActiveGuilds()).toHaveLength(1)
    expect(sys.getActiveGuilds()[0].type).toBe('warriors')
  })
})

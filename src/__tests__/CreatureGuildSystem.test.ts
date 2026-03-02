import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGuildSystem } from '../systems/CreatureGuildSystem'
import type { Guild, GuildType } from '../systems/CreatureGuildSystem'

let nextId = 1

function makeSys(): CreatureGuildSystem { return new CreatureGuildSystem() }

function makeGuild(
  civId: number,
  type: GuildType = 'warriors',
  members: number[] = [],
  overrides: Partial<Guild> = {}
): Guild {
  return {
    id: nextId++,
    type,
    name: 'Test Guild',
    civId,
    members: [...members],
    level: 1,
    experience: 0,
    hallX: 10,
    hallY: 10,
    founded: 0,
    bonus: 5,
    nameLabel: 'Test Guild Lv1',
    memberCountStr: `${members.length}/12`,
    panelLabel: `Test Guild Lv1 [${members.length}]`,
    ...overrides,
  }
}

function makeMockEM(entities: number[] = [], componentMap: Record<number, Record<string, unknown>> = {}) {
  return {
    getComponent: (id: number, type: string) => componentMap[id]?.[type],
    getEntitiesWithComponents: (..._types: string[]) => entities,
    hasComponent: (id: number, type: string) => Boolean(componentMap[id]?.[type]),
  }
}

describe('CreatureGuildSystem — 初始状态', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 guilds 为空数组', () => {
    expect((sys as any).guilds).toHaveLength(0)
  })

  it('初始 _entityToGuild Map 为空', () => {
    expect((sys as any)._entityToGuild.size).toBe(0)
  })

  it('初始 _activeGuildsBuf 为空数组', () => {
    expect((sys as any)._activeGuildsBuf).toHaveLength(0)
  })

  it('初始 _unguildedBuf 为空数组', () => {
    expect((sys as any)._unguildedBuf).toHaveLength(0)
  })

  it('初始 _prevActiveCount 为 -1', () => {
    expect((sys as any)._prevActiveCount).toBe(-1)
  })

  it('初始 _headerStr 含 "Guilds (0)"', () => {
    expect((sys as any)._headerStr).toContain('0')
  })

  it('初始 _lastZoom 为 -1', () => {
    expect((sys as any)._lastZoom).toBe(-1)
  })
})

describe('CreatureGuildSystem — Guild 数据结构', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 guild 后 guilds 数组长度为 1', () => {
    ;(sys as any).guilds.push(makeGuild(1))
    expect((sys as any).guilds).toHaveLength(1)
  })

  it('guild.type 正确存储', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'healers'))
    expect((sys as any).guilds[0].type).toBe('healers')
  })

  it('guild.civId 正确存储', () => {
    ;(sys as any).guilds.push(makeGuild(42, 'hunters'))
    expect((sys as any).guilds[0].civId).toBe(42)
  })

  it('guild.level 初始为 1', () => {
    ;(sys as any).guilds.push(makeGuild(1))
    expect((sys as any).guilds[0].level).toBe(1)
  })

  it('guild.experience 初始为 0', () => {
    ;(sys as any).guilds.push(makeGuild(1))
    expect((sys as any).guilds[0].experience).toBe(0)
  })

  it('guild.bonus 初始为 5', () => {
    ;(sys as any).guilds.push(makeGuild(1))
    expect((sys as any).guilds[0].bonus).toBe(5)
  })

  it('guild.members 是数组', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [10, 20]))
    expect(Array.isArray((sys as any).guilds[0].members)).toBe(true)
  })

  it('guild.nameLabel 格式正确', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [], { nameLabel: 'Test Guild Lv1' }))
    expect((sys as any).guilds[0].nameLabel).toBe('Test Guild Lv1')
  })

  it('guild.memberCountStr 格式正确', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1, 2, 3]))
    expect((sys as any).guilds[0].memberCountStr).toBe('3/12')
  })

  it('guild.panelLabel 格式正确', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1, 2]))
    expect((sys as any).guilds[0].panelLabel).toContain('2')
  })
})

describe('CreatureGuildSystem — GuildType 枚举', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('支持 warriors 类型', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors'))
    expect((sys as any).guilds[0].type).toBe('warriors')
  })

  it('支持 hunters 类型', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'hunters'))
    expect((sys as any).guilds[0].type).toBe('hunters')
  })

  it('支持 builders 类型', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'builders'))
    expect((sys as any).guilds[0].type).toBe('builders')
  })

  it('支持 healers 类型', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'healers'))
    expect((sys as any).guilds[0].type).toBe('healers')
  })

  it('支持 merchants 类型', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'merchants'))
    expect((sys as any).guilds[0].type).toBe('merchants')
  })

  it('5种行会类型全部可在同一系统中共存', () => {
    const types: GuildType[] = ['warriors', 'hunters', 'builders', 'healers', 'merchants']
    types.forEach((t, i) => { ;(sys as any).guilds.push(makeGuild(i + 1, t)) })
    const stored = (sys as any).guilds.map((g: Guild) => g.type)
    expect(stored).toEqual(types)
  })
})

describe('CreatureGuildSystem — getActiveGuilds 过滤逻辑', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无成员的 guild 不进入活跃列表', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', []))
    const active = (sys as any).guilds.filter((g: Guild) => g.members.length > 0)
    expect(active).toHaveLength(0)
  })

  it('有成员的 guild 进入活跃列表', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [10, 20]))
    const active = (sys as any).guilds.filter((g: Guild) => g.members.length > 0)
    expect(active).toHaveLength(1)
  })

  it('混合 guild 时只有有成员的进入活跃列表', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [10, 20]))
    ;(sys as any).guilds.push(makeGuild(2, 'healers', []))
    ;(sys as any).guilds.push(makeGuild(3, 'hunters', [30]))
    const active = (sys as any).guilds.filter((g: Guild) => g.members.length > 0)
    expect(active).toHaveLength(2)
  })

  it('getActiveGuilds 内部方法返回正确数量', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    ;(sys as any).guilds.push(makeGuild(2, 'healers', []))
    const active = (sys as any).getActiveGuilds()
    expect(active).toHaveLength(1)
  })

  it('getActiveGuilds 在无 guild 时返回空', () => {
    const active = (sys as any).getActiveGuilds()
    expect(active).toHaveLength(0)
  })

  it('getActiveGuilds 返回内部缓冲区引用（同一对象）', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    const a = (sys as any).getActiveGuilds()
    const b = (sys as any)._activeGuildsBuf
    expect(a).toBe(b)
  })
})

describe('CreatureGuildSystem — _entityToGuild 索引', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('手动注入 _entityToGuild 后 getGuildForEntity 可查询', () => {
    const guild = makeGuild(1, 'warriors', [5])
    ;(sys as any).guilds.push(guild)
    ;(sys as any)._entityToGuild.set(5, guild)
    const found = (sys as any).getGuildForEntity(5)
    expect(found).toBe(guild)
  })

  it('未注册实体返回 undefined', () => {
    expect((sys as any).getGuildForEntity(999)).toBeUndefined()
  })

  it('_entityToGuild Map 初始大小为 0', () => {
    expect((sys as any)._entityToGuild.size).toBe(0)
  })

  it('注入多个实体到同一 guild', () => {
    const guild = makeGuild(1, 'warriors', [1, 2, 3])
    ;(sys as any).guilds.push(guild)
    ;(sys as any)._entityToGuild.set(1, guild)
    ;(sys as any)._entityToGuild.set(2, guild)
    ;(sys as any)._entityToGuild.set(3, guild)
    expect((sys as any)._entityToGuild.size).toBe(3)
    expect((sys as any).getGuildForEntity(2)).toBe(guild)
  })

  it('删除实体后可从 Map 移除', () => {
    const guild = makeGuild(1, 'warriors', [5])
    ;(sys as any)._entityToGuild.set(5, guild)
    ;(sys as any)._entityToGuild.delete(5)
    expect((sys as any)._entityToGuild.size).toBe(0)
  })
})

describe('CreatureGuildSystem — update() 行为', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空实体列表不崩溃', () => {
    const em = makeMockEM()
    expect(() => sys.update(1, em as any, 0)).not.toThrow()
  })

  it('连续多次 update 不崩溃', () => {
    const em = makeMockEM()
    expect(() => {
      for (let i = 0; i < 10; i++) sys.update(1, em as any, i * 100)
    }).not.toThrow()
  })

  it('update 清除已死亡（无 position 组件）的成员', () => {
    const guild = makeGuild(1, 'warriors', [10, 20])
    ;(sys as any).guilds.push(guild)
    ;(sys as any)._entityToGuild.set(10, guild)
    ;(sys as any)._entityToGuild.set(20, guild)
    // entity 10 没有 position 组件，entity 20 有
    const em = makeMockEM([10, 20], { 20: { position: { type: 'position', x: 5, y: 5 } } })
    sys.update(1, em as any, 0)
    expect(guild.members).toHaveLength(1)
    expect(guild.members[0]).toBe(20)
  })

  it('死亡成员被移除后 memberCountStr 更新', () => {
    const guild = makeGuild(1, 'warriors', [10, 20])
    ;(sys as any).guilds.push(guild)
    ;(sys as any)._entityToGuild.set(10, guild)
    ;(sys as any)._entityToGuild.set(20, guild)
    const em = makeMockEM([10, 20], { 20: { position: { type: 'position', x: 5, y: 5 } } })
    sys.update(1, em as any, 0)
    expect(guild.memberCountStr).toBe('1/12')
  })

  it('死亡成员被移除后 panelLabel 更新', () => {
    const guild = makeGuild(1, 'warriors', [10, 20])
    ;(sys as any).guilds.push(guild)
    ;(sys as any)._entityToGuild.set(10, guild)
    ;(sys as any)._entityToGuild.set(20, guild)
    const em = makeMockEM([10, 20], { 20: { position: { type: 'position', x: 5, y: 5 } } })
    sys.update(1, em as any, 0)
    expect(guild.panelLabel).toContain('[1]')
  })

  it('死亡成员从 _entityToGuild 中删除', () => {
    const guild = makeGuild(1, 'warriors', [10, 20])
    ;(sys as any).guilds.push(guild)
    ;(sys as any)._entityToGuild.set(10, guild)
    ;(sys as any)._entityToGuild.set(20, guild)
    const em = makeMockEM([10, 20], { 20: { position: { type: 'position', x: 5, y: 5 } } })
    sys.update(1, em as any, 0)
    expect((sys as any)._entityToGuild.has(10)).toBe(false)
    expect((sys as any)._entityToGuild.has(20)).toBe(true)
  })

  it('高等级经验满后升级', () => {
    const guild = makeGuild(1, 'warriors', [1, 2, 3, 4, 5], { level: 1, experience: 96, bonus: 5 })
    ;(sys as any).guilds.push(guild)
    ;(sys as any).nextLevelTick = 0
    // 提供 position 组件防止成员被清除
    const pos = { type: 'position', x: 5, y: 5 }
    const em = makeMockEM([1, 2, 3, 4, 5], {
      1: { position: pos }, 2: { position: pos },
      3: { position: pos }, 4: { position: pos }, 5: { position: pos },
    })
    sys.update(1, em as any, 1)
    // experience: 96 + 5(members) = 101 >= 100 → 升级
    expect(guild.level).toBe(2)
    expect(guild.bonus).toBe(10)
  })

  it('满级(5)不再升级', () => {
    const guild = makeGuild(1, 'warriors', [1, 2, 3], { level: 5, experience: 200, bonus: 25 })
    ;(sys as any).guilds.push(guild)
    ;(sys as any).nextLevelTick = 0
    const pos = { type: 'position', x: 5, y: 5 }
    const em = makeMockEM([1, 2, 3], { 1: { position: pos }, 2: { position: pos }, 3: { position: pos } })
    sys.update(1, em as any, 1)
    expect(guild.level).toBe(5)
  })

  it('空成员 guild 不获得经验', () => {
    const guild = makeGuild(1, 'warriors', [], { level: 1, experience: 0 })
    ;(sys as any).guilds.push(guild)
    ;(sys as any).nextLevelTick = 0
    const em = makeMockEM()
    sys.update(1, em as any, 1)
    expect(guild.experience).toBe(0)
  })

  it('有成员 guild 获得经验等于成员数', () => {
    const guild = makeGuild(1, 'warriors', [1, 2, 3], { level: 1, experience: 50 })
    ;(sys as any).guilds.push(guild)
    ;(sys as any).nextLevelTick = 0
    const pos = { type: 'position', x: 5, y: 5 }
    const em = makeMockEM([1, 2, 3], { 1: { position: pos }, 2: { position: pos }, 3: { position: pos } })
    sys.update(1, em as any, 1)
    // experience: 50 + 3 = 53 (53 < 100，不升级)
    expect(guild.experience).toBe(53)
  })
})

describe('CreatureGuildSystem — 多 Guild 共存', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('可同时持有多个 guild', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    ;(sys as any).guilds.push(makeGuild(2, 'healers', [2]))
    ;(sys as any).guilds.push(makeGuild(3, 'builders', [3]))
    expect((sys as any).guilds).toHaveLength(3)
  })

  it('按文明 ID 过滤 guild', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    ;(sys as any).guilds.push(makeGuild(2, 'hunters', [2]))
    ;(sys as any).guilds.push(makeGuild(1, 'healers', [3]))
    const civ1 = (sys as any).guilds.filter((g: Guild) => g.civId === 1)
    expect(civ1).toHaveLength(2)
  })

  it('按类型过滤 guild', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    ;(sys as any).guilds.push(makeGuild(2, 'warriors', [2]))
    ;(sys as any).guilds.push(makeGuild(3, 'healers', [3]))
    const warriors = (sys as any).guilds.filter((g: Guild) => g.type === 'warriors')
    expect(warriors).toHaveLength(2)
  })

  it('各 guild 成员列表相互独立', () => {
    const g1 = makeGuild(1, 'warriors', [1, 2])
    const g2 = makeGuild(2, 'hunters', [3, 4])
    ;(sys as any).guilds.push(g1, g2)
    g1.members.push(99)
    expect(g2.members).not.toContain(99)
  })
})

describe('CreatureGuildSystem — render 不崩溃', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('render 在无 guild 时不崩溃', () => {
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    expect(() => sys.render(ctx as any, 0, 0, 1)).not.toThrow()
  })

  it('render 在有无成员 guild 时不崩溃', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', []))
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    expect(() => sys.render(ctx as any, 0, 0, 1)).not.toThrow()
  })

  it('render 在有成员 guild 时调用 fillRect', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1], { hallX: 50, hallY: 50 }))
    const fillRect = vi.fn()
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: '',
      fillRect,
      fillText: vi.fn(),
    }
    sys.render(ctx as any, 0, 0, 1)
    expect(fillRect).toHaveBeenCalled()
  })

  it('zoom 变化时更新 _nameFont', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1], { hallX: 50, hallY: 50 }))
    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    sys.render(ctx as any, 0, 0, 2)
    expect((sys as any)._lastZoom).toBe(2)
    expect((sys as any)._nameFont).toContain('px')
  })
})

describe('CreatureGuildSystem — renderPanel 不崩溃', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('renderPanel 在无活跃 guild 时不崩溃', () => {
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    expect(() => sys.renderPanel(ctx as any, 0, 0)).not.toThrow()
  })

  it('renderPanel 在有活跃 guild 时调用 fillText', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    const fillText = vi.fn()
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText,
    }
    sys.renderPanel(ctx as any, 0, 0)
    expect(fillText).toHaveBeenCalled()
  })

  it('renderPanel 在有活跃 guild 时调用 fillRect', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'merchants', [1, 2]))
    const fillRect = vi.fn()
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect,
      fillText: vi.fn(),
    }
    sys.renderPanel(ctx as any, 10, 20)
    expect(fillRect).toHaveBeenCalled()
  })

  it('renderPanel 更新 _prevActiveCount', () => {
    ;(sys as any).guilds.push(makeGuild(1, 'warriors', [1]))
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
    }
    sys.renderPanel(ctx as any, 0, 0)
    expect((sys as any)._prevActiveCount).toBe(1)
  })
})

describe('CreatureGuildSystem — bonus 和 level 关系', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('level 1 guild bonus 应为 5', () => {
    const g = makeGuild(1, 'warriors', [], { level: 1, bonus: 5 })
    expect(g.bonus).toBe(5)
  })

  it('level 2 guild bonus 应为 10', () => {
    const g = makeGuild(1, 'warriors', [], { level: 2, bonus: 10 })
    expect(g.bonus).toBe(10)
  })

  it('level 3 guild bonus 应为 15', () => {
    const g = makeGuild(1, 'warriors', [], { level: 3, bonus: 15 })
    expect(g.bonus).toBe(15)
  })

  it('level 5 guild bonus 应为 25', () => {
    const g = makeGuild(1, 'warriors', [], { level: 5, bonus: 25 })
    expect(g.bonus).toBe(25)
  })

  it('升级后 nameLabel 含新等级', () => {
    const guild = makeGuild(1, 'warriors', [1, 2, 3], { level: 1, experience: 97 })
    ;(sys as any).guilds.push(guild)
    ;(sys as any).nextLevelTick = 0
    const pos = { type: 'position', x: 5, y: 5 }
    const em = makeMockEM([1, 2, 3], { 1: { position: pos }, 2: { position: pos }, 3: { position: pos } })
    sys.update(1, em as any, 1)
    // experience: 97+3=100 >= 100 → 升级到 Lv2
    expect(guild.nameLabel).toContain('Lv2')
  })

  it('升级后 panelLabel 含新等级', () => {
    const guild = makeGuild(1, 'warriors', [1, 2, 3], { level: 1, experience: 97 })
    ;(sys as any).guilds.push(guild)
    ;(sys as any).nextLevelTick = 0
    const pos = { type: 'position', x: 5, y: 5 }
    const em = makeMockEM([1, 2, 3], { 1: { position: pos }, 2: { position: pos }, 3: { position: pos } })
    sys.update(1, em as any, 1)
    expect(guild.panelLabel).toContain('Lv2')
  })
})

describe('CreatureGuildSystem — 成员管理边界', () => {
  let sys: CreatureGuildSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('单成员 guild 成员数为 1', () => {
    const g = makeGuild(1, 'warriors', [99])
    expect(g.members).toHaveLength(1)
  })

  it('12 成员 guild 达到最大人数', () => {
    const members = Array.from({ length: 12 }, (_, i) => i + 1)
    const g = makeGuild(1, 'warriors', members)
    expect(g.members).toHaveLength(12)
  })

  it('memberCountStr 格式为 "x/12"', () => {
    const g = makeGuild(1, 'warriors', [1, 2, 3])
    expect(g.memberCountStr).toMatch(/^\d+\/12$/)
  })

  it('founded 字段记录 tick', () => {
    const g = makeGuild(1, 'warriors', [], { founded: 12345 })
    expect(g.founded).toBe(12345)
  })

  it('hallX 和 hallY 是数字', () => {
    const g = makeGuild(1, 'warriors', [], { hallX: 77, hallY: 88 })
    expect(g.hallX).toBe(77)
    expect(g.hallY).toBe(88)
  })
})

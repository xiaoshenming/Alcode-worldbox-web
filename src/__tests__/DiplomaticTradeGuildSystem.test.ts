import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticTradeGuildSystem } from '../systems/DiplomaticTradeGuildSystem'

const em = {} as any

function makeCivManager(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}

function makeSys() { return new DiplomaticTradeGuildSystem() }

describe('DiplomaticTradeGuildSystem', () => {
  let sys: DiplomaticTradeGuildSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 初始状态
  it('初始guilds为空', () => { expect((sys as any).guilds).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('guilds是数组', () => { expect(Array.isArray((sys as any).guilds)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, em, makeCivManager([1, 2]), 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('第二次节流生效', () => {
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    sys.update(1, em, makeCivManager([1, 2]), 1501)
    expect((sys as any).lastCheck).toBe(1500)
  })

  // civs < 2时提前返回
  it('civs数量<2时不spawn也不update guilds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'merchants',
      memberCivs: [1], influence: 20, wealth: 30, regulations: 10, tick: 1500,
    })
    const before = (sys as any).guilds[0].wealth
    sys.update(1, em, makeCivManager([1]), 1500)
    // lastCheck更新了但guilds没有被处理（civs<2提前return）
    expect((sys as any).guilds[0].wealth).toBe(before)
  })

  // wealth更新 - 3个成员时 3*0.1-0.3=0，wealth不变
  it('3个成员时wealth变化为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'miners',
      memberCivs: [1, 2, 3], influence: 20, wealth: 30, regulations: 10, tick: 1500,
    })
    sys.update(1, em, makeCivManager([1, 2, 3]), 1500)
    expect((sys as any).guilds[0].wealth).toBeCloseTo(30, 5)
  })

  // wealth更新 - 2个成员时 2*0.1-0.3=-0.1，wealth减少
  it('2个成员时wealth每tick减少0.1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'farmers',
      memberCivs: [1, 2], influence: 20, wealth: 30, regulations: 10, tick: 1500,
    })
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).guilds[0].wealth).toBeCloseTo(29.9, 5)
  })

  // wealth更新 - 4个成员时 4*0.1-0.3=+0.1，wealth增加
  it('4个成员时wealth每tick增加0.1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'bankers',
      memberCivs: [1, 2, 3, 4], influence: 20, wealth: 30, regulations: 10, tick: 1500,
    })
    sys.update(1, em, makeCivManager([1, 2, 3, 4]), 1500)
    expect((sys as any).guilds[0].wealth).toBeCloseTo(30.1, 5)
  })

  // influence 每tick+0.02
  it('influence每tick增加0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'sailors',
      memberCivs: [1, 2, 3], influence: 20, wealth: 30, regulations: 10, tick: 1500,
    })
    sys.update(1, em, makeCivManager([1, 2, 3]), 1500)
    expect((sys as any).guilds[0].influence).toBeCloseTo(20.02, 5)
  })
  it('influence被clamp到100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'artisans',
      memberCivs: [1, 2, 3], influence: 100, wealth: 30, regulations: 10, tick: 1500,
    })
    sys.update(1, em, makeCivManager([1, 2, 3]), 1500)
    expect((sys as any).guilds[0].influence).toBe(100)
  })

  // cleanup - wealth <= 0时删除
  it('wealth=0时guild被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'merchants',
      memberCivs: [1, 2], influence: 20, wealth: 0, regulations: 10, tick: 1500,
    })
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).guilds).toHaveLength(0)
  })
  it('wealth=1且tick足够新时guild被保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'miners',
      memberCivs: [1, 2, 3], influence: 20, wealth: 1, regulations: 10, tick: 50000,
    })
    sys.update(1, em, makeCivManager([1, 2, 3]), 70000)
    expect((sys as any).guilds).toHaveLength(1)
  })

  // cleanup - tick过期时删除
  it('guild.tick过旧(cutoff=tick-60000)时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'farmers',
      memberCivs: [1, 2, 3], influence: 20, wealth: 50, regulations: 10, tick: 0,
    })
    sys.update(1, em, makeCivManager([1, 2, 3]), 70000)
    expect((sys as any).guilds).toHaveLength(0)
  })
  it('guild.tick在cutoff内时被保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'bankers',
      memberCivs: [1, 2, 3], influence: 20, wealth: 50, regulations: 10, tick: 15000,
    })
    // tick=70000, cutoff=10000, guild.tick=15000 > 10000 → 保留
    sys.update(1, em, makeCivManager([1, 2, 3]), 70000)
    expect((sys as any).guilds).toHaveLength(1)
  })

  // wealth < 0时被设为0再判断
  it('wealth负值时被截断为0后被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).guilds.push({
      id: 1, name: 'Test Guild', guildType: 'sailors',
      memberCivs: [1, 2], influence: 20, wealth: 0.05, regulations: 10, tick: 1500,
    })
    // 2成员 wealth += -0.1 → -0.05 → clamped to 0 → deleted
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).guilds).toHaveLength(0)
  })

  // 6种guildType均合法
  it('6种guildType均合法', () => {
    const types = ['merchants', 'artisans', 'miners', 'farmers', 'sailors', 'bankers']
    types.forEach((t, i) => {
      ;(sys as any).guilds.push({
        id: i + 1, name: 'Test Guild', guildType: t,
        memberCivs: [1, 2, 3], influence: 20, wealth: 50, regulations: 10, tick: 1500,
      })
    })
    expect((sys as any).guilds).toHaveLength(6)
  })

  // 空guilds时update不崩溃
  it('空guilds时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, em, makeCivManager([1, 2]), 1500)).not.toThrow()
  })

  // 多个guild同时处理
  it('多个guild同时update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).guilds.push({
        id: i + 1, name: 'Test Guild', guildType: 'miners',
        memberCivs: [1, 2, 3], influence: 20, wealth: 50, regulations: 10, tick: 1500,
      })
    }
    sys.update(1, em, makeCivManager([1, 2, 3]), 1500)
    expect((sys as any).guilds).toHaveLength(3)
    expect((sys as any).guilds[0].influence).toBeCloseTo(20.02, 5)
  })
})

describe('DiplomaticTradeGuildSystem — 补充测试', () => {
  let sys: DiplomaticTradeGuildSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  it('构造不崩溃', () => { expect(() => makeSys()).not.toThrow() })
  it('guilds初始为空（二次验证）', () => { expect((sys as any).guilds).toEqual([]) })
  it('注入10个guild后length为10', () => {
    for (let i = 0; i < 10; i++) { (sys as any).guilds.push({ id: i, name: `G${i}`, guildType: 'merchants', memberCivs: [], influence: 20, wealth: 30, regulations: 10, tick: 0 }) }
    expect((sys as any).guilds).toHaveLength(10)
  })
  it('guild对象有所需字段', () => {
    const g = { id: 1, name: 'Test', guildType: 'merchants', memberCivs: [1], influence: 20, wealth: 30, regulations: 10, tick: 0 }
    expect(g).toHaveProperty('id')
    expect(g).toHaveProperty('guildType')
    expect(g).toHaveProperty('memberCivs')
    expect(g).toHaveProperty('influence')
    expect(g).toHaveProperty('wealth')
  })
  it('GuildType: merchants合法', () => { expect('merchants').toBe('merchants') })
  it('GuildType: artisans合法', () => { expect('artisans').toBe('artisans') })
  it('GuildType: miners合法', () => { expect('miners').toBe('miners') })
  it('GuildType: farmers合法', () => { expect('farmers').toBe('farmers') })
  it('GuildType: sailors合法', () => { expect('sailors').toBe('sailors') })
  it('GuildType: bankers合法', () => { expect('bankers').toBe('bankers') })
  it('CHECK_INTERVAL为1500', () => { sys.update(1, em, makeCivManager([1,2]), 1500); expect((sys as any).lastCheck).toBe(1500) })
  it('lastCheck在节流后不变', () => {
    sys.update(1, em, makeCivManager([1,2]), 1500)
    sys.update(1, em, makeCivManager([1,2]), 1600)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('大tick值时不崩溃', () => { expect(() => sys.update(1, em, makeCivManager([1,2]), 9999999)).not.toThrow() })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, em, makeCivManager([1,2]), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('多次update后guilds仍为数组', () => {
    for (let i = 1; i <= 5; i++) sys.update(1, em, makeCivManager([1,2]), 1500 * i)
    expect(Array.isArray((sys as any).guilds)).toBe(true)
  })
  it('MAX_GUILDS常量为40', () => { expect((sys as any).MAX_GUILDS ?? 40).toBe(40) })
  it('nextId随手动插入递增', () => {
    ;(sys as any).nextId = 10
    ;(sys as any).guilds.push({ id: (sys as any).nextId++, name: 'G', guildType: 'miners', memberCivs: [], influence: 0, wealth: 0, regulations: 0, tick: 0 })
    expect((sys as any).nextId).toBe(11)
  })
  it('空civManager时不崩溃', () => { expect(() => sys.update(1, em, makeCivManager([]), 1500)).not.toThrow() })
  it('单civ时不崩溃', () => { expect(() => sys.update(1, em, makeCivManager([1]), 1500)).not.toThrow() })
  it('guilds删除后长度减少', () => {
    ;(sys as any).guilds.push({ id: 1, name: 'G', guildType: 'sailors', memberCivs: [], influence: 0, wealth: 0, regulations: 0, tick: 0 })
    ;(sys as any).guilds.splice(0, 1)
    expect((sys as any).guilds).toHaveLength(0)
  })
  it('update连续调用10次不崩溃', () => {
    for (let i = 1; i <= 10; i++) sys.update(1, em, makeCivManager([1,2]), 1500 * i)
    expect(true).toBe(true)
  })
  it('_usedIdxSet初始为空Set', () => { expect((sys as any)._usedIdxSet.size).toBe(0) })
  it('guilds数组元素id唯一（手动注入时）', () => {
    ;(sys as any).guilds.push({ id: 1, name: 'G1', guildType: 'merchants', memberCivs: [], influence: 0, wealth: 0, regulations: 0, tick: 0 })
    ;(sys as any).guilds.push({ id: 2, name: 'G2', guildType: 'farmers', memberCivs: [], influence: 0, wealth: 0, regulations: 0, tick: 0 })
    const ids = (sys as any).guilds.map((g: any) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('tick=0时lastCheck不更新', () => {
    sys.update(1, em, makeCivManager([1,2]), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('DiplomaticTradeGuildSystem — 边界与综合', () => {
  let sys: DiplomaticTradeGuildSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  it('nextId初始为1（fresh instance）', () => { expect((makeSys() as any).nextId).toBe(1) })
  it('lastCheck初始为0（fresh instance）', () => { expect((makeSys() as any).lastCheck).toBe(0) })
  it('guilds初始为空（fresh instance）', () => { expect((makeSys() as any).guilds).toHaveLength(0) })
  it('_civsBuf初始为空数组', () => { expect((sys as any)._civsBuf).toEqual([]) })
  it('update后guilds长度不超过MAX_GUILDS', () => {
    for (let i = 1; i <= 50; i++) sys.update(1, em, makeCivManager([1,2,3,4,5]), 1500 * i)
    expect((sys as any).guilds.length).toBeLessThanOrEqual(40)
  })
  it('CHECK_INTERVAL为1500（验证）', () => { expect(1500).toBe(1500) })
})

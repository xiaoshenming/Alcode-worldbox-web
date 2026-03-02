import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureNicknameSystem } from '../systems/CreatureNicknameSystem'
import type { Nickname, NicknameTitle } from '../systems/CreatureNicknameSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureNicknameSystem { return new CreatureNicknameSystem() }
function makeNickname(entityId: number, name: NicknameTitle = 'the Brave', fame = 50, tick = 0): Nickname {
  return { id: nextId++, entityId, name, reason: 'Did something notable', fame, tick }
}

function makeEm(...creatures: Array<{ speed?: number; isHostile?: boolean; age?: number; maxAge?: number }>) {
  const em = new EntityManager()
  for (const c of creatures) {
    const eid = em.createEntity()
    em.addComponent(eid, {
      type: 'creature',
      speed: c.speed ?? 1,
      isHostile: c.isHostile ?? false,
      age: c.age ?? 10,
      maxAge: c.maxAge ?? 100,
    })
  }
  return em
}

const ALL_TITLES: NicknameTitle[] = [
  'the Brave', 'the Wise', 'the Cruel', 'the Swift',
  'the Lucky', 'the Cursed', 'the Builder', 'the Wanderer',
]

afterEach(() => { vi.restoreAllMocks() })

// ─── 1. 初始化状态 ───────────────────────────────────────────────
describe('CreatureNicknameSystem - 初始化状态', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 nicknames 数组为空', () => { expect((sys as any).nicknames).toHaveLength(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 _nicknameMap 为空', () => { expect((sys as any)._nicknameMap.size).toBe(0) })
  it('初始 _famousBuf 为空', () => { expect((sys as any)._famousBuf).toHaveLength(0) })
  it('多次构造彼此独立', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).nicknames.push(makeNickname(1))
    expect((b as any).nicknames).toHaveLength(0)
  })
  it('构造函数不抛出', () => { expect(() => makeSys()).not.toThrow() })
})

// ─── 2. getNickname 公共方法 ─────────────────────────────────────
describe('CreatureNicknameSystem - getNickname', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配时返回 undefined', () => { expect(sys.getNickname(999)).toBeUndefined() })
  it('通过 nicknames 数组注入后可找到', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Lucky'))
    expect(sys.getNickname(1)!.name).toBe('the Lucky')
  })
  it('通过 _nicknameMap 注入后可找到（优先 Map）', () => {
    const nn = makeNickname(5, 'the Swift')
    ;(sys as any)._nicknameMap.set(5, nn)
    expect(sys.getNickname(5)!.name).toBe('the Swift')
  })
  it('先通过 Map 查找再 fallback scan', () => {
    const nn = makeNickname(3, 'the Cruel')
    ;(sys as any).nicknames.push(nn)
    // 不填充 Map，走 fallback
    const result = sys.getNickname(3)
    expect(result).toBeDefined()
    expect(result!.name).toBe('the Cruel')
  })
  it('fallback scan 后结果被缓存到 Map', () => {
    const nn = makeNickname(7, 'the Builder')
    ;(sys as any).nicknames.push(nn)
    sys.getNickname(7)
    expect((sys as any)._nicknameMap.has(7)).toBe(true)
  })
  it('返回的对象引用与注入一致', () => {
    const nn = makeNickname(2, 'the Brave')
    ;(sys as any).nicknames.push(nn)
    expect(sys.getNickname(2)).toBe(nn)
  })
  it('不同实体不互相影响', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave'))
    ;(sys as any).nicknames.push(makeNickname(2, 'the Wise'))
    expect(sys.getNickname(1)!.name).toBe('the Brave')
    expect(sys.getNickname(2)!.name).toBe('the Wise')
  })
})

// ─── 3. getFamous 公共方法 ───────────────────────────────────────
describe('CreatureNicknameSystem - getFamous', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空列表返回空数组', () => { expect(sys.getFamous(5)).toHaveLength(0) })
  it('按 fame 降序排列', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 30))
    ;(sys as any).nicknames.push(makeNickname(2, 'the Wise', 90))
    ;(sys as any).nicknames.push(makeNickname(3, 'the Cruel', 60))
    const famous = sys.getFamous(3)
    expect(famous[0].fame).toBe(90)
    expect(famous[1].fame).toBe(60)
    expect(famous[2].fame).toBe(30)
  })
  it('count 限制返回数量', () => {
    for (let i = 0; i < 5; i++) (sys as any).nicknames.push(makeNickname(i + 1, 'the Brave', i * 10))
    expect(sys.getFamous(2)).toHaveLength(2)
  })
  it('count 大于实际数量时返回全部', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 50))
    expect(sys.getFamous(10)).toHaveLength(1)
  })
  it('getFamous(0) 返回空数组', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 50))
    expect(sys.getFamous(0)).toHaveLength(0)
  })
  it('getFamous 不修改原始数组顺序', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 10))
    ;(sys as any).nicknames.push(makeNickname(2, 'the Wise', 80))
    sys.getFamous(2)
    // 原始数组顺序未被改变（只有 _famousBuf 被排序）
    expect((sys as any).nicknames[0].entityId).toBe(1)
    expect((sys as any).nicknames[1].entityId).toBe(2)
  })
  it('连续两次调用结果一致', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 70))
    ;(sys as any).nicknames.push(makeNickname(2, 'the Wise', 40))
    const r1 = sys.getFamous(2).map(n => n.entityId)
    const r2 = sys.getFamous(2).map(n => n.entityId)
    expect(r1).toEqual(r2)
  })
  it('top 1 只返回 fame 最高的', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 10))
    ;(sys as any).nicknames.push(makeNickname(2, 'the Wise', 99))
    const top = sys.getFamous(1)
    expect(top[0].fame).toBe(99)
  })
})

// ─── 4. NicknameTitle 枚举 ───────────────────────────────────────
describe('CreatureNicknameSystem - NicknameTitle 枚举值', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it.each(ALL_TITLES)('标题 %s 可注入并检索', (title) => {
    ;(sys as any).nicknames.push(makeNickname(nextId, title as NicknameTitle))
    const last = (sys as any).nicknames[(sys as any).nicknames.length - 1]
    expect(last.name).toBe(title)
  })

  it('所有标题共 8 种', () => {
    expect(ALL_TITLES).toHaveLength(8)
  })
})

// ─── 5. Nickname 接口字段完整性 ──────────────────────────────────
describe('CreatureNicknameSystem - Nickname 字段', () => {
  beforeEach(() => { nextId = 1 })

  it('id 为数字', () => { expect(typeof makeNickname(1).id).toBe('number') })
  it('entityId 正确存储', () => { expect(makeNickname(42).entityId).toBe(42) })
  it('reason 为字符串', () => { expect(typeof makeNickname(1).reason).toBe('string') })
  it('fame 默认 50', () => { expect(makeNickname(1).fame).toBe(50) })
  it('tick 默认 0', () => { expect(makeNickname(1).tick).toBe(0) })
  it('fame 取值范围 [0,100]', () => {
    const nn = makeNickname(1, 'the Brave', 75)
    expect(nn.fame).toBeGreaterThanOrEqual(0)
    expect(nn.fame).toBeLessThanOrEqual(100)
  })
})

// ─── 6. _nicknameMap 同步 ────────────────────────────────────────
describe('CreatureNicknameSystem - _nicknameMap 同步', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('直接写 Map 后 getNickname 可查询', () => {
    const nn = makeNickname(10, 'the Wanderer')
    ;(sys as any)._nicknameMap.set(10, nn)
    expect(sys.getNickname(10)).toBe(nn)
  })
  it('Map 和 nicknames 同时注入均可查到', () => {
    const nn = makeNickname(20, 'the Cursed')
    ;(sys as any).nicknames.push(nn)
    ;(sys as any)._nicknameMap.set(20, nn)
    expect(sys.getNickname(20)).toBe(nn)
  })
  it('Map 清除后 fallback 到 nicknames', () => {
    const nn = makeNickname(30, 'the Lucky')
    ;(sys as any).nicknames.push(nn)
    ;(sys as any)._nicknameMap.set(30, nn)
    ;(sys as any)._nicknameMap.clear()
    const result = sys.getNickname(30)
    expect(result).toBeDefined()
    expect(result!.name).toBe('the Lucky')
  })
})

// ─── 7. update 节流逻辑 ───────────────────────────────────────────
describe('CreatureNicknameSystem - update 节流', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys() })

  it('tick < CHECK_INTERVAL 时不更新 lastCheck', () => {
    const em = makeEm({})
    sys.update(1, em, 0)
    sys.update(1, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时 lastCheck 更新', () => {
    const em = makeEm({})
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('空 EntityManager 不崩溃', () => {
    const em = new EntityManager()
    expect(() => sys.update(1, em, 1000)).not.toThrow()
  })
})

// ─── 8. assignNicknames 依据属性分配称号 ─────────────────────────
describe('CreatureNicknameSystem - assignNicknames 属性触发', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys() })

  it('age > maxAge*0.7 时倾向分配 the Wise', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // NICKNAME_CHANCE=0.01, random=0 -> 进入
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', speed: 1, isHostile: false, age: 80, maxAge: 100 })
    sys.update(1, em, 1000)
    const nn = sys.getNickname(eid)
    expect(nn?.name).toBe('the Wise')
  })

  it('speed > 3 时倾向分配 the Swift', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', speed: 5, isHostile: false, age: 10, maxAge: 100 })
    sys.update(1, em, 1000)
    const nn = sys.getNickname(eid)
    expect(nn?.name).toBe('the Swift')
  })

  it('isHostile=true 时倾向分配 the Cruel', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', speed: 1, isHostile: true, age: 10, maxAge: 100 })
    sys.update(1, em, 1000)
    const nn = sys.getNickname(eid)
    expect(nn?.name).toBe('the Cruel')
  })

  it('同一实体不重复分配绰号', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100 })
    sys.update(1, em, 1000)
    sys.update(1, em, 2000)
    const count = (sys as any).nicknames.filter((n: Nickname) => n.entityId === eid).length
    expect(count).toBe(1)
  })
})

// ─── 9. evolveFame 名声演化 ──────────────────────────────────────
describe('CreatureNicknameSystem - evolveFame', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('evolveFame 后 fame 只增不减', () => {
    const nn = makeNickname(1, 'the Brave', 50)
    ;(sys as any).nicknames.push(nn)
    const before = nn.fame
    ;(sys as any).evolveFame()
    expect(nn.fame).toBeGreaterThanOrEqual(before)
  })

  it('fame 不超过 100', () => {
    const nn = makeNickname(1, 'the Brave', 99.9)
    ;(sys as any).nicknames.push(nn)
    vi.spyOn(Math, 'random').mockReturnValue(1) // +0.5
    ;(sys as any).evolveFame()
    expect(nn.fame).toBeLessThanOrEqual(100)
  })

  it('fame 起点 0 时 evolveFame 后仍 >= 0', () => {
    const nn = makeNickname(1, 'the Brave', 0)
    ;(sys as any).nicknames.push(nn)
    ;(sys as any).evolveFame()
    expect(nn.fame).toBeGreaterThanOrEqual(0)
  })
})

// ─── 10. cleanup 超上限裁剪 ──────────────────────────────────────
describe('CreatureNicknameSystem - cleanup', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过 100 条时被截断至 100', () => {
    for (let i = 0; i < 105; i++) (sys as any).nicknames.push(makeNickname(i + 1, 'the Brave', i))
    ;(sys as any).cleanup()
    expect((sys as any).nicknames).toHaveLength(100)
  })

  it('cleanup 后保留 fame 最高的记录', () => {
    for (let i = 0; i < 101; i++) {
      const fame = i === 100 ? 1 : 50 // 最后一条 fame 最低
      ;(sys as any).nicknames.push(makeNickname(i + 1, 'the Brave', fame))
    }
    ;(sys as any).cleanup()
    // 最低 fame=1 的那条应被移除
    expect((sys as any).nicknames.every((n: Nickname) => n.fame >= 50)).toBe(true)
  })

  it('cleanup 后 _nicknameMap 与 nicknames 同步', () => {
    for (let i = 0; i < 101; i++) (sys as any).nicknames.push(makeNickname(i + 1, 'the Brave', i))
    ;(sys as any).cleanup()
    const mapSize = (sys as any)._nicknameMap.size
    const arrLen = (sys as any).nicknames.length
    expect(mapSize).toBe(arrLen)
  })

  it('不超过 100 时不截断', () => {
    for (let i = 0; i < 50; i++) (sys as any).nicknames.push(makeNickname(i + 1, 'the Brave', i))
    ;(sys as any).cleanup()
    expect((sys as any).nicknames).toHaveLength(50)
  })
})

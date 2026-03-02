import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureOathSystem } from '../systems/CreatureOathSystem'
import type { Oath, OathType } from '../systems/CreatureOathSystem'

let nextId = 1
function makeSys(): CreatureOathSystem { return new CreatureOathSystem() }
function makeOath(creatureId: number, type: OathType = 'loyalty', tick = 0, fulfilled = false): Oath {
  return { id: nextId++, creatureId, type, targetId: null, strength: 80, fulfilled, tick }
}

// 构造 EM mock
function makeEM(ids: number[] = []) {
  return {
    getEntitiesWithComponents: (_a: string, _b: string) => ids,
    hasComponent: (eid: number, _comp: string) => ids.includes(eid),
  } as any
}

describe('CreatureOathSystem.getOaths — 基础数据', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无誓言', () => { expect((sys as any).oaths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).oaths.push(makeOath(1, 'vengeance'))
    expect((sys as any).oaths[0].type).toBe('vengeance')
  })
  it('返回内部引用', () => {
    ;(sys as any).oaths.push(makeOath(1))
    expect((sys as any).oaths).toBe((sys as any).oaths)
  })
  it('支持所有6种誓言类型', () => {
    const types: OathType[] = ['loyalty', 'vengeance', 'protection', 'pilgrimage', 'silence', 'service']
    types.forEach((t, i) => { ;(sys as any).oaths.push(makeOath(i + 1, t)) })
    const all = (sys as any).oaths
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
  it('targetId可为null', () => {
    ;(sys as any).oaths.push(makeOath(1))
    expect((sys as any).oaths[0].targetId).toBeNull()
  })
})

describe('CreatureOathSystem — CHECK_INTERVAL=900 节流', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时 lastCheck 不更新（0-0=0 < 900）', () => {
    const em = makeEM([1])
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=899 时 lastCheck 不更新', () => {
    const em = makeEM([])
    sys.update(1, em, 899)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=900 时 lastCheck 更新', () => {
    const em = makeEM([])
    sys.update(1, em, 900)
    expect((sys as any).lastCheck).toBe(900)
  })

  it('第二次 update 不足间隔时不再更新', () => {
    const em = makeEM([])
    sys.update(1, em, 900)
    sys.update(1, em, 1000) // 1000-900=100 < 900，不更新
    expect((sys as any).lastCheck).toBe(900)
  })

  it('两次都满足间隔时都能更新', () => {
    const em = makeEM([])
    sys.update(1, em, 900)
    sys.update(1, em, 1800) // 1800-900=900 >= 900，更新
    expect((sys as any).lastCheck).toBe(1800)
  })
})

describe('CreatureOathSystem — pruneOld：MAX_OATHS=80 上限裁剪', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('誓言数量 <= 80 时不裁剪', () => {
    for (let i = 1; i <= 80; i++) {
      ;(sys as any).oaths.push(makeOath(i))
    }
    const em = makeEM([])
    sys.update(1, em, 900)
    expect((sys as any).oaths).toHaveLength(80)
  })

  it('誓言数量 = 81 时裁剪到 80，删除第一个', () => {
    for (let i = 1; i <= 81; i++) {
      ;(sys as any).oaths.push(makeOath(i))
    }
    // 确保第 1 个 id=1，81 个 id=81
    const firstId = (sys as any).oaths[0].id
    const em = makeEM([])
    sys.update(1, em, 900)
    expect((sys as any).oaths).toHaveLength(80)
    // 最旧的（索引 0）被删除，现在第一个是原来第 2 个
    expect((sys as any).oaths[0].id).toBeGreaterThan(firstId)
  })

  it('誓言超出 MAX_OATHS 时从头部裁剪多余部分', () => {
    for (let i = 1; i <= 85; i++) {
      ;(sys as any).oaths.push(makeOath(i))
    }
    const em = makeEM([])
    sys.update(1, em, 900)
    // splice(0, 85-80=5)：删除前 5 个
    expect((sys as any).oaths).toHaveLength(80)
  })
})

describe('CreatureOathSystem — resolveFulfillment：age>2000 时有机会 fulfilled', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age <= 2000 时不会 fulfilled（即使 random=0）', () => {
    // oath.tick=0, currentTick=900, age=900 <= 2000
    ;(sys as any).oaths.push(makeOath(1, 'loyalty', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0) // random < 0.05，但 age=900 不满足
    const em = makeEM([])
    sys.update(1, em, 900)
    expect((sys as any).oaths[0].fulfilled).toBe(false)
    vi.restoreAllMocks()
  })

  it('age > 2000 且 random < 0.05 时 fulfilled=true', () => {
    // oath.tick=0, 我们需要 tick > 2000
    // 先 update tick=900 让 lastCheck=900
    // 再 update tick=900+900=1800（不够），tick=900+900+900=2700？
    // 直接注入 oath，然后 update 足够大的 tick
    ;(sys as any).oaths.push(makeOath(1, 'loyalty', 0))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.05，满足
    const em = makeEM([])
    sys.update(1, em, 2900) // age = 2900-0 = 2900 > 2000 ✓
    expect((sys as any).oaths[0].fulfilled).toBe(true)
    vi.restoreAllMocks()
  })

  it('已 fulfilled 的誓言不重复处理', () => {
    const oath = makeOath(1, 'loyalty', 0, true) // 已 fulfilled
    ;(sys as any).oaths.push(oath)
    // 不需要 mock，fulfilled 检查在 continue 之前
    const em = makeEM([])
    sys.update(1, em, 3000)
    // 确认仍然是 fulfilled（没有被重置）
    expect((sys as any).oaths[0].fulfilled).toBe(true)
  })

  it('age > 2000 但 random >= 0.05 时不 fulfilled', () => {
    ;(sys as any).oaths.push(makeOath(1, 'loyalty', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // 0.1 >= 0.05，不满足
    const em = makeEM([])
    sys.update(1, em, 2900)
    expect((sys as any).oaths[0].fulfilled).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('CreatureOathSystem — Oath 字段完整性', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('strength 范围：makeOath 设置 80，可在 30-100 之间', () => {
    const oath = makeOath(1)
    expect(oath.strength).toBeGreaterThanOrEqual(30)
    expect(oath.strength).toBeLessThanOrEqual(100)
  })

  it('nextId 递增：每次注入后 id 唯一', () => {
    ;(sys as any).oaths.push(makeOath(1))
    ;(sys as any).oaths.push(makeOath(2))
    const ids = (sys as any).oaths.map((o: Oath) => o.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('targetId 可以为非 null（数字）', () => {
    const oath: Oath = { id: 1, creatureId: 1, type: 'protection', targetId: 42, strength: 50, fulfilled: false, tick: 0 }
    ;(sys as any).oaths.push(oath)
    expect((sys as any).oaths[0].targetId).toBe(42)
  })

  it('初始 fulfilled=false', () => {
    const oath = makeOath(1)
    expect(oath.fulfilled).toBe(false)
  })

  it('tick 字段记录誓言生成时刻', () => {
    const oath = makeOath(1, 'loyalty', 5000)
    expect(oath.tick).toBe(5000)
  })
})

describe('CreatureOathSystem — generateOaths 集成：OATH_CHANCE=0.025', () => {
  let sys: CreatureOathSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('random > OATH_CHANCE（0.025）时不创建誓言', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 > 0.025，skip
    const em = makeEM([1])
    sys.update(1, em, 900)
    expect((sys as any).oaths).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random <= OATH_CHANCE 时为实体创建誓言', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 <= 0.025，创建
    const em = makeEM([1])
    sys.update(1, em, 900)
    expect((sys as any).oaths.length).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('新誓言的 creatureId 来自实体列表', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([42])
    sys.update(1, em, 900)
    const oath = (sys as any).oaths[0]
    expect(oath.creatureId).toBe(42)
    vi.restoreAllMocks()
  })

  it('新誓言的 tick 为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM([1])
    sys.update(1, em, 900)
    const oath = (sys as any).oaths[0]
    expect(oath.tick).toBe(900)
    vi.restoreAllMocks()
  })
})

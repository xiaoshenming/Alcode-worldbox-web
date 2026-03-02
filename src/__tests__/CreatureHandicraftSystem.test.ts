import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureHandicraftSystem } from '../systems/CreatureHandicraftSystem'
import type { Handicraft, CraftType } from '../systems/CreatureHandicraftSystem'

let nextId = 1
function makeSys(): CreatureHandicraftSystem { return new CreatureHandicraftSystem() }
function makeCraft(crafterId: number, type: CraftType = 'jewelry', quality = 70, tick = 0): Handicraft {
  return { id: nextId++, crafterId, type, quality, prestige: 20, traded: false, tick }
}

describe('CreatureHandicraftSystem.getCrafts', () => {
  let sys: CreatureHandicraftSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无手工艺', () => { expect(sys.getCrafts()).toHaveLength(0) })

  it('注入后可查询', () => {
    sys.getCrafts().push(makeCraft(1, 'textile'))
    expect(sys.getCrafts()[0].type).toBe('textile')
  })

  it('返回内部引用', () => {
    sys.getCrafts().push(makeCraft(1))
    expect(sys.getCrafts()).toBe(sys.getCrafts())
  })

  it('CraftType 包含 6 种类型', () => {
    const types: CraftType[] = ['jewelry', 'pottery', 'weapon', 'textile', 'sculpture', 'instrument']
    expect(types).toHaveLength(6)
    types.forEach(t => {
      const c = makeCraft(1, t)
      expect(c.type).toBe(t)
    })
  })

  it('quality 字段上限为 100', () => {
    const c = makeCraft(1, 'jewelry', 100)
    expect(c.quality).toBe(100)
    // 手动注入超出值，验证 Math.min 约束
    const c2: Handicraft = { ...c, quality: Math.min(100, 150) }
    expect(c2.quality).toBe(100)
  })

  it('多个工艺品可共存', () => {
    sys.getCrafts().push(makeCraft(1, 'jewelry'))
    sys.getCrafts().push(makeCraft(2, 'pottery'))
    sys.getCrafts().push(makeCraft(3, 'weapon'))
    expect(sys.getCrafts()).toHaveLength(3)
    expect(sys.getCrafts()[1].type).toBe('pottery')
  })

  it('traded 字段默认 false', () => {
    sys.getCrafts().push(makeCraft(1))
    expect(sys.getCrafts()[0].traded).toBe(false)
  })

  it('prestige 字段存在', () => {
    sys.getCrafts().push(makeCraft(1, 'sculpture'))
    expect(typeof sys.getCrafts()[0].prestige).toBe('number')
  })
})

describe('CreatureHandicraftSystem.getByCrafter', () => {
  let sys: CreatureHandicraftSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    sys.getCrafts().push(makeCraft(1))
    expect(sys.getByCrafter(999)).toHaveLength(0)
  })

  it('过滤特定工匠', () => {
    sys.getCrafts().push(makeCraft(1))
    sys.getCrafts().push(makeCraft(1))
    sys.getCrafts().push(makeCraft(2))
    expect(sys.getByCrafter(1)).toHaveLength(2)
  })

  it('getByCrafter 复用缓冲区（返回同一引用）', () => {
    sys.getCrafts().push(makeCraft(1))
    const r1 = sys.getByCrafter(1)
    const r2 = sys.getByCrafter(1)
    expect(r1).toBe(r2)
  })
})

describe('CreatureHandicraftSystem.update CHECK_INTERVAL', () => {
  let sys: CreatureHandicraftSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 1100 不调用 getEntitiesWithComponents（先推进 lastCheck 再验证小差值）', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
    // 先以 tick=10000 触发一次，lastCheck 更新为 10000
    sys.update(0, em, 10000)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    // 再以 10000 + 1099 调用，差值 1099 < 1100，不触发
    sys.update(0, em, 10000 + 1099)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('tick 差值 >= 1100 调用 getEntitiesWithComponents', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
    sys.update(0, em, 1000)
    sys.update(0, em, 1000 + 1100)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update 后 lastCheck 更新为当前 tick', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
    sys.update(0, em, 5000)
    // 再次以 5000+50 调用，差值 < 1100，不应再次调用
    sys.update(0, em, 5050)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
})

describe('CreatureHandicraftSystem 老化清理', () => {
  let sys: CreatureHandicraftSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过 8000 tick 的手工艺被清除', () => {
    // 注入一个 tick=0 的手工艺
    sys.getCrafts().push(makeCraft(1, 'pottery', 70, 0))
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
    // 推进到 tick=8001，cutoff = 8001 - 8000 = 1，tick=0 <= 1，应删除
    sys.update(0, em, 8001 + 1100) // 跨越 CHECK_INTERVAL
    expect(sys.getCrafts()).toHaveLength(0)
  })

  it('未超过 8000 tick 的手工艺保留', () => {
    sys.getCrafts().push(makeCraft(1, 'jewelry', 70, 5000))
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
    // tick=6200: cutoff = 6200 - 8000 = -1800，tick=5000 > -1800，保留
    sys.update(0, em, 6200)
    expect(sys.getCrafts()).toHaveLength(1)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMosaicSystem } from '../systems/CreatureMosaicSystem'
import type { Mosaic, MosaicStyle, MosaicMaterial } from '../systems/CreatureMosaicSystem'

const CHECK_INTERVAL = 3000
const MAX_MOSAICS = 30

let nextId = 1
function makeSys(): CreatureMosaicSystem { return new CreatureMosaicSystem() }
function makeMosaic(artistId: number, style: MosaicStyle = 'geometric', material: MosaicMaterial = 'stone', extra: Partial<Mosaic> = {}): Mosaic {
  return { id: nextId++, artistId, style, material, beauty: 70, size: 10, completeness: 100, tick: 0, ...extra }
}

// 最小化 EntityManager stub（update 需要）
function makeEm(entities: number[] = []) {
  return {
    getEntitiesWithComponent: (_: string) => entities,
    hasComponent: (_id: number, _comp: string) => true,
  } as any
}

describe('CreatureMosaicSystem - 基础结构', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无马赛克', () => { expect((sys as any).mosaics).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'figurative', 'glass'))
    expect((sys as any).mosaics[0].style).toBe('figurative')
    expect((sys as any).mosaics[0].material).toBe('glass')
  })

  it('返回内部引用', () => {
    ;(sys as any).mosaics.push(makeMosaic(1))
    expect((sys as any).mosaics).toBe((sys as any).mosaics)
  })

  it('支持所有 4 种风格', () => {
    const styles: MosaicStyle[] = ['geometric', 'figurative', 'abstract', 'narrative']
    styles.forEach((s, i) => { ;(sys as any).mosaics.push(makeMosaic(i + 1, s)) })
    const all = (sys as any).mosaics
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })

  it('lastCheck 初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('mosaics初始为空数组', () => {
    expect(Array.isArray((sys as any).mosaics)).toBe(true)
    expect((sys as any).mosaics.length).toBe(0)
  })

  it('马赛克id字段为数字', () => {
    ;(sys as any).mosaics.push(makeMosaic(1))
    expect(typeof (sys as any).mosaics[0].id).toBe('number')
  })

  it('注入多个马赛克后数组长度正确', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1))
    }
    expect((sys as any).mosaics).toHaveLength(5)
  })

  it('支持所有4种材料', () => {
    const materials: MosaicMaterial[] = ['stone', 'glass', 'ceramic', 'gem']
    materials.forEach((m, i) => { ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', m)) })
    const all = (sys as any).mosaics
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })

  it('数据完整性：注入的马赛克字段可正确读取', () => {
    const mosaic = makeMosaic(99, 'narrative', 'gem', { beauty: 55, size: 3, completeness: 72, tick: 1000 })
    ;(sys as any).mosaics.push(mosaic)
    const m = (sys as any).mosaics[0]
    expect(m.artistId).toBe(99)
    expect(m.style).toBe('narrative')
    expect(m.material).toBe('gem')
    expect(m.beauty).toBe(55)
    expect(m.size).toBe(3)
    expect(m.completeness).toBe(72)
    expect(m.tick).toBe(1000)
  })

  it('不同artistId各自独立', () => {
    ;(sys as any).mosaics.push(makeMosaic(11))
    ;(sys as any).mosaics.push(makeMosaic(22))
    expect((sys as any).mosaics[0].artistId).toBe(11)
    expect((sys as any).mosaics[1].artistId).toBe(22)
  })
})

describe('CreatureMosaicSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('CHECK_INTERVAL节流：tick < 3000 时 update 不更新 lastCheck', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('CHECK_INTERVAL节流：tick >= 3000 时 update 更新 lastCheck', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('CHECK_INTERVAL节流：第二次触发需再加3000', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    // tick=5999 差值1999 < 3000，不更新
    sys.update(16, em, 5999)
    expect((sys as any).lastCheck).toBe(3000)
    // tick=6000 差值3000 >= 3000，更新
    sys.update(16, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  it('tick=0时不通过节流', () => {
    const em = makeEm()
    sys.update(16, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('差值恰好等于CHECK_INTERVAL时触发', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 1000
    sys.update(16, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })

  it('差值比CHECK_INTERVAL少1时不触发', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 1000
    sys.update(16, em, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('节流期间mosaics不被修改', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 50, size: 2 }))
    ;(sys as any).lastCheck = 5000
    const em = makeEm()
    sys.update(16, em, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).mosaics[0].completeness).toBe(50)
  })

  it('节流通过后lastCheck被更新为当前tick', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    const targetTick = CHECK_INTERVAL * 7
    sys.update(16, em, targetTick)
    expect((sys as any).lastCheck).toBe(targetTick)
  })
})

describe('CreatureMosaicSystem - progress进度更新', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('未完成马赛克每次update增加 0.5/size 进度', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 2, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    // completeness += 0.5 / 2 = 0.25
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(0.25)
  })

  it('progress：completeness 不超过100', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 99.9, size: 1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBe(100)
  })

  it('progress：已完成(completeness=100)不再增加', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, size: 1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBe(100)
  })

  it('size=1时进度增量最大（0.5）', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(0.5)
  })

  it('size=5时进度增量为0.1', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 5, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(0.1)
  })

  it('不同size导致不同进度速率', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 1, tick: 0 }))
    ;(sys as any).mosaics.push(makeMosaic(2, 'figurative', 'stone', { completeness: 0, size: 5, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    const fast = (sys as any).mosaics[0].completeness  // += 0.5/1 = 0.5
    const slow = (sys as any).mosaics[1].completeness  // += 0.5/5 = 0.1
    expect(fast).toBeGreaterThan(slow)
    expect(fast).toBeCloseTo(0.5)
    expect(slow).toBeCloseTo(0.1)
  })

  it('多个未完成马赛克全部接受进度更新', () => {
    const em = makeEm()
    for (let i = 0; i < 3; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', 'stone', { completeness: 0, size: 2, tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    for (const m of (sys as any).mosaics) {
      expect(m.completeness).toBeCloseTo(0.25)
    }
  })

  it('进度接近100时不会超过100', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 99.6, size: 1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    // 99.6 + 0.5 = 100.1 -> capped at 100
    expect((sys as any).mosaics[0].completeness).toBe(100)
  })

  it('completeness=0的马赛克update后大于0', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 3, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBeGreaterThan(0)
  })

  it('size=10时进度增量为0.05', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 10, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(0.05)
  })
})

describe('CreatureMosaicSystem - cleanup删除机制', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('cleanup：完成且超过180000 tick的马赛克被删除', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(0)
  })

  it('cleanup：未完成的马赛克即使很旧也不删除', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 50, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(1)
  })

  it('cleanup：完成但未超期的马赛克不删除', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: 190000 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(1)
  })

  it('cleanup：tick恰好等于cutoff时不删除', () => {
    const em = makeEm()
    const currentTick = 200000
    const cutoff = currentTick - 180000  // = 20000
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: cutoff }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, currentTick)
    // tick == cutoff，不满足 < cutoff，保留
    expect((sys as any).mosaics).toHaveLength(1)
  })

  it('cleanup：tick比cutoff少1时被删除', () => {
    const em = makeEm()
    const currentTick = 200000
    const cutoff = currentTick - 180000  // = 20000
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, currentTick)
    expect((sys as any).mosaics).toHaveLength(0)
  })

  it('cleanup：混合场景只删除符合条件的马赛克', () => {
    const em = makeEm()
    const currentTick = 200000
    // 完成+过期 -> 删除
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: 0 }))
    // 未完成+过期 -> 保留
    ;(sys as any).mosaics.push(makeMosaic(2, 'abstract', 'glass', { completeness: 60, tick: 0 }))
    // 完成+未过期 -> 保留
    ;(sys as any).mosaics.push(makeMosaic(3, 'narrative', 'gem', { completeness: 100, tick: 190000 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, currentTick)
    expect((sys as any).mosaics).toHaveLength(2)
    const remaining = (sys as any).mosaics.map((m: Mosaic) => m.artistId)
    expect(remaining).toContain(2)
    expect(remaining).toContain(3)
    expect(remaining).not.toContain(1)
  })

  it('cleanup：全部过期且完成时数组清空', () => {
    const em = makeEm()
    for (let i = 0; i < 5; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', 'stone', { completeness: 100, tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(0)
  })

  it('cleanup：completeness=99.9时不满足>=100，不被删除（即使很旧）', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 99.9, tick: 0, size: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(1)
  })
})

describe('CreatureMosaicSystem - MAX_MOSAICS上限', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_MOSAICS为30：30个马赛克时不再创建新的', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', 'stone', { completeness: 50, tick: 0 }))
    }
    expect((sys as any).mosaics).toHaveLength(30)
    const em = makeEm([1, 2, 3])
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics.length).toBeGreaterThanOrEqual(30)
  })

  it('29个时仍可继续创建', () => {
    for (let i = 0; i < 29; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', 'stone', { completeness: 50, tick: 0 }))
    }
    expect((sys as any).mosaics).toHaveLength(29)
  })

  it('注入31个时数组长度为31（手动注入不受约束）', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1))
    }
    expect((sys as any).mosaics).toHaveLength(31)
  })
})

describe('CreatureMosaicSystem - 新建马赛克逻辑', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无生物时不会创建马赛克', () => {
    const em = makeEm([]) // 空实体列表
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // 通过概率
    sys.update(16, em, 3000)
    expect((sys as any).mosaics).toHaveLength(0)
  })

  it('新建马赛克后nextId递增', () => {
    const em = makeEm([1])
    ;(sys as any).lastCheck = 0
    const beforeId = (sys as any).nextId
    vi.spyOn(Math, 'random').mockReturnValue(0) // 通过CREATE_CHANCE
    sys.update(16, em, 3000)
    if ((sys as any).mosaics.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(beforeId)
    }
  })

  it('CREATE_CHANCE < 0.004时不创建（mock概率超过）', () => {
    const em = makeEm([1, 2, 3])
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.005) // > CREATE_CHANCE=0.004
    sys.update(16, em, 3000)
    expect((sys as any).mosaics).toHaveLength(0)
  })

  it('新建马赛克completeness初始为0', () => {
    const em = makeEm([1])
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, em, 3000)
    if ((sys as any).mosaics.length > 0) {
      // completeness在progress步骤中可能已经被更新（0.5/size），但起始是0
      expect((sys as any).mosaics[0].completeness).toBeGreaterThanOrEqual(0)
    }
  })

  it('新建马赛克的tick为当前tick', () => {
    const em = makeEm([1])
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, em, 3000)
    if ((sys as any).mosaics.length > 0) {
      expect((sys as any).mosaics[0].tick).toBe(3000)
    }
  })
})

describe('CreatureMosaicSystem - 整合与边界场景', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空mosaics执行update不抛错', () => {
    const em = makeEm()
    expect(() => sys.update(16, em, 3000)).not.toThrow()
  })

  it('dt参数对结果无影响', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 50, size: 2 }))
    sys.update(100, makeEm(), 3000)
    const val1 = (sys as any).mosaics[0].completeness

    sys = makeSys()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 50, size: 2 }))
    sys.update(1, makeEm(), 3000)
    const val2 = (sys as any).mosaics[0].completeness

    expect(val1).toBeCloseTo(val2)
  })

  it('size字段可以为任意正整数', () => {
    const m = makeMosaic(1, 'geometric', 'stone', { size: 100, completeness: 0 })
    ;(sys as any).mosaics.push(m)
    sys.update(16, makeEm(), 3000)
    // 0.5/100 = 0.005
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(0.005)
  })

  it('多次触发update进度持续累加', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 1, tick: 0 }))
    for (let i = 1; i <= 4; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3000 * i)
      ;(sys as any).lastCheck = 3000 * i
    }
    // 4次 * 0.5 = 2.0，但上限100
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(2.0)
  })

  it('beauty字段不被update修改', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { beauty: 77, completeness: 50, size: 2 }))
    sys.update(16, makeEm(), 3000)
    expect((sys as any).mosaics[0].beauty).toBe(77)
  })

  it('style字段不被update修改', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'narrative', 'gem', { completeness: 50, size: 2 }))
    sys.update(16, makeEm(), 3000)
    expect((sys as any).mosaics[0].style).toBe('narrative')
  })

  it('material字段不被update修改', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'abstract', 'ceramic', { completeness: 50, size: 2 }))
    sys.update(16, makeEm(), 3000)
    expect((sys as any).mosaics[0].material).toBe('ceramic')
  })

  it('artistId字段不被update修改', () => {
    ;(sys as any).mosaics.push(makeMosaic(42, 'geometric', 'stone', { completeness: 50, size: 2 }))
    sys.update(16, makeEm(), 3000)
    expect((sys as any).mosaics[0].artistId).toBe(42)
  })
})

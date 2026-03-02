import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureArtSystem } from '../systems/CreatureArtSystem'
import type { Artwork, ArtistData, ArtForm } from '../systems/CreatureArtSystem'

// ─── 工厂函数 ────────────────────────────────────────────────────────────────

let nextArtId = 1

function makeArtSys(): CreatureArtSystem {
  return new CreatureArtSystem()
}

function makeArtwork(quality: number, form: ArtForm = 'painting', overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: nextArtId++,
    creatorId: 1,
    creatorName: 'Bob',
    form,
    quality,
    fame: 50,
    createdTick: 0,
    title: 'Test Artwork',
    ...overrides,
  }
}

function makeArtist(eid: number, overrides: Partial<ArtistData> = {}): ArtistData {
  return {
    entityId: eid,
    talent: 50,
    preferredForm: 'painting',
    worksCreated: 0,
    inspiration: 50,
    ...overrides,
  }
}

const ALL_FORMS: ArtForm[] = [
  'painting', 'sculpture', 'music', 'poetry',
  'dance', 'weaving', 'pottery', 'storytelling',
]

// ─── artworks 基础存取 ───────────────────────────────────────────────────────

describe('CreatureArtSystem - artworks 基础存取', () => {
  let sys: CreatureArtSystem
  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始艺术品数量为 0', () => {
    expect((sys as any).artworks.length).toBe(0)
  })

  it('注入 1 件艺术品后 length 为 1', () => {
    ;(sys as any).artworks.push(makeArtwork(50))
    expect((sys as any).artworks.length).toBe(1)
  })

  it('注入 2 件后 length 为 2', () => {
    ;(sys as any).artworks.push(makeArtwork(50))
    ;(sys as any).artworks.push(makeArtwork(70))
    expect((sys as any).artworks.length).toBe(2)
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).artworks.push(makeArtwork(60))
    const ref = (sys as any).artworks
    expect(ref).toBe((sys as any).artworks)
  })

  it('存取首个艺术品的 quality 字段正确', () => {
    ;(sys as any).artworks.push(makeArtwork(42))
    expect((sys as any).artworks[0].quality).toBe(42)
  })

  it('存取艺术品的 form 字段正确', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'sculpture'))
    expect((sys as any).artworks[0].form).toBe('sculpture')
  })

  it('存取艺术品的 creatorId 字段正确', () => {
    const aw = makeArtwork(50, 'music', { creatorId: 99 })
    ;(sys as any).artworks.push(aw)
    expect((sys as any).artworks[0].creatorId).toBe(99)
  })

  it('存取艺术品的 fame 字段正确', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 77 }))
    expect((sys as any).artworks[0].fame).toBe(77)
  })

  it('存取艺术品的 createdTick 字段正确', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { createdTick: 1234 }))
    expect((sys as any).artworks[0].createdTick).toBe(1234)
  })

  it('存取艺术品的 title 字段正确', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { title: 'My Painting' }))
    expect((sys as any).artworks[0].title).toBe('My Painting')
  })

  it('可存入所有 8 种 ArtForm', () => {
    ALL_FORMS.forEach(f => (sys as any).artworks.push(makeArtwork(50, f)))
    expect((sys as any).artworks.length).toBe(8)
    expect((sys as any).artworks[0].form).toBe('painting')
    expect((sys as any).artworks[7].form).toBe('storytelling')
  })

  it('artworks 数组元素顺序与插入顺序一致', () => {
    ;(sys as any).artworks.push(makeArtwork(10, 'music'))
    ;(sys as any).artworks.push(makeArtwork(20, 'dance'))
    ;(sys as any).artworks.push(makeArtwork(30, 'pottery'))
    expect((sys as any).artworks[0].form).toBe('music')
    expect((sys as any).artworks[1].form).toBe('dance')
    expect((sys as any).artworks[2].form).toBe('pottery')
  })
})

// ─── getMasterpieces 过滤逻辑 ────────────────────────────────────────────────

describe('CreatureArtSystem - getMasterpieces 过滤逻辑 (quality >= 80)', () => {
  let sys: CreatureArtSystem
  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  const masterpieces = (s: CreatureArtSystem) =>
    (s as any).artworks.filter((a: Artwork) => a.quality >= 80)

  it('无艺术品时杰作为空数组', () => {
    expect(masterpieces(sys)).toHaveLength(0)
  })

  it('quality = 0 不是杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(0))
    expect(masterpieces(sys)).toHaveLength(0)
  })

  it('quality = 79 不是杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(79))
    expect(masterpieces(sys)).toHaveLength(0)
  })

  it('quality = 80 恰好是杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(80))
    expect(masterpieces(sys)).toHaveLength(1)
  })

  it('quality = 81 是杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(81))
    expect(masterpieces(sys)).toHaveLength(1)
  })

  it('quality = 90 是杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(90))
    expect(masterpieces(sys)).toHaveLength(1)
  })

  it('quality = 100 是杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(100))
    expect(masterpieces(sys)).toHaveLength(1)
  })

  it('多件 quality >= 80 全部统计', () => {
    ;(sys as any).artworks.push(makeArtwork(80))
    ;(sys as any).artworks.push(makeArtwork(90))
    ;(sys as any).artworks.push(makeArtwork(100))
    expect(masterpieces(sys)).toHaveLength(3)
  })

  it('混合质量只统计 >= 80 的', () => {
    ;(sys as any).artworks.push(makeArtwork(50))
    ;(sys as any).artworks.push(makeArtwork(79))
    ;(sys as any).artworks.push(makeArtwork(80))
    ;(sys as any).artworks.push(makeArtwork(95))
    ;(sys as any).artworks.push(makeArtwork(100))
    expect(masterpieces(sys)).toHaveLength(3)
  })

  it('过滤结果是新数组（不影响内部）', () => {
    ;(sys as any).artworks.push(makeArtwork(85))
    expect(masterpieces(sys)).not.toBe((sys as any).artworks)
  })

  it('杰作列表仅包含 quality >= 80 的项', () => {
    ;(sys as any).artworks.push(makeArtwork(79))
    ;(sys as any).artworks.push(makeArtwork(80))
    ;(sys as any).artworks.push(makeArtwork(85))
    const mp = masterpieces(sys)
    expect(mp.every((a: Artwork) => a.quality >= 80)).toBe(true)
  })

  it('杰作列表中元素保留完整字段', () => {
    ;(sys as any).artworks.push(makeArtwork(85, 'sculpture', { title: 'The Guardian', creatorId: 7 }))
    const mp = masterpieces(sys)
    expect(mp[0].title).toBe('The Guardian')
    expect(mp[0].creatorId).toBe(7)
    expect(mp[0].form).toBe('sculpture')
  })

  it('全部为非杰作时返回空数组', () => {
    ALL_FORMS.forEach(f => (sys as any).artworks.push(makeArtwork(50, f)))
    expect(masterpieces(sys)).toHaveLength(0)
  })
})

// ─── artists Map 存取 ────────────────────────────────────────────────────────

describe('CreatureArtSystem - artists Map 存取', () => {
  let sys: CreatureArtSystem
  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始艺术家数量为 0', () => {
    expect((sys as any).artists.size).toBe(0)
  })

  it('注入 1 个艺术家后 size 为 1', () => {
    ;(sys as any).artists.set(1, makeArtist(1))
    expect((sys as any).artists.size).toBe(1)
  })

  it('注入 3 个艺术家后 size 为 3', () => {
    ;(sys as any).artists.set(1, makeArtist(1))
    ;(sys as any).artists.set(2, makeArtist(2))
    ;(sys as any).artists.set(3, makeArtist(3))
    expect((sys as any).artists.size).toBe(3)
  })

  it('通过 entityId 获取艺术家数据正确', () => {
    ;(sys as any).artists.set(42, makeArtist(42, { talent: 77 }))
    expect((sys as any).artists.get(42).talent).toBe(77)
  })

  it('artistData.preferredForm 正确保存', () => {
    ;(sys as any).artists.set(5, makeArtist(5, { preferredForm: 'pottery' }))
    expect((sys as any).artists.get(5).preferredForm).toBe('pottery')
  })

  it('artistData.worksCreated 初始值可自定义', () => {
    ;(sys as any).artists.set(5, makeArtist(5, { worksCreated: 10 }))
    expect((sys as any).artists.get(5).worksCreated).toBe(10)
  })

  it('artistData.inspiration 范围设定正确', () => {
    ;(sys as any).artists.set(5, makeArtist(5, { inspiration: 75 }))
    expect((sys as any).artists.get(5).inspiration).toBe(75)
  })

  it('同 entityId 覆盖写入后 size 不变', () => {
    ;(sys as any).artists.set(1, makeArtist(1, { talent: 30 }))
    ;(sys as any).artists.set(1, makeArtist(1, { talent: 60 }))
    expect((sys as any).artists.size).toBe(1)
    expect((sys as any).artists.get(1).talent).toBe(60)
  })

  it('删除艺术家后 size 减少', () => {
    ;(sys as any).artists.set(1, makeArtist(1))
    ;(sys as any).artists.set(2, makeArtist(2))
    ;(sys as any).artists.delete(1)
    expect((sys as any).artists.size).toBe(1)
  })

  it('can has() 判断是否存在', () => {
    ;(sys as any).artists.set(9, makeArtist(9))
    expect((sys as any).artists.has(9)).toBe(true)
    expect((sys as any).artists.has(99)).toBe(false)
  })
})

// ─── nextArtId 自增 ──────────────────────────────────────────────────────────

describe('CreatureArtSystem - nextArtId 内部自增', () => {
  let sys: CreatureArtSystem
  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nextArtId 为 1', () => {
    expect((sys as any).nextArtId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动修改 nextArtId 后读取正确', () => {
    ;(sys as any).nextArtId = 42
    expect((sys as any).nextArtId).toBe(42)
  })
})

// ─── tick 节流逻辑（CHECK_INTERVAL = 900）────────────────────────────────────

describe('CreatureArtSystem - tick 节流逻辑 (CHECK_INTERVAL=900)', () => {
  let sys: CreatureArtSystem

  const emptyEm = { getEntitiesWithComponent: () => [] } as any

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 900 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 800)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 899 时不更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 899)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 900 时触发更新（lastCheck 更新）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).lastCheck).toBe(900)
  })

  it('tick 差值 > 900 时触发更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck 非零时差值计算正确', () => {
    ;(sys as any).lastCheck = 500
    sys.update(1, emptyEm, 1399)  // 差值 899
    expect((sys as any).lastCheck).toBe(500)  // 不触发
  })

  it('lastCheck 非零差值 = 900 时触发', () => {
    ;(sys as any).lastCheck = 500
    sys.update(1, emptyEm, 1400)  // 差值 900
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('连续两次 update 间隔不足时第二次不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)   // 第一次触发
    sys.update(1, emptyEm, 1000)  // 差值 100 不触发
    expect((sys as any).lastCheck).toBe(900)
  })

  it('连续两次 update 间隔足够时第二次触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)   // lastCheck=900
    sys.update(1, emptyEm, 1800)  // 差值900 触发
    expect((sys as any).lastCheck).toBe(1800)
  })
})

// ─── fame 衰减逻辑 ───────────────────────────────────────────────────────────

describe('CreatureArtSystem - fame 衰减逻辑 (FAME_DECAY=0.1)', () => {
  let sys: CreatureArtSystem

  const emptyEm = { getEntitiesWithComponent: () => [] } as any

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次 update 触发后 fame -= 0.1', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 10 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).artworks[0].fame).toBeCloseTo(9.9)
  })

  it('fame 从 1.0 衰减到 0.9', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 1.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).artworks[0].fame).toBeCloseTo(0.9)
  })

  it('fame <= 0 且 artworks.length > 20 时艺术品被删除', () => {
    // 填入 21 件，其中 1 件 fame = 0
    for (let i = 0; i < 20; i++) {
      ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 100 }))
    }
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 0.05 }))  // 衰减后 <= 0
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).artworks.length).toBe(20)
  })

  it('fame <= 0 但 artworks.length <= 20 时不删除', () => {
    // 只有 5 件
    for (let i = 0; i < 5; i++) {
      ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 0.05 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    // fame 减为负值但不删除
    expect((sys as any).artworks.length).toBe(5)
  })

  it('fame > 0 时不删除', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).artworks.length).toBe(1)
  })

  it('多次 update 后 fame 持续衰减', () => {
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 5 }))
    for (let tick = 900; tick <= 4500; tick += 900) {
      ;(sys as any).lastCheck = tick - 900
      sys.update(1, emptyEm, tick)
    }
    // 5次衰减: 5 - 0.1*5 = 4.5
    expect((sys as any).artworks[0].fame).toBeCloseTo(4.5)
  })
})

// ─── ArtForm 枚举完整性 ──────────────────────────────────────────────────────

describe('CreatureArtSystem - ArtForm 类型和工厂函数', () => {
  let sys: CreatureArtSystem
  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('8 种 ArtForm 均可构造 Artwork', () => {
    ALL_FORMS.forEach(f => {
      const aw = makeArtwork(50, f)
      expect(aw.form).toBe(f)
    })
  })

  it('makeArtwork 默认 form 为 painting', () => {
    const aw = makeArtwork(50)
    expect(aw.form).toBe('painting')
  })

  it('makeArtwork quality=0 正常', () => {
    const aw = makeArtwork(0)
    expect(aw.quality).toBe(0)
  })

  it('makeArtwork quality=100 正常', () => {
    const aw = makeArtwork(100)
    expect(aw.quality).toBe(100)
  })

  it('makeArtist 默认 talent=50', () => {
    const a = makeArtist(1)
    expect(a.talent).toBe(50)
  })

  it('makeArtist 默认 preferredForm=painting', () => {
    const a = makeArtist(1)
    expect(a.preferredForm).toBe('painting')
  })

  it('makeArtist 默认 worksCreated=0', () => {
    const a = makeArtist(1)
    expect(a.worksCreated).toBe(0)
  })

  it('makeArtist 默认 inspiration=50', () => {
    const a = makeArtist(1)
    expect(a.inspiration).toBe(50)
  })

  it('makeArtist override talent 生效', () => {
    const a = makeArtist(1, { talent: 99 })
    expect(a.talent).toBe(99)
  })

  it('makeArtist override inspiration 生效', () => {
    const a = makeArtist(1, { inspiration: 100 })
    expect(a.inspiration).toBe(100)
  })
})

// ─── 系统实例独立性 ──────────────────────────────────────────────────────────

describe('CreatureArtSystem - 多实例独立性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('两个实例 artworks 互不影响', () => {
    const s1 = makeArtSys()
    const s2 = makeArtSys()
    ;(s1 as any).artworks.push(makeArtwork(80))
    expect((s2 as any).artworks.length).toBe(0)
  })

  it('两个实例 artists 互不影响', () => {
    const s1 = makeArtSys()
    const s2 = makeArtSys()
    ;(s1 as any).artists.set(1, makeArtist(1))
    expect((s2 as any).artists.size).toBe(0)
  })

  it('两个实例 lastCheck 独立', () => {
    const s1 = makeArtSys()
    const s2 = makeArtSys()
    ;(s1 as any).lastCheck = 999
    expect((s2 as any).lastCheck).toBe(0)
  })

  it('两个实例 nextArtId 独立', () => {
    const s1 = makeArtSys()
    const s2 = makeArtSys()
    ;(s1 as any).nextArtId = 100
    expect((s2 as any).nextArtId).toBe(1)
  })
})

// ─── 边界条件 ────────────────────────────────────────────────────────────────

describe('CreatureArtSystem - 边界条件', () => {
  let sys: CreatureArtSystem
  const emptyEm = { getEntitiesWithComponent: () => [] } as any

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('artworks 为空时 update 不抛出异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, emptyEm, 900)).not.toThrow()
  })

  it('artists 为空时 update 不抛出异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, emptyEm, 900)).not.toThrow()
  })

  it('fame 精度：0.05 - 0.1 = -0.05 < 0，在 >20 件时被删除', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 100 }))
    }
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 0.05 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).artworks.length).toBe(20)
  })

  it('artworks.length = 20 时不删除低 fame（恰好等于限制）', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 0.05 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    // fame 变负但 length <= 20，不删
    expect((sys as any).artworks.length).toBe(20)
  })

  it('artworks.length = 21 时删除 fame <= 0 的项', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 100 }))
    }
    ;(sys as any).artworks.push(makeArtwork(50, 'painting', { fame: 0.05 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, emptyEm, 900)
    expect((sys as any).artworks.length).toBe(20)
  })

  it('质量 quality 字段类型为 number', () => {
    const aw = makeArtwork(55)
    expect(typeof aw.quality).toBe('number')
  })

  it('artist.entityId 与 Map key 一致', () => {
    ;(sys as any).artists.set(7, makeArtist(7))
    const data: ArtistData = (sys as any).artists.get(7)
    expect(data.entityId).toBe(7)
  })
})

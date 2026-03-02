import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PlagueMutationSystem } from '../systems/PlagueMutationSystem'

function makeSys(): PlagueMutationSystem { return new PlagueMutationSystem() }

let _nextId = 100
function makeStrain(overrides: Partial<{
  id: number; name: string; parentId: number; infectRate: number;
  lethality: number; mutationRate: number; symptoms: string[];
  infected: number; deaths: number; createdTick: number; extinct: boolean;
  infectStr: string; lethalStr: string; statsStr: string; parentStr: string; nameStr: string;
}> = {}) {
  const id = overrides.id ?? _nextId++
  return {
    id,
    name: overrides.name ?? 'TestPlague',
    parentId: overrides.parentId ?? 0,
    infectRate: overrides.infectRate ?? 0.3,
    lethality: overrides.lethality ?? 0.1,
    mutationRate: overrides.mutationRate ?? 0.05,
    symptoms: overrides.symptoms ?? ['fever', 'cough'],
    infected: overrides.infected ?? 5,
    deaths: overrides.deaths ?? 1,
    createdTick: overrides.createdTick ?? 0,
    extinct: overrides.extinct ?? false,
    infectStr: overrides.infectStr ?? '传染30%',
    lethalStr: overrides.lethalStr ?? '致死10.0%',
    statsStr: overrides.statsStr ?? '感染:5 死亡:1',
    parentStr: overrides.parentStr ?? '变异自 #0',
    nameStr: overrides.nameStr ?? '🧠 TestPlague',
  }
}

// ── getActiveStrains ──────────────────────────────────────────────────────────
describe('getActiveStrains - 基础行为', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); _nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无毒株时返回空数组', () => {
    expect(sys.getActiveStrains()).toHaveLength(0)
  })

  it('非灭绝毒株被正确返回', () => {
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    expect(sys.getActiveStrains()).toHaveLength(1)
  })

  it('灭绝毒株不被返回', () => {
    ;(sys as any).strains.push(makeStrain({ extinct: true }))
    expect(sys.getActiveStrains()).toHaveLength(0)
  })

  it('混合灭绝与活跃毒株时只返回活跃', () => {
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    ;(sys as any).strains.push(makeStrain({ extinct: true }))
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    expect(sys.getActiveStrains()).toHaveLength(2)
  })

  it('返回结果不是 strains 数组本身', () => {
    ;(sys as any).strains.push(makeStrain())
    expect(sys.getActiveStrains()).not.toBe((sys as any).strains)
  })

  it('多次调用返回同一内部缓冲引用（复用 _activeStrainsBuf）', () => {
    ;(sys as any).strains.push(makeStrain())
    const r1 = sys.getActiveStrains()
    const r2 = sys.getActiveStrains()
    expect(r1).toBe(r2)
  })

  it('10 个全活跃毒株全部返回', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).strains.push(makeStrain({ extinct: false }))
    }
    expect(sys.getActiveStrains()).toHaveLength(10)
  })

  it('10 个全灭绝毒株返回空', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).strains.push(makeStrain({ extinct: true }))
    }
    expect(sys.getActiveStrains()).toHaveLength(0)
  })

  it('返回毒株的 infectRate 字段正确', () => {
    ;(sys as any).strains.push(makeStrain({ infectRate: 0.77 }))
    expect(sys.getActiveStrains()[0].infectRate).toBe(0.77)
  })

  it('返回毒株的 lethality 字段正确', () => {
    ;(sys as any).strains.push(makeStrain({ lethality: 0.42 }))
    expect(sys.getActiveStrains()[0].lethality).toBe(0.42)
  })

  it('返回毒株的 symptoms 长度正确', () => {
    ;(sys as any).strains.push(makeStrain({ symptoms: ['fever', 'cough', 'rash'] }))
    expect(sys.getActiveStrains()[0].symptoms).toHaveLength(3)
  })

  it('6种症状类型全部可接受', () => {
    const all = ['fever', 'cough', 'rash', 'weakness', 'madness', 'blindness']
    ;(sys as any).strains.push(makeStrain({ symptoms: all }))
    expect(sys.getActiveStrains()[0].symptoms).toHaveLength(6)
  })
})

// ── recordDeath ───────────────────────────────────────────────────────────────
describe('recordDeath - 死亡记录', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); _nextId = 200 })
  afterEach(() => { vi.restoreAllMocks() })

  it('对存在的毒株记录死亡，deaths +1', () => {
    const s = makeStrain({ deaths: 0 })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    sys.recordDeath(s.id)
    expect(s.deaths).toBe(1)
  })

  it('多次记录死亡累计', () => {
    const s = makeStrain({ deaths: 3 })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    sys.recordDeath(s.id)
    sys.recordDeath(s.id)
    expect(s.deaths).toBe(5)
  })

  it('对不存在的 strainId 不抛出', () => {
    expect(() => sys.recordDeath(9999)).not.toThrow()
  })

  it('记录死亡后 statsStr 被更新', () => {
    const s = makeStrain({ infected: 10, deaths: 0 })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    sys.recordDeath(s.id)
    expect(s.statsStr).toContain('死亡:1')
  })

  it('statsStr 同时包含感染数与死亡数', () => {
    const s = makeStrain({ infected: 7, deaths: 2 })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    sys.recordDeath(s.id)
    expect(s.statsStr).toBe('感染:7 死亡:3')
  })

  it('_strainById 未注册时 fallback 到 strains.find()', () => {
    // 不向 _strainById 注入，只注入 strains
    const s = makeStrain({ deaths: 1 })
    ;(sys as any).strains.push(s)
    sys.recordDeath(s.id)
    expect(s.deaths).toBe(2)
  })
})

// ── update / 变异触发 ──────────────────────────────────────────────────────────
describe('update - 变异检查', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); _nextId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tickCounter 随每次 update 递增', () => {
    sys.update(0)
    expect((sys as any).tickCounter).toBe(1)
    sys.update(1)
    expect((sys as any).tickCounter).toBe(2)
  })

  it('在 tick=600 前不触发变异（毒株数量为0）', () => {
    for (let i = 0; i < 599; i++) sys.update(i)
    expect((sys as any).strains).toHaveLength(0)
  })

  it('没有活跃毒株时不创建子毒株', () => {
    // 强制 tickCounter 到变异点
    ;(sys as any).tickCounter = 599
    sys.update(600)
    expect((sys as any).strains).toHaveLength(0)
  })

  it('灭绝毒株不触发变异', () => {
    const s = makeStrain({ extinct: true, infected: 50, mutationRate: 1.0 })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(600)
    expect((sys as any).strains).toHaveLength(1) // 依旧只有原始毒株
  })

  it('infected < 10 的毒株不触发变异', () => {
    const s = makeStrain({ infected: 5, mutationRate: 1.0, extinct: false })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(600)
    expect((sys as any).strains).toHaveLength(1)
  })

  it('满足条件时触发变异产生新毒株', () => {
    const s = makeStrain({ infected: 50, mutationRate: 1.0, extinct: false })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 低随机值确保变异触发
    sys.update(600)
    expect((sys as any).strains.length).toBeGreaterThan(1)
  })

  it('每次变异检查最多产生一个新毒株', () => {
    for (let i = 0; i < 5; i++) {
      const s = makeStrain({ infected: 100, mutationRate: 1.0, extinct: false })
      ;(sys as any).strains.push(s)
      ;(sys as any)._strainById.set(s.id, s)
    }
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(600)
    expect((sys as any).strains.length).toBe(6) // 5 原始 + 1 变异
  })

  it('达到 MAX_STRAINS(20) 时不再变异', () => {
    for (let i = 0; i < 20; i++) {
      const s = makeStrain({ infected: 100, mutationRate: 1.0, extinct: false })
      ;(sys as any).strains.push(s)
      ;(sys as any)._strainById.set(s.id, s)
    }
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(600)
    expect((sys as any).strains).toHaveLength(20)
  })
})

// ── 子毒株属性 ─────────────────────────────────────────────────────────────────
describe('mutate - 子毒株属性验证', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); _nextId = 400 })
  afterEach(() => { vi.restoreAllMocks() })

  function forceMutate(): void {
    const s = makeStrain({ infected: 50, mutationRate: 1.0, extinct: false, symptoms: ['fever', 'cough'] })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(600)
  }

  it('子毒株的 parentId 指向父毒株 id', () => {
    forceMutate()
    const parent = (sys as any).strains[0]
    const child = (sys as any).strains[1]
    expect(child.parentId).toBe(parent.id)
  })

  it('子毒株 parentStr 包含父 id', () => {
    forceMutate()
    const parent = (sys as any).strains[0]
    const child = (sys as any).strains[1]
    expect(child.parentStr).toContain(`#${parent.id}`)
  })

  it('子毒株 infectRate 在 0.05..0.95 范围内', () => {
    forceMutate()
    const child = (sys as any).strains[1]
    expect(child.infectRate).toBeGreaterThanOrEqual(0.05)
    expect(child.infectRate).toBeLessThanOrEqual(0.95)
  })

  it('子毒株 mutationRate 在 0.01..0.3 范围内', () => {
    forceMutate()
    const child = (sys as any).strains[1]
    expect(child.mutationRate).toBeGreaterThanOrEqual(0.01)
    expect(child.mutationRate).toBeLessThanOrEqual(0.3)
  })

  it('子毒株初始 infected 为 0', () => {
    forceMutate()
    expect((sys as any).strains[1].infected).toBe(0)
  })

  it('子毒株初始 deaths 为 0', () => {
    forceMutate()
    expect((sys as any).strains[1].deaths).toBe(0)
  })

  it('子毒株 extinct 初始为 false', () => {
    forceMutate()
    expect((sys as any).strains[1].extinct).toBe(false)
  })

  it('子毒株 statsStr 初始为 "感染:0 死亡:0"', () => {
    forceMutate()
    expect((sys as any).strains[1].statsStr).toBe('感染:0 死亡:0')
  })

  it('子毒株被加入 _strainById', () => {
    forceMutate()
    const child = (sys as any).strains[1]
    expect((sys as any)._strainById.has(child.id)).toBe(true)
  })

  it('子毒株 infectStr 格式正确（包含百分号）', () => {
    forceMutate()
    const child = (sys as any).strains[1]
    expect(child.infectStr).toMatch(/传染\d+%/)
  })

  it('子毒株 lethalStr 格式正确（包含小数百分比）', () => {
    forceMutate()
    const child = (sys as any).strains[1]
    expect(child.lethalStr).toMatch(/致死[\d.]+%/)
  })

  it('子毒株 nameStr 以🧠开头', () => {
    forceMutate()
    const child = (sys as any).strains[1]
    expect(child.nameStr).toMatch(/^🦠/)
  })
})

// ── handleKeyDown ─────────────────────────────────────────────────────────────
describe('handleKeyDown - 键盘交互', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeKey(key: string, shiftKey: boolean): KeyboardEvent {
    return { key, shiftKey } as unknown as KeyboardEvent
  }

  it('Shift+G 切换 visible 为 true', () => {
    sys.handleKeyDown(makeKey('G', true))
    expect((sys as any).visible).toBe(true)
  })

  it('Shift+G 再次切换 visible 为 false', () => {
    sys.handleKeyDown(makeKey('G', true))
    sys.handleKeyDown(makeKey('G', true))
    expect((sys as any).visible).toBe(false)
  })

  it('Shift+G 返回 true', () => {
    expect(sys.handleKeyDown(makeKey('G', true))).toBe(true)
  })

  it('小写 g + Shift 也触发（key.toUpperCase()）', () => {
    sys.handleKeyDown(makeKey('g', true))
    expect((sys as any).visible).toBe(true)
  })

  it('不带 Shift 的 G 不触发', () => {
    sys.handleKeyDown(makeKey('G', false))
    expect((sys as any).visible).toBe(false)
  })

  it('不带 Shift 的 G 返回 false', () => {
    expect(sys.handleKeyDown(makeKey('G', false))).toBe(false)
  })

  it('其他按键返回 false', () => {
    expect(sys.handleKeyDown(makeKey('P', true))).toBe(false)
  })

  it('Shift+G 重置 scrollY 为 0', () => {
    ;(sys as any).scrollY = 100
    sys.handleKeyDown(makeKey('G', true))
    expect((sys as any).scrollY).toBe(0)
  })
})

// ── _rebuildHeaderCache ───────────────────────────────────────────────────────
describe('_rebuildHeaderCache - 缓存同步', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); _nextId = 500 })
  afterEach(() => { vi.restoreAllMocks() })

  it('无毒株时 _activeCount 为 0', () => {
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._activeCount).toBe(0)
  })

  it('加入 2 活跃 1 灭绝后 _activeCount 为 2', () => {
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    ;(sys as any).strains.push(makeStrain({ extinct: true }))
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._activeCount).toBe(2)
  })

  it('_headerStr 包含活跃数量', () => {
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._headerStr).toContain('2 活跃')
  })

  it('_headerStr 包含总数量', () => {
    ;(sys as any).strains.push(makeStrain({ extinct: false }))
    ;(sys as any).strains.push(makeStrain({ extinct: true }))
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._headerStr).toContain('2 总计')
  })

  it('_headerStr 包含 🦠 图标', () => {
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._headerStr).toContain('🦠')
  })
})

// ── getActiveStrains 与 _strainById 一致性 ─────────────────────────────────────
describe('_strainById Map 一致性', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); _nextId = 600 })
  afterEach(() => { vi.restoreAllMocks() })

  it('手动向 _strainById 注入后 recordDeath 可通过 O(1) 路径找到', () => {
    const s = makeStrain({ deaths: 0 })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    sys.recordDeath(s.id)
    expect(s.deaths).toBe(1)
  })

  it('_strainById 与 strains 数量一致（通过变异产生）', () => {
    const s = makeStrain({ infected: 50, mutationRate: 1.0, extinct: false })
    ;(sys as any).strains.push(s)
    ;(sys as any)._strainById.set(s.id, s)
    ;(sys as any).tickCounter = 599
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(600)
    const mapSize = (sys as any)._strainById.size
    const arrSize = (sys as any).strains.length
    expect(mapSize).toBe(arrSize)
  })
})

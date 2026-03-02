import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCrystalCaveSystem } from '../systems/WorldCrystalCaveSystem'
import type { CrystalCave, CrystalType } from '../systems/WorldCrystalCaveSystem'

function makeSys(): WorldCrystalCaveSystem { return new WorldCrystalCaveSystem() }
let nextId = 1
function makeCave(overrides: Partial<CrystalCave> = {}): CrystalCave {
  return {
    id: nextId++, x: 10, y: 20, crystalType: 'quartz', richness: 75,
    magicEmission: 30, explored: false, resourcesHarvested: 0, startTick: 0,
    ...overrides,
  }
}

// 安全world mock：getTile返回0(DEEP_WATER)，不触发spawn
const safeWorld = { width: 200, height: 200, getTile: () => 0 } as any
// 山地world mock：getTile返回5(MOUNTAIN)，触发spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// em mock：getEntitiesWithComponents返回空数组（注意复数！）
const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

// ─── 基础状态 ──────────────────────���────────────────────────────────────────
describe('WorldCrystalCaveSystem 基础状态', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无水晶洞穴', () => {
    expect((sys as any).caves).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).caves).toBe((sys as any).caves)
  })

  it('支持6种水晶类型', () => {
    const types: CrystalType[] = ['quartz', 'amethyst', 'emerald', 'ruby', 'sapphire', 'diamond']
    expect(types).toHaveLength(6)
  })

  it('水晶洞穴字段正确', () => {
    ;(sys as any).caves.push(makeCave({ crystalType: 'diamond' }))
    const c = (sys as any).caves[0]
    expect(c.crystalType).toBe('diamond')
    expect(c.richness).toBe(75)
    expect(c.explored).toBe(false)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── CHECK_INTERVAL=1400 节流 ───────────────────────────────────────────────
describe('WorldCrystalCaveSystem CHECK_INTERVAL=1400 节流', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(16, safeWorld, em, 0)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('tick<1400时不触发（lastCheck保持0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, mountainWorld, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick>=1400时触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
    vi.restoreAllMocks()
  })

  it('首次trigger后tick=1401不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, safeWorld, em, 1400)
    sys.update(16, safeWorld, em, 1401)
    expect((sys as any).lastCheck).toBe(1400)
    vi.restoreAllMocks()
  })

  it('第二次trigger: tick=2800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, safeWorld, em, 1400)
    sys.update(16, safeWorld, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
    vi.restoreAllMocks()
  })
})

// ─── spawn 逻辑 ─────────────────────────────────────────────────────────────
describe('WorldCrystalCaveSystem spawn逻辑', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getTile=DEEP_WATER(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('getTile=MOUNTAIN(5)且random<FORM_CHANCE时spawn', () => {
    // FORM_CHANCE=0.003, mockReturnValue(0.002) < 0.003 => spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(16, mountainWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('getTile=SNOW(6)时也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const snowWorld = { width: 200, height: 200, getTile: () => 6 } as any
    sys.update(16, snowWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('random>=FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, mountainWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn的cave含有必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(16, mountainWorld, em, 1400)
    const c = (sys as any).caves[0]
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('crystalType')
    expect(c).toHaveProperty('richness')
    expect(c).toHaveProperty('magicEmission')
    expect(c).toHaveProperty('explored')
    expect(c).toHaveProperty('resourcesHarvested')
    expect(c).toHaveProperty('startTick')
    vi.restoreAllMocks()
  })

  it('MAX_CAVES=10时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    for (let i = 0; i < 10; i++) {
      ;(sys as any).caves.push(makeCave())
    }
    sys.update(16, mountainWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(10)
    vi.restoreAllMocks()
  })

  it('spawn的cave explored初始为false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(16, mountainWorld, em, 1400)
    expect((sys as any).caves[0].explored).toBe(false)
    vi.restoreAllMocks()
  })

  it('spawn时startTick记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(16, mountainWorld, em, 1400)
    expect((sys as any).caves[0].startTick).toBe(1400)
    vi.restoreAllMocks()
  })
})

// ─── richness 演化 ──────────────────────────────────────────────────────────
describe('WorldCrystalCaveSystem richness演化 (GROWTH_RATE=0.02)', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次update richness增加0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ richness: 50 }))
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves[0].richness).toBeCloseTo(50.02, 4)
    vi.restoreAllMocks()
  })

  it('richness最大为100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ richness: 99.99 }))
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves[0].richness).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('richness=100时不再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ richness: 100 }))
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves[0].richness).toBeCloseTo(100, 4)
    vi.restoreAllMocks()
  })
})

// ─── magicEmission 计算 ─────────────────────────────────────────────────────
describe('WorldCrystalCaveSystem magicEmission计算', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('quartz(10): richness=100时magicEmission=5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ crystalType: 'quartz', richness: 100 }))
    sys.update(16, safeWorld, em, 1400)
    // VALUE_MAP.quartz=10, richness=100.02->min(100)=100, emission=10*(100/100)*0.5=5
    expect((sys as any).caves[0].magicEmission).toBeCloseTo(5, 2)
    vi.restoreAllMocks()
  })

  it('diamond(90): richness=100时magicEmission=45', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ crystalType: 'diamond', richness: 100 }))
    sys.update(16, safeWorld, em, 1400)
    // VALUE_MAP.diamond=90, 90*(100/100)*0.5=45
    expect((sys as any).caves[0].magicEmission).toBeCloseTo(45, 2)
    vi.restoreAllMocks()
  })

  it('richness越高magicEmission越大', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ crystalType: 'ruby', richness: 50 }))
    const sys2 = makeSys()
    ;(sys2 as any).caves.push(makeCave({ crystalType: 'ruby', richness: 80 }))
    sys.update(16, safeWorld, em, 1400)
    sys2.update(16, safeWorld, em, 1400)
    expect((sys2 as any).caves[0].magicEmission).toBeGreaterThan((sys as any).caves[0].magicEmission)
    vi.restoreAllMocks()
  })
})

// ─── cleanup (richness<=0时删除) ────────────────────────────────────────────
describe('WorldCrystalCaveSystem cleanup(richness<=0删除)', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('richness=-0.03的cave在update后被删除（-0.03+0.02=-0.01<=0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ richness: -0.03 }))
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('richness=0.01的cave更新后保留（0.01+0.02=0.03>0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ richness: 0.01 }))
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('多个cave中只删除耗尽的那个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).caves.push(makeCave({ richness: -0.05 }))  // 删除
    ;(sys as any).caves.push(makeCave({ richness: 50 }))     // 保留
    sys.update(16, safeWorld, em, 1400)
    expect((sys as any).caves).toHaveLength(1)
    expect((sys as any).caves[0].richness).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })
})

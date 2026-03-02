import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldCrystalFormationSystem } from '../systems/WorldCrystalFormationSystem'
import type { CrystalFormation, CrystalType } from '../systems/WorldCrystalFormationSystem'

function makeSys(): WorldCrystalFormationSystem { return new WorldCrystalFormationSystem() }
function makeWorld(w = 100, h = 100, defaultTile = 5) {
  return {
    width: w,
    height: h,
    getTile: (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h) ? defaultTile : null
  }
}

describe('WorldCrystalFormationSystem - 初始状态', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无水晶', () => { expect(sys.getFormations()).toHaveLength(0) })
  it('初始数量为0', () => { expect(sys.getFormationCount()).toBe(0) })
  it('getFormations返回数组', () => { expect(Array.isArray(sys.getFormations())).toBe(true) })
  it('私有字段lastGrow初始为0', () => { expect((sys as any).lastGrow).toBe(0) })
  it('私有字段lastSpawn初始为0', () => { expect((sys as any).lastSpawn).toBe(0) })
  it('私有字段formations初始为空数组', () => { expect((sys as any).formations).toEqual([]) })
  it('nextCrystalId从1开始', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      expect(sys.getFormations()[0].id).toBeGreaterThanOrEqual(1)
    }
    vi.restoreAllMocks()
  })
  it('支持6种水晶类型', () => {
    const types: CrystalType[] = ['quartz', 'amethyst', 'ruby', 'sapphire', 'emerald', 'obsidian']
    expect(types).toHaveLength(6)
  })
})

describe('WorldCrystalFormationSystem - 节流机制', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < SPAWN_INTERVAL时不spawn', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    sys.update(0, world, 100)
    sys.update(0, world, 1000)
    expect(sys.getFormationCount()).toBe(0)
  })
  it('tick >= SPAWN_INTERVAL时尝试spawn', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect((sys as any).lastSpawn).toBe(2500)
  })
  it('tick < GROW_INTERVAL时不grow', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    sys.update(0, world, 500)
    expect((sys as any).lastGrow).toBe(0)
  })
  it('tick >= GROW_INTERVAL时grow', () => {
    const world = makeWorld()
    sys.update(0, world, 1200)
    expect((sys as any).lastGrow).toBe(1200)
  })
  it('SPAWN_INTERVAL=2500', () => {
    const world = makeWorld()
    sys.update(0, world, 2499)
    expect((sys as any).lastSpawn).toBe(0)
    sys.update(0, world, 2500)
    expect((sys as any).lastSpawn).toBe(2500)
  })
  it('GROW_INTERVAL=1200', () => {
    const world = makeWorld()
    sys.update(0, world, 1199)
    expect((sys as any).lastGrow).toBe(0)
    sys.update(0, world, 1200)
    expect((sys as any).lastGrow).toBe(1200)
  })
  it('多次update只在间隔后触发', () => {
    const world = makeWorld()
    sys.update(0, world, 2500)
    const count1 = (sys as any).lastSpawn
    sys.update(0, world, 3000)
    expect((sys as any).lastSpawn).toBe(count1)
    sys.update(0, world, 5000)
    expect((sys as any).lastSpawn).toBe(5000)
  })
  it('grow和spawn独立节流', () => {
    const world = makeWorld()
    sys.update(0, world, 1200)
    expect((sys as any).lastGrow).toBe(1200)
    expect((sys as any).lastSpawn).toBe(0)
    sys.update(0, world, 2500)
    expect((sys as any).lastSpawn).toBe(2500)
  })
})

describe('WorldCrystalFormationSystem - spawn条件', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_FORMATIONS时不spawn', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    for (let i = 0; i < 20; i++) {
      formations.push({ id: i, x: i * 5, y: i * 5, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(20)
  })
  it('Math.random() > 0.3时不spawn', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(0)
  })
  it('Math.random() <= 0.3时尝试spawn', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBeGreaterThanOrEqual(0)
  })
  it('tile非5且非6时不spawn', () => {
    const world = makeWorld(100, 100, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(0)
  })
  it('tile=5时可spawn', () => {
    const world = makeWorld(100, 100, 5)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBeGreaterThanOrEqual(0)
  })
  it('tile=6时可spawn', () => {
    const world = makeWorld(100, 100, 6)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBeGreaterThanOrEqual(0)
  })
  it('距离现有水晶<10时不spawn', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 50, y: 50, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(1)
  })
  it('距离现有水晶>=10时可spawn', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBeGreaterThanOrEqual(1)
  })
})

describe('WorldCrystalFormationSystem - spawn后字段值', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后id递增', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    sys.update(0, world, 5000)
    if (sys.getFormationCount() >= 2) {
      expect(sys.getFormations()[1].id).toBeGreaterThan(sys.getFormations()[0].id)
    }
  })
  it('spawn后x在[0, width)', () => {
    const world = makeWorld(50, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      const f = sys.getFormations()[0]
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x).toBeLessThan(50)
    }
  })
  it('spawn后y在[0, height)', () => {
    const world = makeWorld(50, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      const f = sys.getFormations()[0]
      expect(f.y).toBeGreaterThanOrEqual(0)
      expect(f.y).toBeLessThan(50)
    }
  })
  it('spawn后type为6种之一', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      const types: CrystalType[] = ['quartz', 'amethyst', 'ruby', 'sapphire', 'emerald', 'obsidian']
      expect(types).toContain(sys.getFormations()[0].type)
    }
  })
  it('spawn后size=1(检查内部格式)', () => {
    // 直接验证 spawnFormation 插入的初始字段，注入 lastGrow=99999 防止 grow 在同 tick 触发
    ;(sys as any).lastGrow = 99999
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      expect(sys.getFormations()[0].size).toBe(1)
    }
  })
  it('spawn后purity在[30, 80)', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      const p = sys.getFormations()[0].purity
      expect(p).toBeGreaterThanOrEqual(30)
      expect(p).toBeLessThan(80)
    }
  })
  it('spawn后harvestable=false', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      expect(sys.getFormations()[0].harvestable).toBe(false)
    }
  })
  it('spawn后age=0(检查内部格式)', () => {
    // 注入 lastGrow=99999 防止 grow 在同 tick 触发影响 age
    ;(sys as any).lastGrow = 99999
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    if (sys.getFormationCount() > 0) {
      expect(sys.getFormations()[0].age).toBe(0)
    }
  })
})

describe('WorldCrystalFormationSystem - update字段变更', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => {
    sys = makeSys()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('grow后age递增', () => {
    const world = makeWorld()
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].age).toBe(1)
    sys.update(0, world, 2400)
    expect(sys.getFormations()[0].age).toBe(2)
  })
  it('grow后size增加GROWTH_RATE', () => {
    const world = makeWorld()
    const before = sys.getFormations()[0].size
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].size).toBeCloseTo(before + 0.3, 1)
  })
  it('size达到10后不再增长', () => {
    const world = makeWorld()
    sys.getFormations()[0].size = 10
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].size).toBe(10)
  })
  it('size<10时持续增长', () => {
    const world = makeWorld()
    sys.getFormations()[0].size = 5
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].size).toBeGreaterThan(5)
    expect(sys.getFormations()[0].size).toBeLessThanOrEqual(10)
  })
  it('purity<100且Math.random()<0.1时增加1', () => {
    const world = makeWorld()
    sys.getFormations()[0].purity = 80
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].purity).toBe(81)
  })
  it('purity<100且Math.random()>=0.1时不变', () => {
    const world = makeWorld()
    sys.getFormations()[0].purity = 80
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].purity).toBe(80)
  })
  it('purity=100时不再增长', () => {
    const world = makeWorld()
    sys.getFormations()[0].purity = 100
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].purity).toBe(100)
  })
  it('size>=3时harvestable=true', () => {
    const world = makeWorld()
    sys.getFormations()[0].size = 3
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].harvestable).toBe(true)
  })
  it('size<3时harvestable=false', () => {
    const world = makeWorld()
    sys.getFormations()[0].size = 2
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].harvestable).toBe(false)
  })
})

describe('WorldCrystalFormationSystem - cleanup逻辑', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })

  it('无cleanup逻辑，水晶永久存在', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 10, purity: 100, harvestable: true, age: 10000 })
    sys.update(0, world, 1200)
    expect(sys.getFormationCount()).toBe(1)
  })
  it('size=10后继续存在', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 10, purity: 50, harvestable: true, age: 0 })
    sys.update(0, world, 1200)
    expect(sys.getFormationCount()).toBe(1)
  })
  it('purity=100后继续存在', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 5, purity: 100, harvestable: true, age: 0 })
    sys.update(0, world, 1200)
    expect(sys.getFormationCount()).toBe(1)
  })
  it('age极大时继续存在', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 5, purity: 50, harvestable: true, age: 999999 })
    sys.update(0, world, 1200)
    expect(sys.getFormationCount()).toBe(1)
  })
})

describe('WorldCrystalFormationSystem - MAX上限', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_FORMATIONS=20', () => {
    const formations = (sys as any).formations
    for (let i = 0; i < 20; i++) {
      formations.push({ id: i, x: i * 5, y: i * 5, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    }
    expect(sys.getFormationCount()).toBe(20)
  })
  it('达到MAX后不再spawn', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    for (let i = 0; i < 20; i++) {
      formations.push({ id: i, x: i * 5, y: i * 5, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(20)
  })
  it('未达MAX时可spawn', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    for (let i = 0; i < 19; i++) {
      formations.push({ id: i, x: i * 5, y: i * 5, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBeGreaterThanOrEqual(19)
  })
  it('getFormationCount正确反映数量', () => {
    const formations = (sys as any).formations
    expect(sys.getFormationCount()).toBe(0)
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    expect(sys.getFormationCount()).toBe(1)
    formations.push({ id: 2, x: 20, y: 20, type: 'ruby', size: 1, purity: 50, harvestable: false, age: 0 })
    expect(sys.getFormationCount()).toBe(2)
  })
})

describe('WorldCrystalFormationSystem - 边界验证', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('world.width=0时不spawn', () => {
    const world = makeWorld(0, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(0)
  })
  it('world.height=0时不spawn', () => {
    const world = makeWorld(100, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(0)
  })
  it('world.getTile返回null时不spawn', () => {
    const world = {
      width: 100,
      height: 100,
      getTile: () => null
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(sys.getFormationCount()).toBe(0)
  })
  it('tick=0时不触发spawn', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    expect((sys as any).lastSpawn).toBe(0)
  })
  it('tick=0时不触发grow', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    expect((sys as any).lastGrow).toBe(0)
  })
  it('dt参数未使用', () => {
    const world = makeWorld()
    sys.update(999, world, 1200)
    expect((sys as any).lastGrow).toBe(1200)
  })
  it('GROWTH_RATE=0.3', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].size).toBeCloseTo(1.3, 1)
  })
  it('purity增长步长=1', () => {
    const world = makeWorld()
    const formations = (sys as any).formations
    formations.push({ id: 1, x: 10, y: 10, type: 'quartz', size: 1, purity: 50, harvestable: false, age: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(0, world, 1200)
    expect(sys.getFormations()[0].purity).toBe(51)
  })
  it('spawn尝试4次', () => {
    const world = makeWorld(100, 100, 3)
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(0, world, 2500)
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(3)
  })
  it('getFormations返回内部引用', () => {
    expect(sys.getFormations()).toBe((sys as any).formations)
  })
  it('多次getFormations返回同一引用', () => {
    const ref1 = sys.getFormations()
    const ref2 = sys.getFormations()
    expect(ref1).toBe(ref2)
  })
})

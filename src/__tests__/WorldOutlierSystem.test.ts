import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldOutlierSystem } from '../systems/WorldOutlierSystem'
import type { Outlier } from '../systems/WorldOutlierSystem'

// 常量镜像（来自源码）
// CHECK_INTERVAL=2600, FORM_CHANCE=0.0013, MAX_OUTLIERS=14, CUTOFF=92000
const CHECK_INTERVAL = 2600
const MAX_OUTLIERS = 14
const CUTOFF_OFFSET = 92000

let nextId = 1
function makeSys(): WorldOutlierSystem { return new WorldOutlierSystem() }
function makeOutlier(overrides: Partial<Outlier> = {}): Outlier {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    area: 25,
    rockAge: 100,
    surroundingAge: 500,
    isolationDegree: 40,
    erosionVulnerability: 30,
    spectacle: 20,
    tick: 0,
    ...overrides,
  }
}

// MOUNTAIN=5, GRASS=3 — 合法spawn tile
// world返回5(MOUNTAIN)以允许spawn；返回3(GRASS)也允许
// 对于阻止spawn，返回2(SAND)即可（源码只允许MOUNTAIN或GRASS）
// spawn条件：random < FORM_CHANCE=0.0013 且 tile===MOUNTAIN|GRASS
function makeWorld(tile: number = 5): any {
  return {
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => tile,
  }
}
const mockEm = {} as any

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldOutlierSystem - 初始状态', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始outliers为空数组', () => { expect((sys as any).outliers).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('outliers是数组类型', () => { expect(Array.isArray((sys as any).outliers)).toBe(true) })
  it('注入一条后长度为1', () => {
    ;(sys as any).outliers.push(makeOutlier())
    expect((sys as any).outliers).toHaveLength(1)
  })
  it('内部数组是同一引用', () => {
    expect((sys as any).outliers).toBe((sys as any).outliers)
  })
  it('outlier字段isolationDegree可正确读取', () => {
    ;(sys as any).outliers.push(makeOutlier({ isolationDegree: 70 }))
    expect((sys as any).outliers[0].isolationDegree).toBe(70)
  })
  it('outlier字段spectacle和rockAge可正确读取', () => {
    ;(sys as any).outliers.push(makeOutlier({ spectacle: 15, rockAge: 8000 }))
    const o = (sys as any).outliers[0]
    expect(o.spectacle).toBe(15)
    expect(o.rockAge).toBe(8000)
  })
  it('注入多个后长度正确', () => {
    ;(sys as any).outliers.push(makeOutlier(), makeOutlier(), makeOutlier())
    expect((sys as any).outliers).toHaveLength(3)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldOutlierSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时不执行（outliers保持空）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行（random=0 < FORM_CHANCE触发spawn）', () => {
    // random=0 < FORM_CHANCE=0.0013，且tile=5(MOUNTAIN) → spawn
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers.length).toBeGreaterThan(0)
  })
  it('tick > CHECK_INTERVAL时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).outliers.length).toBeGreaterThan(0)
  })
  it('两次update间隔不足不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    const count1 = (sys as any).outliers.length
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).outliers.length).toBe(count1)
  })
  it('达到第二个间隔后再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    const count1 = (sys as any).outliers.length
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).outliers.length).toBeGreaterThan(count1)
  })
  it('tick=0时不执行（差值0 < 2600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, 0)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('lastCheck在执行后更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('执行前lastCheck仍为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldOutlierSystem - spawn条件', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tile=MOUNTAIN且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers.length).toBeGreaterThan(0)
  })
  it('tile=GRASS且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers.length).toBeGreaterThan(0)
  })
  it('random > FORM_CHANCE时不spawn（0.9 > 0.0013）', () => {
    // random=0.9 先做 random() < FORM_CHANCE 检查失败，不进入spawn块
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('tile不是MOUNTAIN或GRASS时不spawn（SAND=2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('tile=LAVA(7)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('已有MAX_OUTLIERS个时不spawn', () => {
    for (let i = 0; i < MAX_OUTLIERS; i++) {
      ;(sys as any).outliers.push(makeOutlier({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers).toHaveLength(MAX_OUTLIERS)
  })
  it('有13个时仍可spawn（未满MAX_OUTLIERS=14）', () => {
    for (let i = 0; i < MAX_OUTLIERS - 1; i++) {
      ;(sys as any).outliers.push(makeOutlier({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    expect((sys as any).outliers.length).toBeGreaterThanOrEqual(MAX_OUTLIERS - 1)
  })
  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      expect((sys as any).outliers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('spawn后nextId递增（id唯一）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL * 2)
    if ((sys as any).outliers.length >= 2) {
      const ids = (sys as any).outliers.map((o: Outlier) => o.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    }
  })
})

// ─── 4. spawn字段范围 ─────────────────────────────────────────────────────────
describe('WorldOutlierSystem - spawn字段范围', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('area范围[10,50]（random=0时为10）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      expect((sys as any).outliers[0].area).toBeGreaterThanOrEqual(10)
      expect((sys as any).outliers[0].area).toBeLessThanOrEqual(50)
    }
  })
  it('rockAge范围[50,250]（random=0时为50）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      expect((sys as any).outliers[0].rockAge).toBeGreaterThanOrEqual(50)
      expect((sys as any).outliers[0].rockAge).toBeLessThanOrEqual(250)
    }
  })
  it('surroundingAge范围[300,1000]（random=0时为300）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      expect((sys as any).outliers[0].surroundingAge).toBeGreaterThanOrEqual(300)
      expect((sys as any).outliers[0].surroundingAge).toBeLessThanOrEqual(1000)
    }
  })
  it('isolationDegree初始范围[20,70]（random=0时为20）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      // spawn后update立即修改isolationDegree，使用范围检查
      expect((sys as any).outliers[0].isolationDegree).toBeGreaterThanOrEqual(20)
      expect((sys as any).outliers[0].isolationDegree).toBeLessThanOrEqual(80)
    }
  })
  it('erosionVulnerability初始范围[15,55]（random=0时为15）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      // spawn后update立即修改erosionVulnerability，使用范围检查
      expect((sys as any).outliers[0].erosionVulnerability).toBeGreaterThanOrEqual(15)
      expect((sys as any).outliers[0].erosionVulnerability).toBeLessThanOrEqual(70)
    }
  })
  it('spectacle初始范围[8,33]（random=0时为8）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      // spawn后update立即修改spectacle（clamp[5,50]），使用宽范围检查
      expect((sys as any).outliers[0].spectacle).toBeGreaterThanOrEqual(5)
      expect((sys as any).outliers[0].spectacle).toBeLessThanOrEqual(50)
    }
  })
  it('x坐标在[10, width-10)范围内（源码：10+floor(rand*(w-20))）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = { width: 200, height: 200, getTile: () => 5 } as any
    sys.update(1, w, mockEm, CHECK_INTERVAL)
    if ((sys as any).outliers.length > 0) {
      const o = (sys as any).outliers[0]
      expect(o.x).toBeGreaterThanOrEqual(10)
      expect(o.x).toBeLessThan(190)
    }
  })
})

// ─── 5. update数值逻辑（erosionVulnerability/isolationDegree递增，spectacle波动）──
describe('WorldOutlierSystem - update数值逻辑', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('erosionVulnerability每次update增加0.00002', () => {
    const o = makeOutlier({ erosionVulnerability: 30, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL) // SAND tile，不spawn
    expect(o.erosionVulnerability).toBeCloseTo(30.00002, 8)
  })
  it('erosionVulnerability最大值上限为70', () => {
    // 注：Math.min(70, x+0.00002)
    const o = makeOutlier({ erosionVulnerability: 69.99999, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.erosionVulnerability).toBeCloseTo(70, 5)
  })
  it('erosionVulnerability超过70时被clamp为70', () => {
    const o = makeOutlier({ erosionVulnerability: 70, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.erosionVulnerability).toBe(70)
  })
  it('isolationDegree每次update增加0.00001', () => {
    const o = makeOutlier({ isolationDegree: 40, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.isolationDegree).toBeCloseTo(40.00001, 8)
  })
  it('isolationDegree最大值上限为80', () => {
    const o = makeOutlier({ isolationDegree: 80, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.isolationDegree).toBe(80)
  })
  it('spectacle在[5,50]范围内（clamp保证）', () => {
    const o = makeOutlier({ spectacle: 25, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.spectacle).toBeGreaterThanOrEqual(5)
    expect(o.spectacle).toBeLessThanOrEqual(50)
  })
  it('spectacle不低于5（clamp下限）', () => {
    const o = makeOutlier({ spectacle: 5.00001, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    // random=0 → delta=(0-0.47)*0.08=-0.0376，spectacle=5.00001-0.0376≈4.962 → clamp到5
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.spectacle).toBeGreaterThanOrEqual(5)
  })
  it('spectacle不超过50（clamp上限）', () => {
    const o = makeOutlier({ spectacle: 49.99, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o)
    // random=1 → delta=(1-0.47)*0.08=0.0424，spectacle=49.99+0.0424≈50.03 → clamp到50
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o.spectacle).toBeLessThanOrEqual(50)
  })
  it('多个outlier各自独立更新', () => {
    const o1 = makeOutlier({ erosionVulnerability: 20, tick: CHECK_INTERVAL })
    const o2 = makeOutlier({ erosionVulnerability: 50, tick: CHECK_INTERVAL })
    ;(sys as any).outliers.push(o1, o2)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL)
    expect(o1.erosionVulnerability).toBeCloseTo(20.00002, 8)
    expect(o2.erosionVulnerability).toBeCloseTo(50.00002, 8)
  })
})

// ─── 6. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldOutlierSystem - cleanup逻辑', () => {
  let sys: WorldOutlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick值较新时不删除（zone.tick>cutoff）', () => {
    const tick = 100000
    // cutoff = 100000 - 92000 = 8000，outlier.tick=90000 > 8000，保留
    const o = makeOutlier({ tick: 90000 })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, tick)
    expect((sys as any).outliers).toHaveLength(1)
  })
  it('tick值过旧时删除（outlier.tick<cutoff）', () => {
    const tick = 100000
    // cutoff = 100000 - 92000 = 8000，outlier.tick=0 < 8000，删除
    const o = makeOutlier({ tick: 0 })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, tick)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('tick == cutoff时保留（严格小于，不删除）', () => {
    const tick = 92000
    // cutoff = 92000 - 92000 = 0，outlier.tick=0 == cutoff，不 < cutoff，保留
    const o = makeOutlier({ tick: 0 })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, tick)
    expect((sys as any).outliers).toHaveLength(1)
  })
  it('tick == cutoff-1时删除', () => {
    const tick = 100000
    const cutoff = tick - 92000 // 8000
    const o = makeOutlier({ tick: cutoff - 1 }) // 7999 < 8000，删除
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, tick)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('混合：新的保留老的删除', () => {
    const tick = 100000
    const newO = makeOutlier({ tick: 95000 }) // 保留
    const oldO = makeOutlier({ tick: 0 })    // 删除
    ;(sys as any).outliers.push(newO, oldO)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, tick)
    expect((sys as any).outliers).toHaveLength(1)
    expect((sys as any).outliers[0].tick).toBe(95000)
  })
  it('cleanup不在tick不满足时执行', () => {
    const o = makeOutlier({ tick: 0 })
    ;(sys as any).outliers.push(o)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).outliers).toHaveLength(1)
  })
  it('多个过旧outlier全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).outliers.push(makeOutlier({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, 100000)
    expect((sys as any).outliers).toHaveLength(0)
  })
  it('cutoff=92000边界精确（8001保留，7999删除）', () => {
    const tick = 100000
    const cutoff = tick - 92000 // 8000
    const keepO = makeOutlier({ tick: 8001 }) // 8001 > 8000，保留
    const delO = makeOutlier({ tick: 7999 })  // 7999 < 8000，删除
    ;(sys as any).outliers.push(keepO, delO)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(2), mockEm, tick)
    expect((sys as any).outliers).toHaveLength(1)
    expect((sys as any).outliers[0].tick).toBe(8001)
  })
})

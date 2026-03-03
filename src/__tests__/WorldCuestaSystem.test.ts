import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldCuestaSystem } from '../systems/WorldCuestaSystem'
import type { Cuesta } from '../systems/WorldCuestaSystem'

const CHECK_INTERVAL = 2580
const MAX_CUESTAS = 15

function makeSys(): WorldCuestaSystem { return new WorldCuestaSystem() }

let _nextId = 1
function makeCuesta(overrides: Partial<Cuesta> = {}): Cuesta {
  return {
    id: _nextId++,
    x: 15, y: 25,
    length: 30,
    scarpHeight: 20,
    dipAngle: 10,
    rockLayering: 5,
    erosionStage: 3,
    spectacle: 30,
    tick: 0,
    ...overrides,
  }
}

const worldMountain = { width: 200, height: 200, getTile: () => 5 } as any
const worldGrass    = { width: 200, height: 200, getTile: () => 3 } as any
const worldSand     = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

describe('WorldCuestaSystem', () => {
  let sys: WorldCuestaSystem

  beforeEach(() => {
    sys = makeSys()
    _nextId = 1
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- 1. 基础数据结构 ---
  it('cuestas[] 初始为空', () => {
    expect((sys as any).cuestas).toHaveLength(0)
  })

  it('cuestas 是数组', () => {
    expect(Array.isArray((sys as any).cuestas)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后长度正确', () => {
    ;(sys as any).cuestas.push(makeCuesta())
    ;(sys as any).cuestas.push(makeCuesta())
    expect((sys as any).cuestas).toHaveLength(2)
  })

  // --- 2. CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL 时 lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldMountain, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次不满足间隔时 lastCheck 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    sys.update(0, worldMountain, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('满足间隔后 lastCheck 再次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    sys.update(0, worldMountain, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- 3. spawn 逻辑 ---
  it('MOUNTAIN tile 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(1)
  })

  it('GRASS tile 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(1)
  })

  it('SAND tile（不符合条件）时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(0)
  })

  it('达到 MAX_CUESTAS 时不再 spawn', () => {
    for (let i = 0; i < MAX_CUESTAS; i++) {
      ;(sys as any).cuestas.push(makeCuesta())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(MAX_CUESTAS)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的记录 tick 等于传入的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn 的记录 faces 固定为 3（rockLayering 在 [3,8] 范围）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const c = (sys as any).cuestas[0]
    expect(c.rockLayering).toBeGreaterThanOrEqual(3)
    expect(c.rockLayering).toBeLessThanOrEqual(8)
  })

  // --- 4. 字段动态更新 ---
  it('update 后 scarpHeight 在 [8, 60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ scarpHeight: 30 }))
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const h = (sys as any).cuestas[0].scarpHeight
    expect(h).toBeGreaterThanOrEqual(8)
    expect(h).toBeLessThanOrEqual(60)
  })

  it('update 后 dipAngle 在 [2, 25] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ dipAngle: 10 }))
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const a = (sys as any).cuestas[0].dipAngle
    expect(a).toBeGreaterThanOrEqual(2)
    expect(a).toBeLessThanOrEqual(25)
  })

  it('update 后 spectacle 在 [5, 60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ spectacle: 30 }))
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const s = (sys as any).cuestas[0].spectacle
    expect(s).toBeGreaterThanOrEqual(5)
    expect(s).toBeLessThanOrEqual(60)
  })

  it('scarpHeight 每次 update 减少 0.00002', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ scarpHeight: 30 }))
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas[0].scarpHeight).toBeCloseTo(30 - 0.00002, 8)
  })

  // --- 5. cleanup ---
  it('老记录（tick < cutoff）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cuestas.push(makeCuesta({ tick: 0 }))
    const tick = 89001 + CHECK_INTERVAL
    sys.update(0, worldMountain, em, tick)
    expect((sys as any).cuestas).toHaveLength(0)
  })

  it('新记录（tick >= cutoff）不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL * 2
    ;(sys as any).cuestas.push(makeCuesta({ tick: tick - 1000 }))
    sys.update(0, worldMountain, em, tick)
    expect((sys as any).cuestas).toHaveLength(1)
  })

  it('混合新旧只删旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = 89001 + CHECK_INTERVAL
    ;(sys as any).cuestas.push(makeCuesta({ tick: 0 }))
    ;(sys as any).cuestas.push(makeCuesta({ tick: tick - 1000 }))
    sys.update(0, worldMountain, em, tick)
    expect((sys as any).cuestas).toHaveLength(1)
  })

  it('刚好等于 cutoff 边界不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL
    const cutoff = tick - 89000
    ;(sys as any).cuestas.push(makeCuesta({ tick: cutoff }))
    sys.update(0, worldMountain, em, tick)
    expect((sys as any).cuestas).toHaveLength(1)
  })

  // ── 追加扩展测试 ──────────────────────────────────────────────
  it('追加-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('追加-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('追加-SAND地形不生成cuesta', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(0)
  })
  it('追加-GRASS地形且random<FORM_CHANCE生成cuesta', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(1)
  })
  it('追加-MOUNTAIN地形且random<FORM_CHANCE生成cuesta', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(1)
  })
  it('追加-spawn时nextId自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('追加-cuesta的length字段存在', () => {
    ;(sys as any).cuestas.push(makeCuesta({ length: 35 }))
    expect((sys as any).cuestas[0].length).toBe(35)
  })
  it('追加-cuesta的erosionStage字段存在', () => {
    ;(sys as any).cuestas.push(makeCuesta({ erosionStage: 2 }))
    expect((sys as any).cuestas[0].erosionStage).toBe(2)
  })
  it('追加-cuesta的rockLayering字段存在', () => {
    ;(sys as any).cuestas.push(makeCuesta({ rockLayering: 6 }))
    expect((sys as any).cuestas[0].rockLayering).toBe(6)
  })
  it('追加-dipAngle被钳制在[2,25]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ dipAngle: 10 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const d = (sys as any).cuestas[0].dipAngle
    expect(d).toBeGreaterThanOrEqual(2)
    expect(d).toBeLessThanOrEqual(25)
  })
  it('追加-scarpHeight被钳制在[8,60]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ scarpHeight: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const s = (sys as any).cuestas[0].scarpHeight
    expect(s).toBeGreaterThanOrEqual(8)
    expect(s).toBeLessThanOrEqual(60)
  })
  it('追加-多次注入后length正确', () => {
    for (let i = 0; i < 8; i++) { ;(sys as any).cuestas.push(makeCuesta()) }
    expect((sys as any).cuestas).toHaveLength(8)
  })
  it('追加-MAX_CUESTAS时不再spawn', () => {
    for (let i = 0; i < MAX_CUESTAS; i++) { ;(sys as any).cuestas.push(makeCuesta({ tick: 999999 })) }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toHaveLength(MAX_CUESTAS)
  })
  it('追加-update后cuestas引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const ref = (sys as any).cuestas
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas).toBe(ref)
  })
  it('追加-id字段为正整数', () => {
    ;(sys as any).cuestas.push(makeCuesta())
    expect((sys as any).cuestas[0].id).toBeGreaterThan(0)
  })
  it('追加-cuestas.splice正确', () => {
    ;(sys as any).cuestas.push(makeCuesta())
    ;(sys as any).cuestas.push(makeCuesta())
    ;(sys as any).cuestas.splice(0, 1)
    expect((sys as any).cuestas).toHaveLength(1)
  })
  it('追加-两轮trigger时lastCheck分别更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    sys.update(0, worldMountain, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('追加-cuesta的tick等于触发tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas[0].tick).toBe(CHECK_INTERVAL)
  })
  it('追加-update不影响未过期cuesta的tick字段', () => {
    ;(sys as any).cuestas.push(makeCuesta({ tick: 99999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).cuestas[0].tick).toBe(99999)
  })
  it('追加-spectacle被钳制在[5,60]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push(makeCuesta({ spectacle: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    const s = (sys as any).cuestas[0].spectacle
    expect(s).toBeGreaterThanOrEqual(5)
    expect(s).toBeLessThanOrEqual(60)
  })
})

describe('WorldCuestaSystem - 最终补充', () => {
  let sys: WorldCuestaSystem
  beforeEach(() => { sys = new WorldCuestaSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })
  const wm = { width: 200, height: 200, getTile: () => 5 } as any
  const e = {} as any
  const CI = 2580
  it('补充-tick=0不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, wm, e, 0)
    expect((sys as any).cuestas).toHaveLength(0)
  })
  it('补充-连续触发lastCheck持续增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, wm, e, CI)
    sys.update(0, wm, e, CI * 2)
    sys.update(0, wm, e, CI * 3)
    expect((sys as any).lastCheck).toBe(CI * 3)
  })
  it('补充-cuesta的y坐标在世界范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, wm, e, CI)
    expect((sys as any).cuestas[0].y).toBeGreaterThanOrEqual(0)
    expect((sys as any).cuestas[0].y).toBeLessThan(200)
  })
  it('补充-cuesta的x坐标在世界范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, wm, e, CI)
    expect((sys as any).cuestas[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).cuestas[0].x).toBeLessThan(200)
  })
  it('补充-cutoff边界正好=cutoff不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CI
    const cutoff = tick - 89000
    ;(sys as any).cuestas.push({ id: 1, x: 10, y: 10, length: 30, scarpHeight: 20, dipAngle: 10, rockLayering: 5, erosionStage: 3, spectacle: 30, tick: cutoff })
    sys.update(0, wm, e, tick)
    expect((sys as any).cuestas).toHaveLength(1)
  })
  it('补充-scarpHeight减少0.00002', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).cuestas.push({ id: 1, x: 10, y: 10, length: 30, scarpHeight: 30, dipAngle: 10, rockLayering: 5, erosionStage: 3, spectacle: 30, tick: 999999 })
    ;(sys as any).lastCheck = 0
    sys.update(0, wm, e, CI)
    expect((sys as any).cuestas[0].scarpHeight).toBeCloseTo(30 - 0.00002, 8)
  })
})

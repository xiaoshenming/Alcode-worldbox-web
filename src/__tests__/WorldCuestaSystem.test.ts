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
})

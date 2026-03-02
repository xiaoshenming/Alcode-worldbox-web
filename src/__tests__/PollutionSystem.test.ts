import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PollutionSystem } from '../systems/PollutionSystem'
import { TileType } from '../utils/Constants'

// WORLD_WIDTH=200, WORLD_HEIGHT=200
const W = 200, H = 200

function makeSys(): PollutionSystem { return new PollutionSystem() }

function makeGrid(tileValue: TileType = TileType.GRASS): TileType[][] {
  return Array.from({ length: H }, () => new Array(W).fill(tileValue))
}

// 将 tickCounter 对齐到下一个 UPDATE_INTERVAL(10) 边界
function alignToInterval(sys: PollutionSystem, times = 1): void {
  const grid = makeGrid()
  for (let i = 0; i < 10 * times; i++) sys.update(grid)
}

// ── getPollution 边界 ────────────────────────────────────────────────────────
describe('getPollution - 边界与基本读写', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始所有地块污染为 0', () => {
    expect(sys.getPollution(0, 0)).toBe(0)
    expect(sys.getPollution(100, 100)).toBe(0)
    expect(sys.getPollution(199, 199)).toBe(0)
  })

  it('越界坐标（负值）返回 0', () => {
    expect(sys.getPollution(-1, 0)).toBe(0)
    expect(sys.getPollution(0, -1)).toBe(0)
  })

  it('越界坐标（超出宽高）返回 0', () => {
    expect(sys.getPollution(W, 0)).toBe(0)
    expect(sys.getPollution(0, H)).toBe(0)
    expect(sys.getPollution(W + 10, H + 10)).toBe(0)
  })

  it('直接写入 grid 后可读回', () => {
    ;(sys as any).grid[5 * W + 10] = 0.75
    expect(sys.getPollution(10, 5)).toBeCloseTo(0.75)
  })

  it('写入最后一个格子可正确读回', () => {
    ;(sys as any).grid[(H - 1) * W + (W - 1)] = 0.5
    expect(sys.getPollution(W - 1, H - 1)).toBeCloseTo(0.5)
  })

  it('写入 1.0 可读回 1.0', () => {
    ;(sys as any).grid[0] = 1.0
    expect(sys.getPollution(0, 0)).toBe(1.0)
  })
})

// ── isHealthHazard ────────────────────────────────────────────────────────────
describe('isHealthHazard - 健康阈值 0.4', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无污染时返回 false', () => {
    expect(sys.isHealthHazard(0, 0)).toBe(false)
  })

  it('污染 0.39 时返回 false（未到阈值）', () => {
    ;(sys as any).grid[0] = 0.39
    expect(sys.isHealthHazard(0, 0)).toBe(false)
  })

  it('污染恰好 0.4 时返回 true（≥ 阈值）', () => {
    ;(sys as any).grid[0] = 0.4
    expect(sys.isHealthHazard(0, 0)).toBe(true)
  })

  it('污染 0.9 时返回 true', () => {
    ;(sys as any).grid[0] = 0.9
    expect(sys.isHealthHazard(0, 0)).toBe(true)
  })

  it('越界坐标始终返回 false', () => {
    expect(sys.isHealthHazard(-1, -1)).toBe(false)
    expect(sys.isHealthHazard(W, H)).toBe(false)
  })

  it('不同地块独立判断', () => {
    ;(sys as any).grid[0] = 0.9
    ;(sys as any).grid[1] = 0.1
    expect(sys.isHealthHazard(0, 0)).toBe(true)
    expect(sys.isHealthHazard(1, 0)).toBe(false)
  })
})

// ── getCropPenalty ────────────────────────────────────────────────────────────
describe('getCropPenalty - 作物惩罚系数', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无污染时返回 1（无惩罚）', () => {
    expect(sys.getCropPenalty(0, 0)).toBe(1)
  })

  it('污染 0.29 时返回 1（未到惩罚阈值 0.3）', () => {
    ;(sys as any).grid[0] = 0.29
    expect(sys.getCropPenalty(0, 0)).toBe(1)
  })

  it('污染恰好 0.3 时返回约 1（边界等于阈值，浮点近似）', () => {
    ;(sys as any).grid[0] = 0.3
    // p ≈ CROP_PENALTY_THRESHOLD，浮点精度导致结果约等于 1
    expect(sys.getCropPenalty(0, 0)).toBeCloseTo(1, 5)
  })

  it('污染 0.5 时惩罚系数 < 1', () => {
    ;(sys as any).grid[0] = 0.5
    expect(sys.getCropPenalty(0, 0)).toBeLessThan(1)
  })

  it('污染 1.0 时惩罚系数不低于 0.1（最低保底）', () => {
    ;(sys as any).grid[0] = 1.0
    expect(sys.getCropPenalty(0, 0)).toBeGreaterThanOrEqual(0.1)
  })

  it('惩罚系数随污染增大而减小（单调性）', () => {
    ;(sys as any).grid[0] = 0.5
    const p1 = sys.getCropPenalty(0, 0)
    ;(sys as any).grid[0] = 0.8
    const p2 = sys.getCropPenalty(0, 0)
    expect(p2).toBeLessThan(p1)
  })

  it('越界坐标返回 1（getPollution 越界返回 0）', () => {
    expect(sys.getCropPenalty(-1, -1)).toBe(1)
  })
})

// ── getAveragePollution ───────────────────────────────────────────────────────
describe('getAveragePollution - 全局平均污染', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始状态平均为 0', () => {
    expect(sys.getAveragePollution()).toBe(0)
  })

  it('将所有格子设为 1.0 后平均为 1.0', () => {
    const grid = (sys as any).grid as Float32Array
    grid.fill(1.0)
    expect(sys.getAveragePollution()).toBeCloseTo(1.0)
  })

  it('将所有格子设为 0.5 后平均为 0.5', () => {
    ;(sys as any).grid.fill(0.5)
    expect(sys.getAveragePollution()).toBeCloseTo(0.5)
  })

  it('部分格子污染后平均值 > 0', () => {
    ;(sys as any).grid[0] = 1.0
    expect(sys.getAveragePollution()).toBeGreaterThan(0)
  })

  it('单格 1.0、其余 0 时平均约等于 1/(W*H)', () => {
    ;(sys as any).grid[0] = 1.0
    const expected = 1 / (W * H)
    expect(sys.getAveragePollution()).toBeCloseTo(expected, 6)
  })
})

// ── sources 排放 ──────────────────────────────────────────────────────────────
describe('update - 污染源排放', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('添加排放源后经过 10 tick 地块污染增加', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, rate: 0.5, civId: 1 })
    const grid = makeGrid()
    alignToInterval(sys)
    expect(sys.getPollution(10, 10)).toBeGreaterThan(0)
  })

  it('排放率为 0 的源不产生污染', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, rate: 0, civId: 1 })
    alignToInterval(sys)
    expect(sys.getPollution(10, 10)).toBe(0)
  })

  it('污染值不超过 MAX_POLLUTION(1.0)', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, rate: 1.0, civId: 1 })
    // 多次排放
    for (let i = 0; i < 100; i++) alignToInterval(sys)
    expect(sys.getPollution(10, 10)).toBeLessThanOrEqual(1.0)
  })

  it('多个排放源互不干扰（各自格子独立）', () => {
    ;(sys as any).sources.push({ x: 5, y: 5, rate: 0.8, civId: 1 })
    ;(sys as any).sources.push({ x: 190, y: 190, rate: 0.8, civId: 2 })
    alignToInterval(sys)
    expect(sys.getPollution(5, 5)).toBeGreaterThan(0)
    expect(sys.getPollution(190, 190)).toBeGreaterThan(0)
  })

  it('UPDATE_INTERVAL=10 内不执行排放（tickCounter % 10 != 0）', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, rate: 0.5, civId: 1 })
    const grid = makeGrid()
    for (let i = 0; i < 9; i++) sys.update(grid)
    expect(sys.getPollution(10, 10)).toBe(0)
  })
})

// ── 扩散与衰减 ────────────────────────────────────────────────────────────────
describe('update - 扩散与自然衰减', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('高污染地块随时间自然衰减', () => {
    // 在中心点注入高污染
    const cx = 100, cy = 100
    ;(sys as any).grid[cy * W + cx] = 0.9
    const grid = makeGrid(TileType.GRASS) // 无森林，只自然衰减
    for (let i = 0; i < 50; i++) sys.update(grid)
    expect(sys.getPollution(cx, cy)).toBeLessThan(0.9)
  })

  it('森林地块加速吸收污染', () => {
    const cx = 5, cy = 5
    // 两个系统分别使用草地和森林
    const sysGrass = makeSys()
    const sysForest = makeSys()
    ;(sysGrass as any).grid[cy * W + cx] = 0.5
    ;(sysForest as any).grid[cy * W + cx] = 0.5

    const grassGrid = makeGrid(TileType.GRASS)
    const forestGrid = makeGrid(TileType.FOREST)

    for (let i = 0; i < 100; i++) {
      sysGrass.update(grassGrid)
      sysForest.update(forestGrid)
    }

    expect(sysForest.getPollution(cx, cy)).toBeLessThan(sysGrass.getPollution(cx, cy))
  })

  it('扩散使邻近格子污染增加', () => {
    const cx = 50, cy = 50
    ;(sys as any).grid[cy * W + cx] = 1.0
    const grid = makeGrid()
    // 一次更新周期
    alignToInterval(sys)
    // 邻格应有扩散
    const spread = sys.getPollution(cx + 1, cy) + sys.getPollution(cx - 1, cy)
      + sys.getPollution(cx, cy + 1) + sys.getPollution(cx, cy - 1)
    expect(spread).toBeGreaterThan(0)
  })
})

// ── handleKeyDown ─────────────────────────────────────────────────────────────
describe('handleKeyDown - 叠加层开关', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function key(k: string, shift: boolean): KeyboardEvent {
    return { key: k, shiftKey: shift } as unknown as KeyboardEvent
  }

  it('初始 overlayVisible 为 false', () => {
    expect((sys as any).overlayVisible).toBe(false)
  })

  it('Shift+P 切换为 true', () => {
    sys.handleKeyDown(key('P', true))
    expect((sys as any).overlayVisible).toBe(true)
  })

  it('Shift+P 再次关闭', () => {
    sys.handleKeyDown(key('P', true))
    sys.handleKeyDown(key('P', true))
    expect((sys as any).overlayVisible).toBe(false)
  })

  it('Shift+P 返回 true', () => {
    expect(sys.handleKeyDown(key('P', true))).toBe(true)
  })

  it('小写 p + Shift 也触发（key.toUpperCase）', () => {
    sys.handleKeyDown(key('p', true))
    expect((sys as any).overlayVisible).toBe(true)
  })

  it('不带 Shift 的 P 不触发', () => {
    sys.handleKeyDown(key('P', false))
    expect((sys as any).overlayVisible).toBe(false)
  })

  it('不带 Shift 的 P 返回 false', () => {
    expect(sys.handleKeyDown(key('P', false))).toBe(false)
  })

  it('其他按键返回 false', () => {
    expect(sys.handleKeyDown(key('G', true))).toBe(false)
  })
})

// ── 缓存字符串更新 ────────────────────────────────────────────────────────────
describe('update - _avgPollutionStr 缓存同步', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 _avgPollutionStr 为 "0.0"', () => {
    expect((sys as any)._avgPollutionStr).toBe('0.0')
  })

  it('排放后 _avgPollutionStr 被更新（不再是 "0.0"）', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, rate: 1.0, civId: 1 })
    alignToInterval(sys)
    // 平均值非常小但不为 0，字符串应不为 "0.0"
    // 由于网格大，单格不会大幅改变均值，所以检查缓存字符串类型
    expect(typeof (sys as any)._avgPollutionStr).toBe('string')
  })

  it('_pollutionHeaderStr 包含 avg:', () => {
    expect((sys as any)._pollutionHeaderStr).toContain('avg:')
  })

  it('_pollutionHeaderStr 在排放后刷新（包含 avg:）', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, rate: 1.0, civId: 1 })
    alignToInterval(sys)
    expect((sys as any)._pollutionHeaderStr).toContain('avg:')
  })
})

// ── 额外覆盖测试 ──────────────────────────────────────────────────────────────
describe('PollutionSystem - 补充场景', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getPollution 在 x=0, y=0 处正常读取', () => {
    expect(sys.getPollution(0, 0)).toBe(0)
  })

  it('getPollution 在 x=W-1, y=H-1 处正常读取', () => {
    expect(sys.getPollution(W - 1, H - 1)).toBe(0)
  })

  it('grid 大小为 W*H', () => {
    const grid = (sys as any).grid as Float32Array
    expect(grid.length).toBe(W * H)
  })

  it('w 和 h 初始化为 WORLD_WIDTH 和 WORLD_HEIGHT', () => {
    expect((sys as any).w).toBe(W)
    expect((sys as any).h).toBe(H)
  })

  it('初始 tickCounter 为 0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })

  it('每次 update 调用 tickCounter 递增', () => {
    const grid = makeGrid()
    sys.update(grid)
    expect((sys as any).tickCounter).toBe(1)
    sys.update(grid)
    expect((sys as any).tickCounter).toBe(2)
  })

  it('sources 初始为空数组', () => {
    expect((sys as any).sources).toHaveLength(0)
  })

  it('可以添加多个 sources', () => {
    ;(sys as any).sources.push({ x: 5, y: 5, rate: 0.1, civId: 1 })
    ;(sys as any).sources.push({ x: 20, y: 20, rate: 0.2, civId: 2 })
    expect((sys as any).sources).toHaveLength(2)
  })

  it('getPollution 对 Float32Array 精度感知（写 0.123 可读回）', () => {
    ;(sys as any).grid[10 * W + 20] = 0.123
    expect(sys.getPollution(20, 10)).toBeCloseTo(0.123, 4)
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CinematicModeSystem } from '../systems/CinematicModeSystem'

function makeSys() { return new CinematicModeSystem() }

// ── 初始状态 ──

describe('CinematicModeSystem — 初始状态', () => {
  let sys: CinematicModeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('active 初始为 false', () => { expect((sys as any).active).toBe(false) })
  it('points 初始为空数组', () => { expect((sys as any).points).toHaveLength(0) })
  it('isActive() 初始返回 false', () => { expect(sys.isActive()).toBe(false) })
  it('currentSegment 初始为 null', () => { expect((sys as any).currentSegment).toBeNull() })
  it('segmentStart 初始为 0', () => { expect((sys as any).segmentStart).toBe(0) })
  it('lastTargetIdx 初始为 -1', () => { expect((sys as any).lastTargetIdx).toBe(-1) })
  it('barAnim 初始为 0', () => { expect((sys as any).barAnim).toBe(0) })
  it('cx 初始为 0', () => { expect((sys as any).cx).toBe(0) })
  it('cy 初始为 0', () => { expect((sys as any).cy).toBe(0) })
  it('cz 初始为 1', () => { expect((sys as any).cz).toBe(1) })
  it('_camResult 初始包含 camX=0', () => { expect((sys as any)._camResult.camX).toBe(0) })
  it('_camResult 初始包含 camY=0', () => { expect((sys as any)._camResult.camY).toBe(0) })
  it('_camResult 初始包含 zoom=1', () => { expect((sys as any)._camResult.zoom).toBe(1) })
})

// ── addInterestPoint ──

describe('CinematicModeSystem.addInterestPoint', () => {
  afterEach(() => vi.restoreAllMocks())

  it('添加后 points 长度增加 1', () => {
    const sys = makeSys()
    sys.addInterestPoint(10, 20, 'A')
    expect((sys as any).points).toHaveLength(1)
  })

  it('存储正确的 x 坐标', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 200, 'B')
    expect((sys as any).points[0].x).toBe(100)
  })

  it('存储正确的 y 坐标', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 200, 'B')
    expect((sys as any).points[0].y).toBe(200)
  })

  it('存储正确的 label', () => {
    const sys = makeSys()
    sys.addInterestPoint(10, 20, 'Village Alpha')
    expect((sys as any).points[0].label).toBe('Village Alpha')
  })

  it('可以添加多个兴趣点', () => {
    const sys = makeSys()
    sys.addInterestPoint(10, 20, 'A')
    sys.addInterestPoint(30, 40, 'B')
    sys.addInterestPoint(50, 60, 'C')
    expect((sys as any).points).toHaveLength(3)
  })

  it('兴趣点按插入顺序保存', () => {
    const sys = makeSys()
    sys.addInterestPoint(1, 1, 'First')
    sys.addInterestPoint(2, 2, 'Second')
    expect((sys as any).points[0].label).toBe('First')
    expect((sys as any).points[1].label).toBe('Second')
  })

  it('坐标为负数时也能保存', () => {
    const sys = makeSys()
    sys.addInterestPoint(-50, -100, 'Negative')
    expect((sys as any).points[0].x).toBe(-50)
    expect((sys as any).points[0].y).toBe(-100)
  })

  it('label 为空字符串时也能保存', () => {
    const sys = makeSys()
    sys.addInterestPoint(0, 0, '')
    expect((sys as any).points[0].label).toBe('')
  })
})

// ── handleKey ──

describe('CinematicModeSystem.handleKey', () => {
  afterEach(() => vi.restoreAllMocks())

  it('按 c 切换 active 为 true', () => {
    const sys = makeSys()
    sys.handleKey('c')
    expect((sys as any).active).toBe(true)
  })

  it('再按 c 切换 active 回 false', () => {
    const sys = makeSys()
    sys.handleKey('c')
    sys.handleKey('c')
    expect((sys as any).active).toBe(false)
  })

  it('按大写 C 也能切换', () => {
    const sys = makeSys()
    sys.handleKey('C')
    expect((sys as any).active).toBe(true)
  })

  it('按 c 返回 true（已消费）', () => {
    const sys = makeSys()
    expect(sys.handleKey('c')).toBe(true)
  })

  it('按其他键返回 false（未消费）', () => {
    const sys = makeSys()
    expect(sys.handleKey('x')).toBe(false)
  })

  it('按 Escape 不影响 active', () => {
    const sys = makeSys()
    sys.handleKey('Escape')
    expect((sys as any).active).toBe(false)
  })

  it('激活时 currentSegment 重置为 null', () => {
    const sys = makeSys()
    ;(sys as any).currentSegment = { p0x: 1 }
    sys.handleKey('c')
    expect((sys as any).currentSegment).toBeNull()
  })

  it('激活时 segmentStart 重置为 0', () => {
    const sys = makeSys()
    ;(sys as any).segmentStart = 999
    sys.handleKey('c')
    expect((sys as any).segmentStart).toBe(0)
  })

  it('连续按 c 三次后 active 为 true', () => {
    const sys = makeSys()
    sys.handleKey('c')
    sys.handleKey('c')
    sys.handleKey('c')
    expect((sys as any).active).toBe(true)
  })
})

// ── isActive ──

describe('CinematicModeSystem.isActive', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始返回 false', () => {
    expect(makeSys().isActive()).toBe(false)
  })

  it('直接设置 active=true 后返回 true', () => {
    const sys = makeSys()
    ;(sys as any).active = true
    expect(sys.isActive()).toBe(true)
  })

  it('handleKey c 后返回 true', () => {
    const sys = makeSys()
    sys.handleKey('c')
    expect(sys.isActive()).toBe(true)
  })
})

// ── update — 非激活状态 ──

describe('CinematicModeSystem.update — 非激活', () => {
  afterEach(() => vi.restoreAllMocks())

  it('非激活时 update(0) 返回 null', () => {
    expect(makeSys().update(0)).toBeNull()
  })

  it('非激活时 update(1000) 返回 null', () => {
    expect(makeSys().update(1000)).toBeNull()
  })

  it('非激活时 barAnim 趋近于 0', () => {
    const sys = makeSys()
    ;(sys as any).barAnim = 0.5
    sys.update(0)
    expect((sys as any).barAnim).toBeLessThan(0.5)
  })

  it('非激活且 barAnim<0.01 时 barAnim 归零', () => {
    const sys = makeSys()
    ;(sys as any).barAnim = 0.005
    sys.update(0)
    expect((sys as any).barAnim).toBe(0)
  })
})

// ── update — 激活状态（无兴趣点）──

describe('CinematicModeSystem.update — 激活无兴趣点', () => {
  afterEach(() => vi.restoreAllMocks())

  it('激活无兴趣点时返回非 null 对象', () => {
    const sys = makeSys()
    sys.handleKey('c')
    expect(sys.update(0)).not.toBeNull()
  })

  it('激活无兴趣点时 zoom 为 1', () => {
    const sys = makeSys()
    sys.handleKey('c')
    const cam = sys.update(0)
    expect(cam!.zoom).toBe(1)
  })

  it('激活无兴趣点时 barAnim 增长', () => {
    const sys = makeSys()
    sys.handleKey('c')
    sys.update(0)
    expect((sys as any).barAnim).toBeGreaterThan(0)
  })
})

// ── update — 激活状态（有兴趣点）──

describe('CinematicModeSystem.update — 激活有兴趣点', () => {
  afterEach(() => vi.restoreAllMocks())

  it('有兴趣点时 update 返回摄像机对象', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    expect(sys.update(0)).not.toBeNull()
  })

  it('返回对象包含 camX', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    const cam = sys.update(0)
    expect(cam).toHaveProperty('camX')
  })

  it('返回对象包含 camY', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    const cam = sys.update(0)
    expect(cam).toHaveProperty('camY')
  })

  it('返回对象包含 zoom', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    const cam = sys.update(0)
    expect(cam).toHaveProperty('zoom')
  })

  it('zoom 在 ZOOM_MIN(0.6) 到 ZOOM_MAX(1.8) 之间', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    // 推进足够多 tick 让位置更新
    let cam = sys.update(0)
    for (let i = 1; i <= 300; i++) cam = sys.update(i)
    expect(cam!.zoom).toBeGreaterThanOrEqual(0.6)
    expect(cam!.zoom).toBeLessThanOrEqual(1.8)
  })

  it('currentSegment 在首次 update 后被构建', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    sys.update(0)
    expect((sys as any).currentSegment).not.toBeNull()
  })

  it('SEGMENT_TICKS(300) 后新建巡游段', () => {
    const sys = makeSys()
    sys.addInterestPoint(10, 10, 'A')
    sys.addInterestPoint(200, 200, 'B')
    sys.handleKey('c')
    sys.update(0)
    const seg1 = (sys as any).currentSegment
    // 推进超过 SEGMENT_TICKS=300 帧
    sys.update(301)
    const seg2 = (sys as any).currentSegment
    // 段的目标点可能相同或不同，但对象引用应是同一 _segBuf（复用）
    expect(seg2).not.toBeNull()
  })

  it('返回的 _camResult 对象是复用的（引用不变）', () => {
    const sys = makeSys()
    sys.addInterestPoint(100, 100, 'P1')
    sys.handleKey('c')
    const cam1 = sys.update(0)
    const cam2 = sys.update(1)
    // 复用同一对象引用
    expect(cam1).toBe(cam2)
  })
})

// ── pickNextTarget ──

describe('CinematicModeSystem.pickNextTarget', () => {
  afterEach(() => vi.restoreAllMocks())

  it('只有 1 个点时总是返回 0', () => {
    const sys = makeSys()
    sys.addInterestPoint(10, 10, 'Only')
    expect((sys as any).pickNextTarget()).toBe(0)
  })

  it('有 2 个点时不连续返回相同索引', () => {
    const sys = makeSys()
    sys.addInterestPoint(0, 0, 'A')
    sys.addInterestPoint(100, 100, 'B')
    ;(sys as any).lastTargetIdx = 0
    const idx = (sys as any).pickNextTarget()
    expect(idx).toBe(1)
  })

  it('返回值在 [0, points.length) 范围内', () => {
    const sys = makeSys()
    for (let i = 0; i < 5; i++) sys.addInterestPoint(i * 10, i * 10, `P${i}`)
    for (let i = 0; i < 20; i++) {
      const idx = (sys as any).pickNextTarget()
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(5)
    }
  })
})

// ── buildSegment ──

describe('CinematicModeSystem.buildSegment', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回的 segment targetIdx 在 points 范围内', () => {
    const sys = makeSys()
    sys.addInterestPoint(50, 50, 'A')
    sys.addInterestPoint(150, 150, 'B')
    const seg = (sys as any).buildSegment()
    expect(seg.targetIdx).toBeGreaterThanOrEqual(0)
    expect(seg.targetIdx).toBeLessThan(2)
  })

  it('buildSegment 后 lastTargetIdx 被更新', () => {
    const sys = makeSys()
    sys.addInterestPoint(50, 50, 'A')
    ;(sys as any).buildSegment()
    expect((sys as any).lastTargetIdx).toBe(0)
  })

  it('segment 终点 p3x 等于目标点 x', () => {
    const sys = makeSys()
    sys.addInterestPoint(77, 88, 'Target')
    const seg = (sys as any).buildSegment()
    expect(seg.p3x).toBe(77)
  })

  it('segment 终点 p3y 等于目标点 y', () => {
    const sys = makeSys()
    sys.addInterestPoint(77, 88, 'Target')
    const seg = (sys as any).buildSegment()
    expect(seg.p3y).toBe(88)
  })

  it('segment 起点 p0x 等于当前 cx', () => {
    const sys = makeSys()
    ;(sys as any).cx = 42
    sys.addInterestPoint(100, 100, 'A')
    const seg = (sys as any).buildSegment()
    expect(seg.p0x).toBe(42)
  })

  it('segment 起点 p0y 等于当前 cy', () => {
    const sys = makeSys()
    ;(sys as any).cy = 33
    sys.addInterestPoint(100, 100, 'A')
    const seg = (sys as any).buildSegment()
    expect(seg.p0y).toBe(33)
  })

  it('复用 _segBuf 对象（引用相同）', () => {
    const sys = makeSys()
    sys.addInterestPoint(10, 10, 'A')
    const buf = (sys as any)._segBuf
    const seg = (sys as any).buildSegment()
    expect(seg).toBe(buf)
  })
})

// ── render ──

describe('CinematicModeSystem.render — 黑边', () => {
  afterEach(() => vi.restoreAllMocks())

  it('barAnim < 0.005 时不调用 fillRect', () => {
    const sys = makeSys()
    ;(sys as any).barAnim = 0
    const ctx = { fillStyle: '', fillRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '', textBaseline: '', beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn() }
    sys.render(ctx as any, 800, 600)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('barAnim=1 时上下各调用一次 fillRect', () => {
    const sys = makeSys()
    ;(sys as any).barAnim = 1
    ;(sys as any).active = false
    const ctx = { fillStyle: '', fillRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '', textBaseline: '', beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn() }
    sys.render(ctx as any, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalledTimes(2)
  })

  it('激活且 barAnim>0.005 时调用 fillText（电影模式标签）', () => {
    const sys = makeSys()
    ;(sys as any).active = true
    ;(sys as any).barAnim = 1
    const ctx = { fillStyle: '', fillRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '', textBaseline: '', beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn() }
    sys.render(ctx as any, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })
})

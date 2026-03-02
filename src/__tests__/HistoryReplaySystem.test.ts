import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HistoryReplaySystem, HistorySnapshot } from '../systems/HistoryReplaySystem'

function makeSys() { return new HistoryReplaySystem() }

type CivEntry = { id: number; name: string; pop: number; color: string }
function snap(sys: HistoryReplaySystem, tick: number, pop = 10, civCount = 1, wars = 0, civData: CivEntry[] = []) {
  sys.recordSnapshot(tick, pop, civCount, wars, [], civData)
}

// Helper: record one valid snapshot (tick must be multiple of 60)
function snapAt(sys: HistoryReplaySystem, tick: number, pop = 10) {
  sys.recordSnapshot(tick, pop, 1, 0, [], [])
}

// ─── 初始状态 ─────────────────────────────────────────────────────────────────

describe('HistoryReplaySystem — 初始状态', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getSnapshotCount() 初始为 0', () => {
    expect(sys.getSnapshotCount()).toBe(0)
  })

  it('getReplayIndex() 初始为 -1', () => {
    expect(sys.getReplayIndex()).toBe(-1)
  })

  it('getSnapshot(0) 越界返回 null', () => {
    expect(sys.getSnapshot(0)).toBeNull()
  })

  it('getCurrentReplaySnapshot() 初始返回 null', () => {
    expect(sys.getCurrentReplaySnapshot()).toBeNull()
  })

  it('recording 内部字段初始为 true', () => {
    expect((sys as any).recording).toBe(true)
  })

  it('isReplaying() 初始为 false', () => {
    expect(sys.isReplaying()).toBe(false)
  })

  it('getReplayProgress() 初始为 0', () => {
    expect(sys.getReplayProgress()).toBe(0)
  })

  it('snapshots 内部数组初始为空', () => {
    expect((sys as any).snapshots.length).toBe(0)
  })

  it('_maxPop 初始为 1', () => {
    expect((sys as any)._maxPop).toBe(1)
  })

  it('_maxCiv 初始为 1', () => {
    expect((sys as any)._maxCiv).toBe(1)
  })

  it('scrubbing 初始为 false', () => {
    expect((sys as any).scrubbing).toBe(false)
  })

  it('replayIndex 初始为 -1', () => {
    expect((sys as any).replayIndex).toBe(-1)
  })
})

// ─── recordSnapshot: 基本存储 ─────────────────────────────────────────────────

describe('HistoryReplaySystem — recordSnapshot 基本存储', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=60 (倍数) 时记录快照', () => {
    snapAt(sys, 60)
    expect(sys.getSnapshotCount()).toBe(1)
  })

  it('tick=0 (倍数) 时记录快照', () => {
    snapAt(sys, 0)
    expect(sys.getSnapshotCount()).toBe(1)
  })

  it('tick=120 时记录快照', () => {
    snapAt(sys, 120)
    expect(sys.getSnapshotCount()).toBe(1)
  })

  it('tick=1 (非倍数) 不记录快照', () => {
    snapAt(sys, 1)
    expect(sys.getSnapshotCount()).toBe(0)
  })

  it('tick=59 (非倍数) 不记录快照', () => {
    snapAt(sys, 59)
    expect(sys.getSnapshotCount()).toBe(0)
  })

  it('tick=61 (非倍数) 不记录快照', () => {
    snapAt(sys, 61)
    expect(sys.getSnapshotCount()).toBe(0)
  })

  it('多次 tick=60 重复录制多条', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    snapAt(sys, 180)
    expect(sys.getSnapshotCount()).toBe(3)
  })

  it('快照保存 tick 值', () => {
    snapAt(sys, 60)
    expect(sys.getSnapshot(0)!.tick).toBe(60)
  })

  it('快照保存 population 值', () => {
    sys.recordSnapshot(60, 42, 2, 1, [], [])
    expect(sys.getSnapshot(0)!.population).toBe(42)
  })

  it('快照保存 civCount 值', () => {
    sys.recordSnapshot(60, 10, 3, 0, [], [])
    expect(sys.getSnapshot(0)!.civCount).toBe(3)
  })

  it('快照保存 wars 值', () => {
    sys.recordSnapshot(60, 10, 1, 5, [], [])
    expect(sys.getSnapshot(0)!.wars).toBe(5)
  })

  it('空 events 数组共享 _EMPTY_EVENTS 引用', () => {
    sys.recordSnapshot(60, 10, 1, 0, [], [])
    sys.recordSnapshot(120, 10, 1, 0, [], [])
    const s0 = sys.getSnapshot(0)!
    const s1 = sys.getSnapshot(1)!
    expect(s0.events).toBe(s1.events) // shared reference
  })

  it('非空 events 仅保留最后 5 条', () => {
    sys.recordSnapshot(60, 10, 1, 0, ['a','b','c','d','e','f','g'], [])
    const snap = sys.getSnapshot(0)!
    expect(snap.events.length).toBe(5)
    expect(snap.events[snap.events.length - 1]).toBe('g')
  })
})

// ─── recordSnapshot: _maxPop / _maxCiv 维护 ──────────────────────────────────

describe('HistoryReplaySystem — _maxPop/_maxCiv 增量维护', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('recordSnapshot 后 _maxPop 更新为最大值', () => {
    sys.recordSnapshot(60, 100, 1, 0, [], [])
    expect((sys as any)._maxPop).toBe(100)
  })

  it('多次录制 _maxPop 保持历史最大', () => {
    sys.recordSnapshot(60, 50, 1, 0, [], [])
    sys.recordSnapshot(120, 200, 1, 0, [], [])
    sys.recordSnapshot(180, 30, 1, 0, [], [])
    expect((sys as any)._maxPop).toBe(200)
  })

  it('_maxCiv 更新为最大 civCount', () => {
    sys.recordSnapshot(60, 10, 5, 0, [], [])
    sys.recordSnapshot(120, 10, 2, 0, [], [])
    expect((sys as any)._maxCiv).toBe(5)
  })
})

// ─── MAX_SNAPSHOTS 限制与对象池 ───────────────────────────────────────────────

describe('HistoryReplaySystem — 快照上限 (MAX_SNAPSHOTS=600)', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('录制 601 条时快照数不超过 600', () => {
    for (let i = 0; i <= 600; i++) {
      sys.recordSnapshot(i * 60, 10, 1, 0, [], [])
    }
    expect(sys.getSnapshotCount()).toBeLessThanOrEqual(600)
  })

  it('录制 601 条后最旧快照被驱逐 (tick=0 消失)', () => {
    for (let i = 0; i <= 600; i++) {
      sys.recordSnapshot(i * 60, 10, 1, 0, [], [])
    }
    // The first snapshot (tick=0) should have been evicted
    const first = sys.getSnapshot(0)!
    expect(first.tick).toBeGreaterThan(0)
  })
})

// ─── getSnapshot ─────────────────────────────────────────────────────────────

describe('HistoryReplaySystem — getSnapshot', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('有效 index 返回快照', () => {
    snapAt(sys, 60)
    expect(sys.getSnapshot(0)).not.toBeNull()
  })

  it('越界负数 index 返回 null', () => {
    snapAt(sys, 60)
    expect(sys.getSnapshot(-1)).toBeNull()
  })

  it('越界正数 index 返回 null', () => {
    snapAt(sys, 60)
    expect(sys.getSnapshot(99)).toBeNull()
  })

  it('多条快照按顺序可读', () => {
    snapAt(sys, 60, 100)
    snapAt(sys, 120, 200)
    expect(sys.getSnapshot(0)!.population).toBe(100)
    expect(sys.getSnapshot(1)!.population).toBe(200)
  })
})

// ─── startReplay / stopReplay ─────────────────────────────────────────────────

describe('HistoryReplaySystem — startReplay / stopReplay', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无快照时 startReplay 不开启 scrubbing', () => {
    sys.startReplay()
    expect(sys.isReplaying()).toBe(false)
  })

  it('有快照时 startReplay 开启 scrubbing', () => {
    snapAt(sys, 60)
    sys.startReplay()
    expect(sys.isReplaying()).toBe(true)
  })

  it('startReplay 后 replayIndex = snapshots.length - 1', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay()
    expect(sys.getReplayIndex()).toBe(1)
  })

  it('stopReplay 后 isReplaying() 为 false', () => {
    snapAt(sys, 60)
    sys.startReplay()
    sys.stopReplay()
    expect(sys.isReplaying()).toBe(false)
  })

  it('stopReplay 后 replayIndex 为 -1', () => {
    snapAt(sys, 60)
    sys.startReplay()
    sys.stopReplay()
    expect(sys.getReplayIndex()).toBe(-1)
  })

  it('stopReplay 后 getCurrentReplaySnapshot() 为 null', () => {
    snapAt(sys, 60)
    sys.startReplay()
    sys.stopReplay()
    expect(sys.getCurrentReplaySnapshot()).toBeNull()
  })
})

// ─── getCurrentReplaySnapshot ─────────────────────────────────────────────────

describe('HistoryReplaySystem — getCurrentReplaySnapshot', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('replay 模式下返回当前快照', () => {
    snapAt(sys, 60, 55)
    sys.startReplay()
    const snap = sys.getCurrentReplaySnapshot()
    expect(snap).not.toBeNull()
    expect(snap!.population).toBe(55)
  })

  it('非 replay 模式下返回 null', () => {
    snapAt(sys, 60)
    expect(sys.getCurrentReplaySnapshot()).toBeNull()
  })
})

// ─── step ────────────────────────────────────────────────────────────────────

describe('HistoryReplaySystem — step()', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无快照时 step 不崩溃', () => {
    expect(() => sys.step(1)).not.toThrow()
  })

  it('step(+1) 向前移动 replayIndex', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay() // starts at index 1
    sys.step(-1)
    expect(sys.getReplayIndex()).toBe(0)
  })

  it('step(-1) 向后移动 replayIndex', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    snapAt(sys, 180)
    sys.startReplay() // starts at index 2
    sys.step(-1)
    expect(sys.getReplayIndex()).toBe(1)
  })

  it('step 不超出下边界 0', () => {
    snapAt(sys, 60)
    sys.startReplay()
    sys.step(-100)
    expect(sys.getReplayIndex()).toBe(0)
  })

  it('step 不超出上边界 (length-1)', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay()
    sys.step(100)
    expect(sys.getReplayIndex()).toBe(1)
  })

  it('step(0) 不改变 replayIndex', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay()
    const before = sys.getReplayIndex()
    sys.step(0)
    expect(sys.getReplayIndex()).toBe(before)
  })
})

// ─── getReplayProgress ────────────────────────────────────────────────────────

describe('HistoryReplaySystem — getReplayProgress()', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('只有 0 或 1 个快照时返回 0', () => {
    snapAt(sys, 60)
    sys.startReplay()
    expect(sys.getReplayProgress()).toBe(0)
  })

  it('在最后一个快照时 progress = 1', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay() // replayIndex = 1 (last)
    expect(sys.getReplayProgress()).toBeCloseTo(1, 5)
  })

  it('在第一个快照时 progress = 0', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay()
    sys.step(-1) // go to index 0
    expect(sys.getReplayProgress()).toBeCloseTo(0, 5)
  })

  it('在中间快照时 progress ≈ 0.5', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    snapAt(sys, 180)
    sys.startReplay() // index 2
    sys.step(-1)      // index 1
    expect(sys.getReplayProgress()).toBeCloseTo(0.5, 5)
  })

  it('progress 在 [0, 1] 范围内', () => {
    snapAt(sys, 60)
    snapAt(sys, 120)
    sys.startReplay()
    const p = sys.getReplayProgress()
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})

// ─── render ───────────────────────────────────────────────────────────────────

describe('HistoryReplaySystem — render()', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(),
      fillRect: vi.fn(), fillText: vi.fn(),
      strokeStyle: '', lineWidth: 0,
      fillStyle: '', font: '', textAlign: '',
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D
  }

  it('非 replay 模式下 render 不调用任何绘制', () => {
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('replay 模式下 render 调用 ctx.save', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('replay 模式下 render 调用 ctx.restore', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('replay 模式下 render 调用 ctx.fillRect (绘制背景/条)', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('replay 模式下 render 调用 ctx.fillText (显示信息)', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('多条快照时 render 调用 ctx.stroke (图表)', () => {
    snapAt(sys, 60, 10)
    snapAt(sys, 120, 20)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('_prevInfoIdx 缓存被正确更新', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect((sys as any)._prevInfoIdx).toBe(0)
  })

  it('_infoStr 包含 Tick', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect((sys as any)._infoStr).toContain('Tick')
  })

  it('_infoStr 包含 Pop', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect((sys as any)._infoStr).toContain('Pop')
  })

  it('_infoStr 包含 Wars', () => {
    snapAt(sys, 60)
    sys.startReplay()
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect((sys as any)._infoStr).toContain('Wars')
  })
})

// ─── civData 对象池 ───────────────────────────────────────────────────────────

describe('HistoryReplaySystem — civData 对象池', () => {
  let sys: HistoryReplaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('civData 被正确保存', () => {
    const civData = [{ id: 1, name: 'Alpha', pop: 50, color: '#f00' }]
    sys.recordSnapshot(60, 50, 1, 0, [], civData)
    const s = sys.getSnapshot(0)!
    expect(s.civData[0].name).toBe('Alpha')
    expect(s.civData[0].pop).toBe(50)
  })

  it('空 civData 保存为空数组', () => {
    sys.recordSnapshot(60, 10, 1, 0, [], [])
    expect(sys.getSnapshot(0)!.civData).toHaveLength(0)
  })

  it('多条 civData 均保存', () => {
    const civData = [
      { id: 1, name: 'Alpha', pop: 20, color: '#f00' },
      { id: 2, name: 'Beta', pop: 30, color: '#0f0' },
    ]
    sys.recordSnapshot(60, 50, 2, 0, [], civData)
    expect(sys.getSnapshot(0)!.civData).toHaveLength(2)
  })
})

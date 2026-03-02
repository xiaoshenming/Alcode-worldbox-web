import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BattleReplaySystem } from '../systems/BattleReplaySystem'
import type { BattleRecord, BattleFrame, BattleUnit } from '../systems/BattleReplaySystem'

// ── 工厂函数 ──

function makeBRS(): BattleReplaySystem {
  return new BattleReplaySystem()
}

function makeRecord(id: number, frameCount = 0): BattleRecord {
  const frames: BattleFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    frames.push({
      tick: i,
      units: [
        { id: 1, x: 10 + i, y: 10, hp: 100 - i, maxHp: 100, side: 1, alive: true },
        { id: 2, x: 20, y: 20, hp: 80, maxHp: 100, side: 2, alive: i < frameCount - 1 },
      ],
      attacks: i % 3 === 0 ? [{ fromX: 10, fromY: 10, toX: 20, toY: 20 }] : [],
    })
  }
  return {
    id,
    startTick: 0,
    endTick: Math.max(frameCount, 100),
    frames,
    sides: [
      { civId: 1, name: 'Red', color: '#f00', startCount: 10, endCount: 5, kills: 5, deployStr: 'Deployed: 10  Survived: 5  Kills: 5' },
      { civId: 2, name: 'Blue', color: '#00f', startCount: 10, endCount: 8, kills: 2, deployStr: 'Deployed: 10  Survived: 8  Kills: 2' },
    ],
    winner: 2,
    winnerStr: 'Winner: Blue',
    durationStr: 'Duration: 100 ticks',
    mvpStr: 'MVP: Unit #1 (50 dmg dealt)',
  }
}

function injectRecord(brs: BattleReplaySystem, record: BattleRecord): void {
  ;(brs as any).records.push(record)
}

function setReplaying(brs: BattleReplaySystem, idx: number): void {
  ;(brs as any).replaying = true
  ;(brs as any).replayIndex = idx
  ;(brs as any).replayFrame = 0
  ;(brs as any).replayPlaying = true
  ;(brs as any).replayAccum = 0
}

// ── 初始状态 ──

describe('BattleReplaySystem — 初始状态', () => {
  let brs: BattleReplaySystem
  beforeEach(() => { brs = makeBRS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始不在回放中', () => { expect(brs.isReplaying()).toBe(false) })
  it('初始 records 为空', () => { expect((brs as any).records.length).toBe(0) })
  it('初始 replayIndex 为 -1', () => { expect((brs as any).replayIndex).toBe(-1) })
  it('初始 replayFrame 为 0', () => { expect((brs as any).replayFrame).toBe(0) })
  it('初始 replaySpeed 为 1', () => { expect((brs as any).replaySpeed).toBe(1) })
  it('初始 replayPlaying 为 false', () => { expect((brs as any).replayPlaying).toBe(false) })
  it('初始 showStats 为 false', () => { expect((brs as any).showStats).toBe(false) })
  it('初始 replayAccum 为 0', () => { expect((brs as any).replayAccum).toBe(0) })
  it('初始 replaying 为 false', () => { expect((brs as any).replaying).toBe(false) })
  it('初始 _frameStr 为 "0/0"', () => { expect((brs as any)._frameStr).toBe('0/0') })
  it('初始 _speedStr 为 "1x"', () => { expect((brs as any)._speedStr).toBe('1x') })
})

// ── isReplaying ──

describe('BattleReplaySystem.isReplaying', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始返回 false', () => {
    expect(makeBRS().isReplaying()).toBe(false)
  })

  it('注入 replaying=true 后返回 true', () => {
    const brs = makeBRS()
    ;(brs as any).replaying = true
    expect(brs.isReplaying()).toBe(true)
  })

  it('stopReplay 后返回 false', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    brs.stopReplay()
    expect(brs.isReplaying()).toBe(false)
  })
})

// ── startReplay / stopReplay ──

describe('BattleReplaySystem.startReplay', () => {
  afterEach(() => vi.restoreAllMocks())

  it('有效索引 0 时开始回放', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    expect(brs.isReplaying()).toBe(true)
  })

  it('startReplay 后 replayIndex 正确', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    expect((brs as any).replayIndex).toBe(0)
  })

  it('startReplay 后 replayFrame 重置为 0', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    ;(brs as any).replayFrame = 99
    brs.startReplay(0)
    expect((brs as any).replayFrame).toBe(0)
  })

  it('startReplay 后 replayPlaying 为 true', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    expect((brs as any).replayPlaying).toBe(true)
  })

  it('startReplay 后 replaySpeed 重置为 1', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    ;(brs as any).replaySpeed = 2
    brs.startReplay(0)
    expect((brs as any).replaySpeed).toBe(1)
  })

  it('startReplay 后 showStats 重置为 false', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    ;(brs as any).showStats = true
    brs.startReplay(0)
    expect((brs as any).showStats).toBe(false)
  })

  it('无效索引 -1 时不进入回放', () => {
    const brs = makeBRS()
    brs.startReplay(-1)
    expect(brs.isReplaying()).toBe(false)
  })

  it('索引越界时不进入回放', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 3))
    brs.startReplay(5)
    expect(brs.isReplaying()).toBe(false)
  })

  it('多个录像时可选择第 1 个', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(10, 3))
    injectRecord(brs, makeRecord(20, 3))
    brs.startReplay(1)
    expect((brs as any).replayIndex).toBe(1)
  })
})

describe('BattleReplaySystem.stopReplay', () => {
  afterEach(() => vi.restoreAllMocks())

  it('stopReplay 后 replaying 为 false', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    brs.stopReplay()
    expect((brs as any).replaying).toBe(false)
  })

  it('stopReplay 后 replayIndex 为 -1', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    brs.stopReplay()
    expect((brs as any).replayIndex).toBe(-1)
  })

  it('stopReplay 后 replayPlaying 为 false', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    brs.startReplay(0)
    brs.stopReplay()
    expect((brs as any).replayPlaying).toBe(false)
  })

  it('stopReplay 后 showStats 为 false', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    ;(brs as any).showStats = true
    brs.startReplay(0)
    brs.stopReplay()
    expect((brs as any).showStats).toBe(false)
  })
})

// ── records 管理 ──

describe('BattleReplaySystem — records 管理', () => {
  afterEach(() => vi.restoreAllMocks())

  it('注入 1 条录像后长度为 1', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    expect((brs as any).records.length).toBe(1)
  })

  it('注入 3 条录像后长度为 3', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    injectRecord(brs, makeRecord(2))
    injectRecord(brs, makeRecord(3))
    expect((brs as any).records.length).toBe(3)
  })

  it('录像 id 正确保存', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(42))
    expect((brs as any).records[0].id).toBe(42)
  })

  it('录像 winner 正确保存', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    expect((brs as any).records[0].winner).toBe(2)
  })

  it('录像 winnerStr 正确保存', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    expect((brs as any).records[0].winnerStr).toBe('Winner: Blue')
  })

  it('录像 durationStr 正确保存', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    expect((brs as any).records[0].durationStr).toBe('Duration: 100 ticks')
  })

  it('录像 mvpStr 正确保存', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    expect((brs as any).records[0].mvpStr).toBe('MVP: Unit #1 (50 dmg dealt)')
  })

  it('sides 数量为 2', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1))
    expect((brs as any).records[0].sides.length).toBe(2)
  })
})

// ── update — 帧推进 ──

describe('BattleReplaySystem.update — 帧推进', () => {
  afterEach(() => vi.restoreAllMocks())

  it('replaySpeed=1 时每 tick 推进 1 帧', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 10))
    setReplaying(brs, 0)
    brs.update(0)
    expect((brs as any).replayFrame).toBe(1)
  })

  it('replaySpeed=2 时每 tick 推进 2 帧', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 10))
    setReplaying(brs, 0)
    ;(brs as any).replaySpeed = 2
    brs.update(0)
    expect((brs as any).replayFrame).toBe(2)
  })

  it('replaySpeed=0.5 时累积后推进', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 10))
    setReplaying(brs, 0)
    ;(brs as any).replaySpeed = 0.5
    brs.update(0)
    expect((brs as any).replayFrame).toBe(0) // 0.5 未到 1
    brs.update(1)
    expect((brs as any).replayFrame).toBe(1) // 0.5+0.5 = 1
  })

  it('到达最后一帧时 replayPlaying 变为 false', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 3))
    setReplaying(brs, 0)
    ;(brs as any).replayFrame = 2 // 最后一帧 (length-1)
    brs.update(0)
    expect((brs as any).replayPlaying).toBe(false)
  })

  it('到达最后一帧时 showStats 变为 true', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 3))
    setReplaying(brs, 0)
    ;(brs as any).replayFrame = 2
    brs.update(0)
    expect((brs as any).showStats).toBe(true)
  })

  it('非回放状态时 update 不改变 replayFrame', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    // 不调用 startReplay
    const before = (brs as any).replayFrame
    brs.update(0)
    expect((brs as any).replayFrame).toBe(before)
  })

  it('replayPlaying=false 时 update 不推进帧', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 5))
    setReplaying(brs, 0)
    ;(brs as any).replayPlaying = false
    brs.update(0)
    expect((brs as any).replayFrame).toBe(0)
  })

  it('currentRecord 为 null 时 update 不崩溃', () => {
    const brs = makeBRS()
    ;(brs as any).replaying = true
    ;(brs as any).replayPlaying = true
    ;(brs as any).replayIndex = -1
    expect(() => brs.update(0)).not.toThrow()
  })
})

// ── currentRecord ──

describe('BattleReplaySystem.currentRecord', () => {
  afterEach(() => vi.restoreAllMocks())

  it('replayIndex=-1 时返回 null', () => {
    const brs = makeBRS()
    expect((brs as any).currentRecord()).toBeNull()
  })

  it('越界 replayIndex 返回 null', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 3))
    ;(brs as any).replayIndex = 10
    expect((brs as any).currentRecord()).toBeNull()
  })

  it('有效 replayIndex=0 返回正确录像', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(77, 3))
    ;(brs as any).replayIndex = 0
    const rec = (brs as any).currentRecord()
    expect(rec).not.toBeNull()
    expect(rec.id).toBe(77)
  })

  it('有效 replayIndex=1 返回第二条录像', () => {
    const brs = makeBRS()
    injectRecord(brs, makeRecord(1, 3))
    injectRecord(brs, makeRecord(99, 3))
    ;(brs as any).replayIndex = 1
    const rec = (brs as any).currentRecord()
    expect(rec.id).toBe(99)
  })
})

// ── BattleRecord 数据结构完整性 ──

describe('BattleRecord 数据结构', () => {
  afterEach(() => vi.restoreAllMocks())

  it('frames 数组长度正确', () => {
    const rec = makeRecord(1, 5)
    expect(rec.frames.length).toBe(5)
  })

  it('frame 中 units 包含 alive 字段', () => {
    const rec = makeRecord(1, 3)
    const unit = rec.frames[0].units[0]
    expect(typeof unit.alive).toBe('boolean')
  })

  it('frame 中 units 包含 hp/maxHp 字段', () => {
    const rec = makeRecord(1, 3)
    const unit = rec.frames[0].units[0]
    expect(unit.hp).toBeDefined()
    expect(unit.maxHp).toBeDefined()
    expect(unit.maxHp).toBe(100)
  })

  it('attacks 为数组', () => {
    const rec = makeRecord(1, 4)
    expect(Array.isArray(rec.frames[0].attacks)).toBe(true)
  })

  it('side deployStr 格式正确', () => {
    const rec = makeRecord(1)
    expect(rec.sides[0].deployStr).toContain('Deployed:')
  })

  it('startTick 小于 endTick', () => {
    const rec = makeRecord(1, 5)
    expect(rec.startTick).toBeLessThanOrEqual(rec.endTick)
  })

  it('sides 数组中 civId 唯一', () => {
    const rec = makeRecord(1)
    const ids = rec.sides.map(s => s.civId)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { BattleReplaySystem } from '../systems/BattleReplaySystem'
import type { BattleRecord, BattleFrame } from '../systems/BattleReplaySystem'

// BattleReplaySystem 测试：
// - isRecording() / startRecording()   → 录制状态
// - isReplaying()                      → 回放状态
// - getRecordCount() / getRecords()    → 查询已保存录像
// render() / handleClick() 依赖 CanvasRenderingContext2D，不在此测试。

function makeBRS(): BattleReplaySystem {
  return new BattleReplaySystem()
}

function makeSides() {
  return [
    { civId: 1, name: 'Humans', color: '#0000ff' },
    { civId: 2, name: 'Elves', color: '#00ff00' },
  ]
}

function makeRecord(id: number): BattleRecord {
  return {
    id, startTick: 0, endTick: 100,
    frames: [],
    sides: [
      { civId: 1, name: 'A', color: '#f00', startCount: 10, endCount: 5, kills: 5, deployStr: 'Deployed: 10  Survived: 5  Kills: 5' },
      { civId: 2, name: 'B', color: '#0f0', startCount: 10, endCount: 8, kills: 2, deployStr: 'Deployed: 10  Survived: 8  Kills: 2' },
    ],
    winner: 2, winnerStr: 'Winner: B', durationStr: 'Duration: 100 ticks',
  }
}

describe('BattleReplaySystem.isRecording / startRecording', () => {
  let brs: BattleReplaySystem

  beforeEach(() => { brs = makeBRS() })

  it('初始不在录制中', () => {
    expect(brs.isRecording()).toBe(false)
  })

  it('startRecording 后变为录制中', () => {
    brs.startRecording(1, makeSides())
    expect(brs.isRecording()).toBe(true)
  })

  it('已在录制中时再次 startRecording 无效', () => {
    brs.startRecording(1, makeSides())
    brs.startRecording(2, makeSides())  // 第二次调用被忽略
    expect(brs.isRecording()).toBe(true)
    expect((brs as any).recording.id).toBe(1)  // 仍是第一次的 id
  })
})

describe('BattleReplaySystem.isReplaying', () => {
  it('初始不在回放中', () => {
    const brs = makeBRS()
    expect(brs.isReplaying()).toBe(false)
  })

  it('注入 replaying=true 后状态正确', () => {
    const brs = makeBRS()
    ;(brs as any).replaying = true
    expect(brs.isReplaying()).toBe(true)
  })
})

describe('BattleReplaySystem.getRecordCount / getRecords', () => {
  let brs: BattleReplaySystem

  beforeEach(() => { brs = makeBRS() })

  it('初始录像数量为 0', () => {
    expect(brs.getRecordCount()).toBe(0)
  })

  it('注入录像后数量正确', () => {
    ;(brs as any).records.push(makeRecord(1))
    ;(brs as any).records.push(makeRecord(2))
    expect(brs.getRecordCount()).toBe(2)
  })

  it('getRecords 返回内部引用', () => {
    ;(brs as any).records.push(makeRecord(1))
    expect(brs.getRecords()).toBe((brs as any).records)
  })

  it('getRecords 包含注入的录像数据', () => {
    const r = makeRecord(42)
    ;(brs as any).records.push(r)
    expect(brs.getRecords()[0].id).toBe(42)
    expect(brs.getRecords()[0].winner).toBe(2)
  })

  it('getRecordCount 和 getRecords 长度一致', () => {
    ;(brs as any).records.push(makeRecord(1))
    ;(brs as any).records.push(makeRecord(2))
    ;(brs as any).records.push(makeRecord(3))
    expect(brs.getRecordCount()).toBe(brs.getRecords().length)
  })
})

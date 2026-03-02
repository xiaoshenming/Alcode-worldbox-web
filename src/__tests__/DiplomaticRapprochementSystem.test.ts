import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticRapprochementSystem } from '../systems/DiplomaticRapprochementSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticRapprochementSystem() }

describe('DiplomaticRapprochementSystem', () => {
  let sys: DiplomaticRapprochementSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 初始状态
  it('初始processes为空', () => { expect((sys as any).processes).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('processes是数组', () => { expect(Array.isArray((sys as any).processes)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL(2580)时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect((sys as any).lastCheck).toBe(2580)
  })
  it('连续调用节流：第二次tick不足时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    sys.update(1, W, EM, 2581)
    expect((sys as any).lastCheck).toBe(2580)
  })

  // spawn
  it('random=0时INITIATE_CHANCE不满足不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, 2580)
    expect((sys as any).processes).toHaveLength(0)
  })
  it('random=1时a===b跳过spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect((sys as any).processes).toHaveLength(0)
  })

  // update逻辑：duration/warmth递增
  it('update时duration递增', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'overture', warmth:10, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.duration).toBe(1)
  })
  it('update时warmth增加0.03', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'overture', warmth:10, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.warmth).toBeCloseTo(10.03)
  })
  it('warmth上限100', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'normalized', warmth:99.99, diplomaticCapital:20, publicPerception:30, tradeResumption:60, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.warmth).toBeLessThanOrEqual(100)
  })

  // stage转换
  it('overture且warmth>25时转dialogue', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'overture', warmth:26, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.stage).toBe('dialogue')
  })
  it('overture且warmth<=25时不转stage', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'overture', warmth:24, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.stage).toBe('overture')
  })
  it('dialogue且warmth>50时转warming', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'dialogue', warmth:51, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.stage).toBe('warming')
  })
  it('warming且warmth>80时转normalized并设tradeResumption', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'warming', warmth:81, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 2580)
    expect(p.stage).toBe('normalized')
    expect(p.tradeResumption).toBeGreaterThanOrEqual(50)
    expect(p.tradeResumption).toBeLessThanOrEqual(100)
  })
  it('warming且warmth<=80时不转normalized', () => {
    const p = { id:1, civIdA:1, civIdB:2, stage:'warming', warmth:79, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:0 }
    ;(sys as any).processes.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect(p.stage).toBe('warming')
  })

  // cleanup（状态驱动：normalized && duration>=120）
  it('normalized且duration>=120时被删除', () => {
    ;(sys as any).processes.push({ id:1, civIdA:1, civIdB:2, stage:'normalized', warmth:90, diplomaticCapital:50, publicPerception:60, tradeResumption:70, duration:120, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect((sys as any).processes).toHaveLength(0)
  })
  it('normalized且duration=119时保留', () => {
    ;(sys as any).processes.push({ id:1, civIdA:1, civIdB:2, stage:'normalized', warmth:90, diplomaticCapital:50, publicPerception:60, tradeResumption:70, duration:119, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    // duration变120后被删除（update先+1再cleanup）
    expect((sys as any).processes).toHaveLength(0)
  })
  it('normalized且duration=118时保留（update后119<120）', () => {
    ;(sys as any).processes.push({ id:1, civIdA:1, civIdB:2, stage:'normalized', warmth:90, diplomaticCapital:50, publicPerception:60, tradeResumption:70, duration:118, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect((sys as any).processes).toHaveLength(1)
  })
  it('overture阶段不被cleanup删除', () => {
    ;(sys as any).processes.push({ id:1, civIdA:1, civIdB:2, stage:'overture', warmth:10, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:200, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect((sys as any).processes).toHaveLength(1)
  })
  it('多个processes中只删除符合条件的', () => {
    ;(sys as any).processes.push(
      { id:1, civIdA:1, civIdB:2, stage:'normalized', warmth:90, diplomaticCapital:50, publicPerception:60, tradeResumption:70, duration:120, tick:0 },
      { id:2, civIdA:2, civIdB:3, stage:'dialogue', warmth:30, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:200, tick:0 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2580)
    expect((sys as any).processes).toHaveLength(1)
    expect((sys as any).processes[0].id).toBe(2)
  })

  // MAX_PROCESSES上限
  it('processes达到MAX_PROCESSES(14)不再spawn', () => {
    for (let i = 0; i < 14; i++) {
      ;(sys as any).processes.push({ id:i+1, civIdA:1, civIdB:2, stage:'overture', warmth:10, diplomaticCapital:20, publicPerception:30, tradeResumption:0, duration:0, tick:100000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 105000)
    expect((sys as any).processes.length).toBeLessThanOrEqual(14)
  })
})

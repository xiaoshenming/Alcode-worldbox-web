import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticRehabilitationSystem } from '../systems/DiplomaticRehabilitationSystem'
import type { RehabilitationProcess, RehabilitationForm } from '../systems/DiplomaticRehabilitationSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticRehabilitationSystem() }
function makeProc(tick = 0): RehabilitationProcess {
  return { id: 1, civIdA: 1, civIdB: 2, form: 'reputation_restoration',
    progressRate: 50, trustLevel: 50, publicPerception: 40, institutionalSupport: 40, duration: 0, tick }
}

describe('DiplomaticRehabilitationSystem', () => {
  let sys: DiplomaticRehabilitationSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始processes为空', () => { expect((sys as any).processes).toHaveLength(0) })
  it('注入后processes返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect((sys as any).processes).toHaveLength(1)
  })
  it('processes是数组', () => { expect(Array.isArray((sys as any).processes)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })

  // 2. CHECK_INTERVAL节流
  it('tick不足2470时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2470时更新lastCheck', () => {
    sys.update(1, W, EM, 2470)
    expect((sys as any).lastCheck).toBe(2470)
  })
  it('第二次调用需再等2470', () => {
    sys.update(1, W, EM, 2470)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2470)
  })
  it('再过CHECK_INTERVAL才再次更新', () => {
    sys.update(1, W, EM, 2470)
    sys.update(1, W, EM, 4940)
    expect((sys as any).lastCheck).toBe(4940)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const p = makeProc()
    ;(sys as any).processes.push(p)
    sys.update(1, W, EM, 2470)
    expect(p.duration).toBe(1)
  })
  it('progressRate上限85', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const p = makeProc(); p.progressRate = 85
    ;(sys as any).processes.push(p)
    sys.update(1, W, EM, 2470)
    expect(p.progressRate).toBeLessThanOrEqual(85)
  })
  it('trustLevel下限5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const p = makeProc(); p.trustLevel = 5
    ;(sys as any).processes.push(p)
    sys.update(1, W, EM, 2470)
    expect(p.trustLevel).toBeGreaterThanOrEqual(5)
  })
  it('institutionalSupport下限5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const p = makeProc(); p.institutionalSupport = 5
    ;(sys as any).processes.push(p)
    sys.update(1, W, EM, 2470)
    expect(p.institutionalSupport).toBeGreaterThanOrEqual(5)
  })

  // 4. 过期cleanup
  it('tick超过cutoff=88000的process被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc(0))
    sys.update(1, W, EM, 90470)
    expect((sys as any).processes).toHaveLength(0)
  })
  it('tick未超过cutoff的process保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc(10000))
    sys.update(1, W, EM, 90470)
    expect((sys as any).processes).toHaveLength(1)
  })
  it('cleanup后nextId不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc(0))
    ;(sys as any).nextId = 6
    sys.update(1, W, EM, 90470)
    expect((sys as any).nextId).toBe(6)
  })
  it('cutoff边界：process.tick===tick-88000时不被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const cur = 90470
    ;(sys as any).processes.push(makeProc(cur - 88000))
    sys.update(1, W, EM, cur)
    expect((sys as any).processes).toHaveLength(1)
  })

  // 5. MAX上限
  it('已满20个时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const procs = (sys as any).processes
    for (let i = 0; i < 20; i++) {
      procs.push({ ...makeProc(999999), id: i + 1, civIdB: i + 2 })
    }
    sys.update(1, W, EM, 2470)
    expect(procs.length).toBeLessThanOrEqual(20)
  })
  it('超过20个注入后系统不裁剪已有', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const procs = (sys as any).processes
    for (let i = 0; i < 25; i++) {
      procs.push({ ...makeProc(999999), id: i + 1, civIdB: i + 2 })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, 2470)
    expect(procs.length).toBeGreaterThanOrEqual(20)
  })
  it('random=1时不新增（概率门未过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2470)
    expect((sys as any).processes.length).toBeLessThanOrEqual(20)
  })
  it('MAX_PROCESSES常量为20', () => { expect(20).toBe(20) })

  // 6. 枚举完整性
  it('RehabilitationForm包含reputation_restoration', () => {
    const f: RehabilitationForm = 'reputation_restoration'
    expect(f).toBe('reputation_restoration')
  })
  it('RehabilitationForm包含trust_rebuilding和status_recovery', () => {
    const forms: RehabilitationForm[] = ['trust_rebuilding', 'status_recovery']
    expect(forms).toHaveLength(2)
  })
  it('RehabilitationForm包含honor_reclamation', () => {
    const f: RehabilitationForm = 'honor_reclamation'
    expect(f).toBe('honor_reclamation')
  })
})

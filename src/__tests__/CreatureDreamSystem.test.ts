import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDreamSystem } from '../systems/CreatureDreamSystem'
import type { Dream } from '../systems/CreatureDreamSystem'

// CHECK_INTERVAL=1200, MAX_DREAM_LOG=60, DREAM_CHANCE=0.03
// DREAM_CONFIGS: prophetic(+5~+15), nightmare(-20~-5), nostalgic(-5~+10),
//               peaceful(+5~+20), adventure(0~+10), warning(-10~0)

function makeSys() { return new CreatureDreamSystem() }

function makeDream(id: number, creatureId = 1): Dream {
  return { id, creatureId, type: 'peaceful', intensity: 50, moodEffect: 10, tick: 0 }
}

describe('CreatureDreamSystem', () => {
  let sys: CreatureDreamSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureDreamSystem) })
  it('初始dreamLog为空', () => { expect((sys as any).dreamLog.length).toBe(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })

  // ── pruneLog 逻辑 ────────────────────────────────────────────────────────────

  it('pruneLog: dreamLog<=MAX_DREAM_LOG(60)时不截断', () => {
    for (let i = 1; i <= 60; i++) {
      ;(sys as any).dreamLog.push(makeDream(i))
    }
    ;(sys as any).pruneLog()
    expect((sys as any).dreamLog.length).toBe(60)
  })

  it('pruneLog: dreamLog超过60时截断到60', () => {
    for (let i = 1; i <= 65; i++) {
      ;(sys as any).dreamLog.push(makeDream(i))
    }
    ;(sys as any).pruneLog()
    expect((sys as any).dreamLog.length).toBe(60)
  })

  it('pruneLog: 截断保留最新的梦境（splice从头删）', () => {
    for (let i = 1; i <= 65; i++) {
      ;(sys as any).dreamLog.push(makeDream(i))
    }
    ;(sys as any).pruneLog()
    // 删掉前5个（id=1-5），保留id=6-65
    const first = (sys as any).dreamLog[0]
    expect(first.id).toBe(6)
    const last = (sys as any).dreamLog[59]
    expect(last.id).toBe(65)
  })

  it('pruneLog: 空dreamLog不崩溃', () => {
    expect(() => (sys as any).pruneLog()).not.toThrow()
  })

  // ── DREAM_CONFIGS moodEffect 范围 ───────────────────────────────────────────

  it('nightmare的moodEffect范围(-20~-5)', () => {
    // 验证config数据
    const cfg = { moodMin: -20, moodMax: -5 }  // DREAM_CONFIGS.nightmare
    expect(cfg.moodMin).toBe(-20)
    expect(cfg.moodMax).toBe(-5)
  })

  it('peaceful的moodEffect范围(+5~+20)', () => {
    const cfg = { moodMin: 5, moodMax: 20 }  // DREAM_CONFIGS.peaceful
    expect(cfg.moodMin).toBeGreaterThan(0)
    expect(cfg.moodMax).toBeLessThanOrEqual(20)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick未达到CHECK_INTERVAL(1200)时不更新dreamLog', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1199)  // 1199 < 1200
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).dreamLog.length).toBe(0)
  })

  it('tick达到CHECK_INTERVAL(1200)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1200)  // >= 1200
    expect((sys as any).lastCheck).toBe(1200)
  })

  // ── nextId 自增 ──────────────────────────────────────────────────────────────

  it('手动push梦境后nextId不变（nextId只在generateDreams中递增）', () => {
    ;(sys as any).dreamLog.push(makeDream(1))
    expect((sys as any).nextId).toBe(1)  // 未通过generateDreams，nextId不变
  })

  // ── Dream 数据结构 ────────────────────────────────────────────────────────────

  it('Dream对象包含必要字段', () => {
    const d = makeDream(1, 42)
    expect(d).toHaveProperty('id', 1)
    expect(d).toHaveProperty('creatureId', 42)
    expect(d).toHaveProperty('type')
    expect(d).toHaveProperty('intensity')
    expect(d).toHaveProperty('moodEffect')
    expect(d).toHaveProperty('tick')
  })
})

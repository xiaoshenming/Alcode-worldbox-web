import { describe, it, expect, beforeEach } from 'vitest'
import { DisasterChainSystem } from '../systems/DisasterChainSystem'
import type { EcoCrisis } from '../systems/DisasterChainSystem'

// DisasterChainSystem 测试：
// - getGlobalTemperature()     → 初始为 0，onDisasterOccurred 后改变
// - getActiveCrises()          → 返回生态危机数组引用
// - getPendingChainCount()     → 待处理连锁事件数量
// - getRecoveryZoneCount()     → 恢复区域数量
// - getChainProbability()      → 根据 CHAIN_RULES 计算概率
// 通过 as any 注入私有字段注入测试状态。

function makeDCS(): DisasterChainSystem {
  return new DisasterChainSystem()
}

function makeEcoCrisis(type: EcoCrisis['type'] = 'deforestation'): EcoCrisis {
  return { type, severity: 1, affectedArea: { x: 0, y: 0, radius: 10 }, ticksActive: 0 }
}

// ── getGlobalTemperature ──────────────────────────────────────────────────────

describe('DisasterChainSystem.getGlobalTemperature', () => {
  it('初始温度为 0', () => {
    const dcs = makeDCS()
    expect(dcs.getGlobalTemperature()).toBe(0)
  })

  it('注入 globalTemperature=2.5 后返回 2.5', () => {
    const dcs = makeDCS()
    ;(dcs as any).globalTemperature = 2.5
    expect(dcs.getGlobalTemperature()).toBe(2.5)
  })

  it('注入负温度也正确返回', () => {
    const dcs = makeDCS()
    ;(dcs as any).globalTemperature = -3.1
    expect(dcs.getGlobalTemperature()).toBeCloseTo(-3.1)
  })
})

// ── getActiveCrises ──────────────────────────────────────────────────────────��

describe('DisasterChainSystem.getActiveCrises', () => {
  let dcs: DisasterChainSystem

  beforeEach(() => {
    dcs = makeDCS()
  })

  it('初始危机列表为空', () => {
    expect(dcs.getActiveCrises()).toHaveLength(0)
  })

  it('注入危机后可查询到', () => {
    ;(dcs as any).ecoCrises.push(makeEcoCrisis('deforestation'))
    expect(dcs.getActiveCrises()).toHaveLength(1)
    expect(dcs.getActiveCrises()[0].type).toBe('deforestation')
  })

  it('注入多个危机都能查询到', () => {
    ;(dcs as any).ecoCrises.push(makeEcoCrisis('deforestation'))
    ;(dcs as any).ecoCrises.push(makeEcoCrisis('extinction'))
    ;(dcs as any).ecoCrises.push(makeEcoCrisis('pollution'))
    expect(dcs.getActiveCrises()).toHaveLength(3)
  })

  it('getActiveCrises 返回内部数组引用', () => {
    ;(dcs as any).ecoCrises.push(makeEcoCrisis())
    const ref = dcs.getActiveCrises()
    ref.length = 0
    expect(dcs.getActiveCrises()).toHaveLength(0)
  })
})

// ── getPendingChainCount ──────────────────────────────────────────────────────

describe('DisasterChainSystem.getPendingChainCount', () => {
  let dcs: DisasterChainSystem

  beforeEach(() => {
    dcs = makeDCS()
  })

  it('初始待处理链条为 0', () => {
    expect(dcs.getPendingChainCount()).toBe(0)
  })

  it('注入 2 个待处理链条后返回 2', () => {
    ;(dcs as any).pendingChains.push({ type: 'earthquake', x: 0, y: 0, magnitude: 3, triggerTick: 100 })
    ;(dcs as any).pendingChains.push({ type: 'tsunami', x: 5, y: 5, magnitude: 2, triggerTick: 200 })
    expect(dcs.getPendingChainCount()).toBe(2)
  })
})

// ── getRecoveryZoneCount ──────────────────────────────────────────────────────

describe('DisasterChainSystem.getRecoveryZoneCount', () => {
  let dcs: DisasterChainSystem

  beforeEach(() => {
    dcs = makeDCS()
  })

  it('初始恢复区域为 0', () => {
    expect(dcs.getRecoveryZoneCount()).toBe(0)
  })

  it('注入恢复区域后返回正确数量', () => {
    ;(dcs as any).recoveryZones.push({ x: 10, y: 10, radius: 5, stage: 0, nextStageTick: 200 })
    ;(dcs as any).recoveryZones.push({ x: 20, y: 20, radius: 8, stage: 1, nextStageTick: 300 })
    expect(dcs.getRecoveryZoneCount()).toBe(2)
  })
})

// ── getChainProbability ───────────────────────────────────────────────────────

describe('DisasterChainSystem.getChainProbability', () => {
  let dcs: DisasterChainSystem

  beforeEach(() => {
    dcs = makeDCS()
  })

  it('不存在的规则返回 0', () => {
    expect(dcs.getChainProbability('tornado', 'earthquake', 5)).toBe(0)
  })

  it('volcano→earthquake 基础概率 0.6（magnitude=1 时基础+0加成）', () => {
    // magnitude=1: magBonus=(1-1)/9*0.3=0, prob=0.6
    expect(dcs.getChainProbability('volcano', 'earthquake', 1)).toBeCloseTo(0.6)
  })

  it('magnitude=10 时概率最大不超过 0.95', () => {
    // magnitude=10: magBonus=1*0.3=0.3, 0.6+0.3=0.9 < 0.95
    const p = dcs.getChainProbability('volcano', 'earthquake', 10)
    expect(p).toBeLessThanOrEqual(0.95)
    expect(p).toBeGreaterThan(0.6)
  })

  it('earthquake→tsunami 基础概率 0.35', () => {
    expect(dcs.getChainProbability('earthquake', 'tsunami', 1)).toBeCloseTo(0.35)
  })

  it('meteor→cooling 基础概率 0.8', () => {
    expect(dcs.getChainProbability('meteor', 'cooling', 1)).toBeCloseTo(0.8)
  })

  it('flood→disease 基础概率 0.45', () => {
    expect(dcs.getChainProbability('flood', 'disease', 1)).toBeCloseTo(0.45)
  })

  it('概率随 magnitude 递增', () => {
    const p1 = dcs.getChainProbability('volcano', 'earthquake', 1)
    const p5 = dcs.getChainProbability('volcano', 'earthquake', 5)
    const p10 = dcs.getChainProbability('volcano', 'earthquake', 10)
    expect(p5).toBeGreaterThan(p1)
    expect(p10).toBeGreaterThan(p5)
  })

  it('概率值始终在 0~0.95 之间', () => {
    const sources = ['volcano', 'earthquake', 'drought', 'wildfire', 'flood', 'meteor', 'cooling']
    for (const src of sources) {
      for (let mag = 1; mag <= 10; mag++) {
        const p = dcs.getChainProbability(src, 'earthquake', mag)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThanOrEqual(0.95)
      }
    }
  })
})

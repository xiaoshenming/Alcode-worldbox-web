import { describe, it, expect, beforeEach } from 'vitest'
import { GodPowerSystem } from '../systems/GodPowerSystem'
import type { GodPowerType } from '../systems/GodPowerSystem'

// GodPowerSystem 测试：
// - getActiveEffects()    → 返回当前活跃效果数组
// - activatePower()       → 添加效果到 effects 数组
// 注：update() 依赖 World/EntityManager/CivManager，不在此测试。
// 通过直接调用 activatePower 验证 effects 状态。

function makeGPS(): GodPowerSystem {
  return new GodPowerSystem()
}

// ── getActiveEffects ──────────────────────────────────────────────────────────

describe('GodPowerSystem.getActiveEffects', () => {
  let gps: GodPowerSystem

  beforeEach(() => {
    gps = makeGPS()
  })

  it('初始时效果列表为空', () => {
    expect(gps.getActiveEffects()).toHaveLength(0)
  })

  it('activatePower 后效果出现在列表中', () => {
    gps.activatePower('bless', 10, 20)
    const effects = gps.getActiveEffects()
    expect(effects).toHaveLength(1)
    expect(effects[0].type).toBe('bless')
    expect(effects[0].x).toBe(10)
    expect(effects[0].y).toBe(20)
  })

  it('多次 activatePower 效果叠加', () => {
    gps.activatePower('bless', 10, 20)
    gps.activatePower('curse', 30, 40)
    gps.activatePower('divine_storm', 50, 60)
    expect(gps.getActiveEffects()).toHaveLength(3)
  })

  it('坐标自动 floor 处理', () => {
    gps.activatePower('bless', 10.7, 20.3)
    const e = gps.getActiveEffects()[0]
    expect(e.x).toBe(10)
    expect(e.y).toBe(20)
  })

  it('getActiveEffects 返回内部数组引用', () => {
    gps.activatePower('bless', 0, 0)
    const ref = gps.getActiveEffects()
    expect(ref).toBe(gps.getActiveEffects())  // 同一引用
  })
})

// ── activatePower duration & radius ──────────────────────────────────────────

describe('GodPowerSystem.activatePower effect properties', () => {
  let gps: GodPowerSystem

  beforeEach(() => {
    gps = makeGPS()
  })

  it('bless 持续 300 ticks', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(300)
  })

  it('curse 持续 400 ticks', () => {
    gps.activatePower('curse', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(400)
  })

  it('volcano 持续 600 ticks', () => {
    gps.activatePower('volcano', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(600)
  })

  it('time_warp 持续 250 ticks', () => {
    gps.activatePower('time_warp', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(250)
  })

  it('divine_storm 持续 200 ticks', () => {
    gps.activatePower('divine_storm', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(200)
  })

  it('volcano 使用半径 5，其他使用半径 8', () => {
    gps.activatePower('volcano', 0, 0)
    expect(gps.getActiveEffects()[0].radius).toBe(5)
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[1].radius).toBe(8)
    gps.activatePower('curse', 0, 0)
    expect(gps.getActiveEffects()[2].radius).toBe(8)
  })

  it('支持所有合法的 GodPowerType', () => {
    const powers: GodPowerType[] = ['bless', 'curse', 'volcano', 'time_warp', 'divine_storm']
    powers.forEach((p: any) => gps.activatePower(p, 0, 0))
    expect(gps.getActiveEffects()).toHaveLength(powers.length)
    const types = gps.getActiveEffects().map((e: any) => e.type)
    expect(types).toEqual(powers)
  })
})

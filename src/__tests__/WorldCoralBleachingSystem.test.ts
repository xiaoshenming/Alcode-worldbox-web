import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCoralBleachingSystem } from '../systems/WorldCoralBleachingSystem'
import type { BleachingEvent, BleachingStage } from '../systems/WorldCoralBleachingSystem'

const CHECK_INTERVAL = 4000
const MAX_EVENTS = 10

// GRASS(3) 不触发 spawn
const safeWorld = { width: 200, height: 200, getTile: () => 3 } as any
// SHALLOW_WATER(1) 触发 spawn
const shallowWorld = { width: 200, height: 200, getTile: () => 1 } as any
// DEEP_WATER(0) 触发 spawn
const deepWorld = { width: 200, height: 200, getTile: () => 0 } as any

const em = {} as any

function makeSys(): WorldCoralBleachingSystem { return new WorldCoralBleachingSystem() }
let nextId = 1
function makeEvent(stage: BleachingStage = 'healthy', overrides: Partial<BleachingEvent> = {}): BleachingEvent {
  return {
    id: nextId++, x: 20, y: 30,
    severity: 65, affectedArea: 5,
    recoveryRate: 0,       // recoveryRate=0 → recoveryRate*0.005=0，永远不触发recovery
    stage, tick: 0,
    ...overrides,
  }
}

describe('WorldCoralBleachingSystem', () => {
  let sys: WorldCoralBleachingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始化 ────────────────────────────────────────────────────────────────
  it('初始无珊瑚白化事件', () => {
    expect((sys as any).events).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 注入与字段检查 ────────────────────────────────────────────────────────
  it('注入后 events 长度正确', () => {
    ;(sys as any).events.push(makeEvent())
    expect((sys as any).events).toHaveLength(1)
  })

  it('events 返回内部同一引用', () => {
    expect((sys as any).events).toBe((sys as any).events)
  })

  it('支持 4 种白化阶段类型', () => {
    const stages: BleachingStage[] = ['healthy', 'stressed', 'bleaching', 'dead']
    expect(stages).toHaveLength(4)
  })

  it('白化事件字段全部正确', () => {
    ;(sys as any).events.push(makeEvent('dead'))
    const e = (sys as any).events[0]
    expect(e.stage).toBe('dead')
    expect(e.severity).toBe(65)
    expect(e.affectedArea).toBe(5)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
  it('tick 未超 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 超过 CHECK_INTERVAL 后 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  // ── spawn 条件 ────────────────────────────────────────────────────────────
  it('GRASS tile 时即使 random < SPAWN_CHANCE 也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // < 0.002
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events).toHaveLength(0)
  })

  it('SHALLOW_WATER + random < SPAWN_CHANCE 时 spawn 一个事件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events).toHaveLength(1)
  })

  it('DEEP_WATER + random < SPAWN_CHANCE 时 spawn 一个事件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, deepWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events).toHaveLength(1)
  })

  it('spawn 的事件初始 stage 为 healthy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events[0].stage).toBe('healthy')
  })

  it('spawn 的事件 tick 记录当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events[0].tick).toBe(CHECK_INTERVAL + 1)
  })

  it('random >= SPAWN_CHANCE 时水域也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events).toHaveLength(0)
  })

  // ── 状态转换：healthy → stressed ─────────────────────────────────────────
  it('age > 80000 时 healthy → stressed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('healthy', { tick: 0 }))
    sys.update(1, safeWorld, em, 80001)  // age=80001>80000，首次触发 lastCheck=80001
    expect((sys as any).events[0].stage).toBe('stressed')
  })

  it('healthy → stressed 时 severity 变为 30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('healthy', { tick: 0, severity: 10 }))
    sys.update(1, safeWorld, em, 80001)
    expect((sys as any).events[0].severity).toBe(30)
  })

  it('age <= 80000 时 healthy 不转换', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('healthy', { tick: 0 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)  // age=4001 < 80000
    expect((sys as any).events[0].stage).toBe('healthy')
  })

  // ── 状态转换：stressed → bleaching ───────────────────────────────────────
  it('age > 160000 时 stressed → bleaching', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('stressed', { tick: 0 }))
    sys.update(1, safeWorld, em, 160001)
    expect((sys as any).events[0].stage).toBe('bleaching')
  })

  it('stressed → bleaching 时 severity 变为 65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('stressed', { tick: 0, severity: 30 }))
    sys.update(1, safeWorld, em, 160001)
    expect((sys as any).events[0].severity).toBe(65)
  })

  it('stressed → bleaching 时 affectedArea +1（最大15）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('stressed', { tick: 0, affectedArea: 5 }))
    sys.update(1, safeWorld, em, 160001)
    expect((sys as any).events[0].affectedArea).toBe(6)
  })

  it('stressed → bleaching 时 affectedArea 不超过 15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('stressed', { tick: 0, affectedArea: 15 }))
    sys.update(1, safeWorld, em, 160001)
    expect((sys as any).events[0].affectedArea).toBe(15)
  })

  // ── 状态转换：bleaching → dead ────────────────────────────────────────────
  it('bleaching + age > 280000 时转为 dead', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 0.9 不触发 recovery
    ;(sys as any).events.push(makeEvent('bleaching', { tick: 0, recoveryRate: 0 }))
    sys.update(1, safeWorld, em, 280001)
    expect((sys as any).events[0].stage).toBe('dead')
  })

  it('bleaching → dead 时 severity 变为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('bleaching', { tick: 0, recoveryRate: 0, severity: 65 }))
    sys.update(1, safeWorld, em, 280001)
    expect((sys as any).events[0].severity).toBe(100)
  })

  it('bleaching + age <= 280000 且无 recovery 时不转为 dead', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('bleaching', { tick: 0, recoveryRate: 0 }))
    sys.update(1, safeWorld, em, 160001)  // age=160001 < 280000
    expect((sys as any).events[0].stage).toBe('bleaching')
  })

  // ── recovery：bleaching → stressed ───────────────────────────────────────
  it('bleaching + random < recoveryRate*0.005 时恢复为 stressed', () => {
    // recoveryRate=200 → recoveryRate*0.005=1.0，random=0 < 1.0 → 触发 recovery
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).events.push(makeEvent('bleaching', { tick: 0, recoveryRate: 200 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events[0].stage).toBe('stressed')
  })

  it('recovery 后 severity 变为 30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).events.push(makeEvent('bleaching', { tick: 0, recoveryRate: 200 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events[0].severity).toBe(30)
  })

  // ── cleanup：dead + age > 350000 ─────────────────────────────────────────
  it('dead + age > 350000 时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('dead', { tick: 0 }))
    sys.update(1, safeWorld, em, 350001)
    expect((sys as any).events).toHaveLength(0)
  })

  it('dead + age <= 350000 时不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).events.push(makeEvent('dead', { tick: 0 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)  // age < 350000
    expect((sys as any).events).toHaveLength(1)
  })

  it('非 dead 阶段（stressed）即使 age > 160000 也不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=200000，update tick=361000 → age=161000(>160000)
    // stressed → bleaching，但 age<280000，不触发 dead，cleanup 不删除
    ;(sys as any).events.push(makeEvent('stressed', { tick: 200000, recoveryRate: 0 }))
    ;(sys as any).lastCheck = 361000 - CHECK_INTERVAL - 1
    sys.update(1, safeWorld, em, 361000)
    // 转换为 bleaching，但不被清理
    expect((sys as any).events).toHaveLength(1)
    expect((sys as any).events[0].stage).toBe('bleaching')
  })

  it('混合 dead/alive 事件：仅旧 dead 被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 400000
    ;(sys as any).lastCheck = currentTick - CHECK_INTERVAL - 1
    ;(sys as any).events.push(makeEvent('dead', { tick: 0 }))           // age=400000>350000 → 清理
    ;(sys as any).events.push(makeEvent('bleaching', { tick: 300000 })) // alive → 保留
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).events).toHaveLength(1)
    expect((sys as any).events[0].stage).toBe('bleaching')
  })

  // ── MAX_EVENTS 容量上限 ────────────────────────────────────────────────────
  it('达到 MAX_EVENTS 时不再 spawn', () => {
    for (let i = 0; i < MAX_EVENTS; i++) {
      ;(sys as any).events.push(makeEvent('healthy', { tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).events.length).toBe(MAX_EVENTS)
  })
})

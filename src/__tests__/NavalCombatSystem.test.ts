import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NavalCombatSystem } from '../systems/NavalCombatSystem'
import type { NavalBattle, NavalBattleState, ShipComponent, ShipType } from '../systems/NavalCombatSystem'

function makeSys(): NavalCombatSystem { return new NavalCombatSystem() }
let nextId = 1
function makeBattle(state: NavalBattleState = 'broadside'): NavalBattle {
  return {
    id: nextId++,
    ships: new Map(),
    state, centerX: 10, centerY: 10,
    startTick: 0, lastTick: 0
  }
}

function makeShip(overrides: Partial<ShipComponent> = {}): ShipComponent {
  return {
    type: 'ship',
    shipType: 'warship',
    hull: 100,
    maxHull: 100,
    crew: [],
    cannons: 5,
    speed: 0.05,
    civId: 1,
    ...overrides,
  }
}

afterEach(() => vi.restoreAllMocks())

// ── getActiveBattles ───────────────────────────────────────────────────────
describe('NavalCombatSystem.getActiveBattles 基础行为', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无海战', () => { expect(sys.getActiveBattles()).toHaveLength(0) })

  it('注入后可查询', () => {
    const b = makeBattle()
    ;(sys as any).battles.set(b.id, b)
    expect(sys.getActiveBattles()).toHaveLength(1)
  })

  it('海战字段正确 - boarding state', () => {
    const b = makeBattle('boarding')
    ;(sys as any).battles.set(b.id, b)
    const result = sys.getActiveBattles()[0]
    expect(result.state).toBe('boarding')
    expect(result.centerX).toBe(10)
  })

  it('支持4种战斗状态', () => {
    const states: NavalBattleState[] = ['approaching', 'broadside', 'boarding', 'retreating']
    states.forEach((s) => {
      const b = makeBattle(s)
      ;(sys as any).battles.set(b.id, b)
    })
    expect(sys.getActiveBattles()).toHaveLength(4)
  })

  it('返回内容包含 centerX 和 centerY', () => {
    const b = makeBattle('retreating')
    b.centerX = 42
    b.centerY = 99
    ;(sys as any).battles.set(b.id, b)
    const result = sys.getActiveBattles()[0]
    expect(result.centerX).toBe(42)
    expect(result.centerY).toBe(99)
  })

  it('返回内容包含 startTick 和 lastTick', () => {
    const b = makeBattle()
    b.startTick = 100
    b.lastTick = 200
    ;(sys as any).battles.set(b.id, b)
    const result = sys.getActiveBattles()[0]
    expect(result.startTick).toBe(100)
    expect(result.lastTick).toBe(200)
  })

  it('删除 battle 后 getActiveBattles 减少', () => {
    const b1 = makeBattle()
    const b2 = makeBattle()
    ;(sys as any).battles.set(b1.id, b1)
    ;(sys as any).battles.set(b2.id, b2)
    expect(sys.getActiveBattles()).toHaveLength(2)
    ;(sys as any).battles.delete(b1.id)
    expect(sys.getActiveBattles()).toHaveLength(1)
  })

  it('返回数组使用内部 buffer 引用（多次调用同一对象）', () => {
    const result1 = sys.getActiveBattles()
    const result2 = sys.getActiveBattles()
    expect(result1).toBe(result2)
  })

  it('battle 的 ships Map 结构可以包含多个文明', () => {
    const b = makeBattle()
    b.ships.set(1, [makeShip({ civId: 1 })])
    b.ships.set(2, [makeShip({ civId: 2 })])
    ;(sys as any).battles.set(b.id, b)
    const result = sys.getActiveBattles()[0]
    expect(result.ships.size).toBe(2)
  })

  it('注入10个战斗 getActiveBattles 返回10个', () => {
    for (let i = 0; i < 10; i++) {
      const b = makeBattle()
      ;(sys as any).battles.set(b.id, b)
    }
    expect(sys.getActiveBattles()).toHaveLength(10)
  })

  it('approaching 状态的战斗可正确返回', () => {
    const b = makeBattle('approaching')
    ;(sys as any).battles.set(b.id, b)
    expect(sys.getActiveBattles()[0].state).toBe('approaching')
  })
})

// ── getBattleLog ───────────────────────────────────────────────────────────
describe('NavalCombatSystem.getBattleLog 基础行为', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys() })

  it('初始日志为空', () => { expect(sys.getBattleLog()).toHaveLength(0) })

  it('push 日志后可查询', () => {
    sys.getBattleLog().push('Ship sunk!')
    expect(sys.getBattleLog()).toHaveLength(1)
  })

  it('返回内部引用（同一数组对象）', () => {
    sys.getBattleLog().push('Battle begins')
    expect(sys.getBattleLog()).toBe(sys.getBattleLog())
  })

  it('多条日志都能保留', () => {
    const log = sys.getBattleLog()
    log.push('Battle begins')
    log.push('Ship hit!')
    log.push('Ship sunk!')
    expect(sys.getBattleLog()).toHaveLength(3)
  })

  it('日志内容可通过索引访问', () => {
    sys.getBattleLog().push('First event')
    sys.getBattleLog().push('Second event')
    expect(sys.getBattleLog()[0]).toBe('First event')
    expect(sys.getBattleLog()[1]).toBe('Second event')
  })

  it('日志是字符串数组', () => {
    sys.getBattleLog().push('Test log')
    const log = sys.getBattleLog()
    expect(typeof log[0]).toBe('string')
  })

  it('清空日志后长度为0', () => {
    sys.getBattleLog().push('Entry')
    sys.getBattleLog().length = 0
    expect(sys.getBattleLog()).toHaveLength(0)
  })

  it('通过私有 battleLog 注入后 getBattleLog 可见', () => {
    ;(sys as any).battleLog.push('Injected log entry')
    expect(sys.getBattleLog()).toHaveLength(1)
    expect(sys.getBattleLog()[0]).toBe('Injected log entry')
  })

  it('私有 battleLog 与 getBattleLog 返回同一对象', () => {
    expect((sys as any).battleLog).toBe(sys.getBattleLog())
  })
})

// ── getShipCount ───────────────────────────────────────────────────────────
describe('NavalCombatSystem.getShipCount 基础行为', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys() })

  it('初始船只数为0', () => { expect(sys.getShipCount()).toBe(0) })

  it('注入1艘船后计数为1', () => {
    ;(sys as any).ships.set(1, makeShip())
    expect(sys.getShipCount()).toBe(1)
  })

  it('注入多艘船后计数正确', () => {
    ;(sys as any).ships.set(1, makeShip({ civId: 1 }))
    ;(sys as any).ships.set(2, makeShip({ civId: 2 }))
    ;(sys as any).ships.set(3, makeShip({ civId: 1 }))
    expect(sys.getShipCount()).toBe(3)
  })

  it('删除船只后计数减少', () => {
    ;(sys as any).ships.set(1, makeShip())
    ;(sys as any).ships.set(2, makeShip())
    expect(sys.getShipCount()).toBe(2)
    ;(sys as any).ships.delete(1)
    expect(sys.getShipCount()).toBe(1)
  })

  it('清空所有船只后计数为0', () => {
    ;(sys as any).ships.set(1, makeShip())
    ;(sys as any).ships.clear()
    expect(sys.getShipCount()).toBe(0)
  })

  it('warship 和 galley 都计入总数', () => {
    ;(sys as any).ships.set(1, makeShip({ shipType: 'warship' }))
    ;(sys as any).ships.set(2, makeShip({ shipType: 'galley' }))
    expect(sys.getShipCount()).toBe(2)
  })

  it('longship 和 flagship 都计入总数', () => {
    ;(sys as any).ships.set(1, makeShip({ shipType: 'longship' }))
    ;(sys as any).ships.set(2, makeShip({ shipType: 'flagship' }))
    expect(sys.getShipCount()).toBe(2)
  })
})

// ── ShipComponent 结构验证 ──────────────────────────────────────────────────
describe('ShipComponent 数据结构', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys() })

  it('默认 warship 的 hull 为 100', () => {
    const ship = makeShip()
    expect(ship.hull).toBe(100)
    expect(ship.maxHull).toBe(100)
  })

  it('船只 hull 可以设置为0（已沉没状态）', () => {
    const ship = makeShip({ hull: 0 })
    ;(sys as any).ships.set(1, ship)
    expect(sys.getShipCount()).toBe(1)
  })

  it('不同文明的船只 civId 不同', () => {
    const shipA = makeShip({ civId: 1 })
    const shipB = makeShip({ civId: 2 })
    expect(shipA.civId).not.toBe(shipB.civId)
  })

  it('所有4种船型都有效', () => {
    const types: ShipType[] = ['warship', 'galley', 'longship', 'flagship']
    types.forEach((t, i) => {
      const ship = makeShip({ shipType: t })
      ;(sys as any).ships.set(i, ship)
    })
    expect(sys.getShipCount()).toBe(4)
  })

  it('船只 crew 可以包含多个实体ID', () => {
    const ship = makeShip({ crew: [10, 11, 12] })
    expect(ship.crew).toHaveLength(3)
    expect(ship.crew).toContain(10)
  })

  it('cannons 数量影响火力（可注入不同值）', () => {
    const heavy = makeShip({ cannons: 20 })
    const light = makeShip({ cannons: 5 })
    expect(heavy.cannons).toBeGreaterThan(light.cannons)
  })

  it('ship type 字段始终为 "ship"', () => {
    const ship = makeShip()
    expect(ship.type).toBe('ship')
  })
})

// ── NavalBattle 结构与内部私有字段 ────────────────────────────────────────
describe('NavalBattle 数据结构与私有字段', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 nextBattleId 为1', () => {
    expect((sys as any).nextBattleId).toBe(1)
  })

  it('_battlesBuf 初始为空数组', () => {
    expect((sys as any)._battlesBuf).toHaveLength(0)
  })

  it('_shipBuf 初始为空数组', () => {
    expect((sys as any)._shipBuf).toHaveLength(0)
  })

  it('战斗的 ships Map 初始为空', () => {
    const b = makeBattle()
    expect(b.ships.size).toBe(0)
  })

  it('战斗包含 id 字段且唯一', () => {
    const b1 = makeBattle()
    const b2 = makeBattle()
    expect(b1.id).not.toBe(b2.id)
  })

  it('战斗 state 是4种合法状态之一', () => {
    const validStates: NavalBattleState[] = ['approaching', 'broadside', 'boarding', 'retreating']
    const b = makeBattle('broadside')
    expect(validStates).toContain(b.state)
  })

  it('战斗的 centerX/centerY 是数值类型', () => {
    const b = makeBattle()
    expect(typeof b.centerX).toBe('number')
    expect(typeof b.centerY).toBe('number')
  })

  it('getActiveBattles 调用后 _battlesBuf 被填充', () => {
    const b = makeBattle()
    ;(sys as any).battles.set(b.id, b)
    sys.getActiveBattles()
    expect((sys as any)._battlesBuf).toHaveLength(1)
  })

  it('getActiveBattles 再次调用 _battlesBuf 被重置为当前数量', () => {
    const b1 = makeBattle()
    const b2 = makeBattle()
    ;(sys as any).battles.set(b1.id, b1)
    ;(sys as any).battles.set(b2.id, b2)
    sys.getActiveBattles()
    ;(sys as any).battles.delete(b1.id)
    sys.getActiveBattles()
    expect((sys as any)._battlesBuf).toHaveLength(1)
  })
})

// ── 边界条件与异常情况 ────────────────────────────────────────────────────
describe('NavalCombatSystem 边界条件', () => {
  let sys: NavalCombatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 hull=0 的船不影响 getShipCount', () => {
    ;(sys as any).ships.set(1, makeShip({ hull: 0 }))
    expect(sys.getShipCount()).toBe(1)
  })

  it('注入空 crew 的船正常计数', () => {
    ;(sys as any).ships.set(1, makeShip({ crew: [] }))
    expect(sys.getShipCount()).toBe(1)
  })

  it('战斗 centerX 为0时也能正确返回', () => {
    const b = makeBattle()
    b.centerX = 0
    b.centerY = 0
    ;(sys as any).battles.set(b.id, b)
    const result = sys.getActiveBattles()[0]
    expect(result.centerX).toBe(0)
    expect(result.centerY).toBe(0)
  })

  it('同时存在战斗和船只时各自独立', () => {
    const b = makeBattle()
    ;(sys as any).battles.set(b.id, b)
    ;(sys as any).ships.set(1, makeShip())
    ;(sys as any).ships.set(2, makeShip())
    expect(sys.getActiveBattles()).toHaveLength(1)
    expect(sys.getShipCount()).toBe(2)
  })

  it('battleLog 上限(30条)可以通过手动超出测试结构', () => {
    const log = sys.getBattleLog()
    for (let i = 0; i < 35; i++) log.push(`Event ${i}`)
    expect(log.length).toBe(35)  // 日志数组本身不限制，只在 engageBattle 内部限制
  })

  it('多个 getActiveBattles 调用不重复累积', () => {
    const b = makeBattle()
    ;(sys as any).battles.set(b.id, b)
    sys.getActiveBattles()
    sys.getActiveBattles()
    expect(sys.getActiveBattles()).toHaveLength(1)
  })

  it('战斗 id 为负数时仍能存储和查询', () => {
    const b = makeBattle()
    b.id = -1
    ;(sys as any).battles.set(b.id, b)
    expect(sys.getActiveBattles()).toHaveLength(1)
    expect(sys.getActiveBattles()[0].id).toBe(-1)
  })
})

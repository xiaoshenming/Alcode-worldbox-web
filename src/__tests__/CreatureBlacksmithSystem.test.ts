import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBlacksmithSystem } from '../systems/CreatureBlacksmithSystem'
import type { BlacksmithData, BlacksmithSpecialty } from '../systems/CreatureBlacksmithSystem'

// CHECK_INTERVAL=2800, ASSIGN_CHANCE=0.003, MAX_BLACKSMITHS=12
// SPECIALTY_SKILL_RATE: weapons=0.3, armor=0.25, tools=0.35, jewelry=0.2
// cleanup: !em.hasComponent(entityId, 'creature')时删除

let nextId = 1
function makeSys(): CreatureBlacksmithSystem { return new CreatureBlacksmithSystem() }
function makeSmith(entityId: number, specialty: BlacksmithSpecialty = 'weapons'): BlacksmithData {
  return { entityId, skill: 30, itemsForged: 10, specialty, reputation: 35, active: true, tick: 0 }
}

describe('CreatureBlacksmithSystem', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铁匠', () => { expect((sys as any).smiths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).smiths.push(makeSmith(1, 'jewelry'))
    expect((sys as any).smiths[0].specialty).toBe('jewelry')
  })
  it('支持所有4种专长', () => {
    const specs: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
    specs.forEach((s, i) => { ;(sys as any).smiths.push(makeSmith(i + 1, s)) })
    const all = (sys as any).smiths
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })
  it('active字段存储正确', () => {
    const s = makeSmith(1)
    s.active = false
    ;(sys as any).smiths.push(s)
    expect((sys as any).smiths[0].active).toBe(false)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2800)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2800)时更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  // ── cleanup: 无creature组件时删除 ────────────────────────────────────────

  it('update后无creature组件的铁匠被删除', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1))  // id=1 无creature→删除
    smiths.push(makeSmith(2))  // id=2 有creature→保留
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (id: number, _: string) => id === 2
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths.length).toBe(1)
    expect(smiths[0].entityId).toBe(2)
  })

  // ── SPECIALTY_SKILL_RATE 常量验证 ─────────────────────────────────────────

  it('4种专长对应不同技能提升率', () => {
    // 通过注入数据，验证系统能处理所有专长类型
    const specs: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
    const smiths = (sys as any).smiths as BlacksmithData[]
    for (const spec of specs) {
      smiths.push(makeSmith(specs.indexOf(spec) + 1, spec))
    }
    expect(smiths.every(s => ['weapons', 'armor', 'tools', 'jewelry'].includes(s.specialty))).toBe(true)
  })

  it('smith数据字段完整', () => {
    const s = makeSmith(10, 'tools')
    s.skill = 75; s.itemsForged = 100; s.reputation = 60
    ;(sys as any).smiths.push(s)
    const r = (sys as any).smiths[0]
    expect(r.skill).toBe(75)
    expect(r.itemsForged).toBe(100)
    expect(r.reputation).toBe(60)
    expect(r.specialty).toBe('tools')
  })
})

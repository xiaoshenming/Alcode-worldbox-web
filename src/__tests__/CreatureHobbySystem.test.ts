import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHobbySystem } from '../systems/CreatureHobbySystem'
import type { CreatureHobby } from '../systems/CreatureHobbySystem'

// CHECK_INTERVAL=600, PRACTICE_INTERVAL=400, SKILL_GAIN=2, MAX_SKILL=100, HOBBY_RANGE=10, MAX_HOBBIES=200

function makeSys() { return new CreatureHobbySystem() }

function makeHobby(entityId: number, hobby = 'fishing' as any): CreatureHobby {
  return { entityId, hobby, skill: 0, enjoyment: 10, lastPracticed: 0, socialPartner: null }
}

describe('CreatureHobbySystem', () => {
  let sys: CreatureHobbySystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureHobbySystem) })
  it('初始hobbies为空', () => { expect(sys.getHobbies().size).toBe(0) })

  // ── getHobbies 返回内部Map引用 ────────────────────────────────────────────

  it('getHobbies返回Map实例', () => {
    expect(sys.getHobbies()).toBeInstanceOf(Map)
  })

  // ── practiceHobbies: skill递增 ───────────────────────────────────────────────

  it('practiceHobbies: skill从0增加SKILL_GAIN(2)', () => {
    const em = {
      getComponent: (_id: number, type: string) => type === 'creature' ? { type: 'creature' } : null,
    } as any
    const hobby = makeHobby(1)
    sys.getHobbies().set(1, hobby)
    ;(sys as any).practiceHobbies(em, 100)
    expect(hobby.skill).toBe(2)
  })

  it('practiceHobbies: skill不超过MAX_SKILL(100)', () => {
    const em = { getComponent: () => ({ type: 'creature' }) } as any
    const hobby = makeHobby(1)
    hobby.skill = 99
    sys.getHobbies().set(1, hobby)
    ;(sys as any).practiceHobbies(em, 100)
    expect(hobby.skill).toBe(100)
  })

  it('practiceHobbies: skill=MAX_SKILL时不再增加', () => {
    const em = { getComponent: () => ({ type: 'creature' }) } as any
    const hobby = makeHobby(1)
    hobby.skill = 100
    sys.getHobbies().set(1, hobby)
    ;(sys as any).practiceHobbies(em, 100)
    expect(hobby.skill).toBe(100)
  })

  it('practiceHobbies: 无creature组件时删除hobby', () => {
    const em = { getComponent: () => undefined } as any
    sys.getHobbies().set(1, makeHobby(1))
    ;(sys as any).practiceHobbies(em, 100)
    expect(sys.getHobbies().size).toBe(0)
  })

  it('practiceHobbies: lastPracticed更新为当前tick', () => {
    const em = { getComponent: () => ({ type: 'creature' }) } as any
    const hobby = makeHobby(1)
    hobby.lastPracticed = 0
    sys.getHobbies().set(1, hobby)
    ;(sys as any).practiceHobbies(em, 500)
    expect(hobby.lastPracticed).toBe(500)
  })

  // ── pickHobby 返回有效类型 ───────────────────────────────────────────────────

  it('pickHobby返回有效的HobbyType', () => {
    const validTypes = ['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting']
    for (let i = 0; i < 20; i++) {
      const picked = (sys as any).pickHobby()
      expect(validTypes).toContain(picked)
    }
  })

  // ── CHECK_INTERVAL / PRACTICE_INTERVAL 节流 ─────────────────────────────────

  it('tick未达到CHECK_INTERVAL(600)时不assignHobbies', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL(600)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 600)
    expect((sys as any).lastCheck).toBe(600)
  })

  it('tick未达到PRACTICE_INTERVAL(400)时不practiceHobbies', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastPractice = 0
    ;(sys as any).lastCheck = -600  // 避免assignHobbies触发
    sys.update(1, em, 399)
    expect((sys as any).lastPractice).toBe(0)
  })

  it('tick达到PRACTICE_INTERVAL(400)时更新lastPractice', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastPractice = 0
    ;(sys as any).lastCheck = -600
    sys.update(1, em, 400)
    expect((sys as any).lastPractice).toBe(400)
  })
})

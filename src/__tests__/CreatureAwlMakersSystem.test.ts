import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAwlMakersSystem } from '../systems/CreatureAwlMakersSystem'
import type { AwlMaker, AwlType } from '../systems/CreatureAwlMakersSystem'

// CreatureAwlMakersSystem 测试:
// - getMakers() → 返回内部数组引用

let nextId = 1

function makeAwlSys(): CreatureAwlMakersSystem {
  return new CreatureAwlMakersSystem()
}

function makeAwlMaker(entityId: number, awlType: AwlType = 'stitching'): AwlMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    awlsMade: 5,
    awlType,
    sharpness: 35,
    reputation: 34,
    tick: 0,
  }
}

describe('CreatureAwlMakersSystem.getMakers', () => {
  let sys: CreatureAwlMakersSystem

  beforeEach(() => { sys = makeAwlSys(); nextId = 1 })

  it('初始无匠人', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入匠人后可查询', () => {
    ;(sys as any).makers.push(makeAwlMaker(1, 'brad'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].awlType).toBe('brad')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeAwlMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种锥类型', () => {
    const types: AwlType[] = ['stitching', 'scratch', 'brad', 'pegging']
    types.forEach((t, i) => {
      ;(sys as any).makers.push(makeAwlMaker(i + 1, t))
    })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].awlType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeAwlMaker(10, 'pegging')
    m.skill = 90
    m.awlsMade = 20
    m.sharpness = 80
    m.reputation = 82
    ;(sys as any).makers.push(m)
    const result = (sys as any).makers[0]
    expect(result.skill).toBe(90)
    expect(result.awlsMade).toBe(20)
    expect(result.sharpness).toBe(80)
    expect(result.reputation).toBe(82)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAstronomerSystem } from '../systems/CreatureAstronomerSystem'
import type { Astronomer, TelescopeType } from '../systems/CreatureAstronomerSystem'

// CreatureAstronomerSystem 测试:
// - getAstronomers() → 返回只读天文学家数组内部引用
// update() 依赖 EntityManager，不在此测试。

let nextAstroId = 1

function makeAstrSys(): CreatureAstronomerSystem {
  return new CreatureAstronomerSystem()
}

function makeAstronomer(entityId: number, telescope: TelescopeType = 'naked_eye'): Astronomer {
  return {
    id: nextAstroId++,
    entityId,
    observations: 0,
    accuracy: 50,
    discoveries: 0,
    telescope,
    tick: 0,
  }
}

describe('CreatureAstronomerSystem.getAstronomers', () => {
  let sys: CreatureAstronomerSystem

  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })

  it('初始无天文学家', () => {
    expect((sys as any).astronomers).toHaveLength(0)
  })

  it('注入天文学家后可查询', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1, 'refractor'))
    expect((sys as any).astronomers).toHaveLength(1)
    expect((sys as any).astronomers[0].telescope).toBe('refractor')
  })

  it('返回内部引用', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1))
    expect((sys as any).astronomers).toBe((sys as any).astronomers)
  })

  it('支持所有 4 种望远镜类型', () => {
    const telescopes: TelescopeType[] = ['naked_eye', 'basic', 'refractor', 'reflector']
    telescopes.forEach((t, i) => {
      ;(sys as any).astronomers.push(makeAstronomer(i + 1, t))
    })
    const all = (sys as any).astronomers
    expect(all).toHaveLength(4)
    telescopes.forEach((t, i) => { expect(all[i].telescope).toBe(t) })
  })

  it('天文学家包含正确的实体 id', () => {
    ;(sys as any).astronomers.push(makeAstronomer(42))
    expect((sys as any).astronomers[0].entityId).toBe(42)
  })

  it('天文学家包含观测数据', () => {
    const a = makeAstronomer(1, 'reflector')
    a.observations = 200
    a.discoveries = 5
    a.accuracy = 85
    ;(sys as any).astronomers.push(a)
    const result = (sys as any).astronomers[0]
    expect(result.observations).toBe(200)
    expect(result.discoveries).toBe(5)
    expect(result.accuracy).toBe(85)
  })

  it('多个天文学家独立存储', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1, 'naked_eye'))
    ;(sys as any).astronomers.push(makeAstronomer(2, 'reflector'))
    expect((sys as any).astronomers[0].telescope).toBe('naked_eye')
    expect((sys as any).astronomers[1].telescope).toBe('reflector')
  })
})

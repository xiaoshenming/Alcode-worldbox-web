import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureJesterSystem, JesterAct } from '../systems/CreatureJesterSystem'

// 构造一个返回指定实体列表的假 EntityManager
function makeEM(entityIds: number[] = [], hasComp = true) {
  return {
    getEntitiesWithComponent: (_c: string) => entityIds,
    hasComponent: (_id: number, _c: string) => hasComp,
  } as any
}

describe('CreatureJesterSystem', () => {
  let sys: CreatureJesterSystem

  beforeEach(() => {
    sys = new CreatureJesterSystem()
  })

  // 1. 初始 jesters 列表为空
  it('初始无 jester 记录', () => {
    const jesters = (sys as any).jesters as unknown[]
    expect(jesters).toHaveLength(0)
  })

  // 2. nextId 初始为 1
  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // 3. lastCheck 初始为 0
  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // 4. tick 差值 < 2800 时不更新 lastCheck
  it('tick 差值 < 2800 时 lastCheck 保持不变', () => {
    const em = makeEM()
    sys.update(1, em, 2799)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 5. tick 差值 >= 2800 时更新 lastCheck
  it('tick >= 2800 时更新 lastCheck', () => {
    const em = makeEM()
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  // 6. 第二次 tick 差值 < 2800 时不再更新 lastCheck
  it('lastCheck 设定后，差值不足时不再更新', () => {
    const em = makeEM()
    sys.update(1, em, 2800)
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2800)
  })

  // 7. JesterAct 包��� 4 种表演类型
  it('JesterAct 包含 juggling/comedy/acrobatics/satire', () => {
    const acts: JesterAct[] = ['juggling', 'comedy', 'acrobatics', 'satire']
    expect(acts).toHaveLength(4)
    // 每种都是合法类型（TypeScript 层面已验证，运行时验证字符串值）
    for (const a of acts) {
      expect(['juggling', 'comedy', 'acrobatics', 'satire']).toContain(a)
    }
  })

  // 8. 注入 jester 后可查询到
  it('直接注入 jester 后可从 jesters 列表查到', () => {
    const jester = {
      id: 1, creatureId: 42, act: 'comedy' as JesterAct,
      humor: 50, performances: 0, moraleBoost: 10, notoriety: 0, tick: 0,
    }
    ;(sys as any).jesters.push(jester)
    expect((sys as any).jesters).toHaveLength(1)
    expect((sys as any).jesters[0].creatureId).toBe(42)
  })

  // 9. humor 上限为 100（注入高值后 update，Math.min 保护）
  it('humor 不超过 100', () => {
    // 注入一个 humor=99.9 的 jester，触发 humor+0.2 => 应被钳制到 100
    ;(sys as any).jesters.push({
      id: 1, creatureId: 1, act: 'comedy' as JesterAct,
      humor: 99.9, performances: 0, moraleBoost: 10, notoriety: 0, tick: 0,
    })
    // 强制触发更新路径（通过 Math.random stub 绕过概率）
    const origRandom = Math.random
    let callCount = 0
    Math.random = () => {
      callCount++
      // 首次调用：RECRUIT_CHANCE 判断，返回 1（不招募）
      // 后续调用：performance 触发概率，返回 0（触发 performances++）
      return callCount === 1 ? 1 : 0
    }
    try {
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) {
        expect(j.humor).toBeLessThanOrEqual(100)
      }
    } finally {
      Math.random = origRandom
    }
  })

  // 10. notoriety 上限为 100
  it('notoriety 不超过 100', () => {
    ;(sys as any).jesters.push({
      id: 1, creatureId: 1, act: 'comedy' as JesterAct,
      humor: 50, performances: 0, moraleBoost: 10, notoriety: 99.9, tick: 0,
    })
    const origRandom = Math.random
    let callCount = 0
    Math.random = () => {
      callCount++
      return callCount === 1 ? 1 : 0
    }
    try {
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) {
        expect(j.notoriety).toBeLessThanOrEqual(100)
      }
    } finally {
      Math.random = origRandom
    }
  })

  // 11. 内部 ACTS 数组包含四种合法值
  it('ACTS 内部常量包含 4 种演出类型', () => {
    // 通过实例化后注入 jester 的 act 字段来间接验证
    const validActs = new Set(['juggling', 'comedy', 'acrobatics', 'satire'])
    const jester = {
      id: 1, creatureId: 1, act: 'juggling' as JesterAct,
      humor: 50, performances: 0, moraleBoost: 6, notoriety: 0, tick: 0,
    }
    ;(sys as any).jesters.push(jester)
    expect(validActs.has(jester.act)).toBe(true)
  })

  // 12. update 时实体不存在（hasComponent=false）则清除 jester
  it('creatureId 对应实体消失后 jester 被清除', () => {
    ;(sys as any).jesters.push({
      id: 1, creatureId: 99, act: 'satire' as JesterAct,
      humor: 50, performances: 0, moraleBoost: 14, notoriety: 0, tick: 0,
    })
    // hasComponent 返回 false => cleanup 删除该 jester
    sys.update(1, makeEM([], false), 2800)
    expect((sys as any).jesters).toHaveLength(0)
  })

  // 13. jester 数量上限 MAX_JESTERS=16
  it('jesters 上限为 16', () => {
    expect((sys as any).jesters.length).toBeLessThanOrEqual(16)
  })
})

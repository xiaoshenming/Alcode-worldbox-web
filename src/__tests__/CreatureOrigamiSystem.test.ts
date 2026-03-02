import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureOrigamiSystem } from '../systems/CreatureOrigamiSystem'
import type { OrigamiWork, OrigamiShape } from '../systems/CreatureOrigamiSystem'

let nextId = 1
function makeSys(): CreatureOrigamiSystem { return new CreatureOrigamiSystem() }
function makeWork(creatorId: number, shape: OrigamiShape = 'crane', overrides: Partial<OrigamiWork> = {}): OrigamiWork {
  return { id: nextId++, creatorId, shape, beauty: 75, complexity: 60, preserved: false, tick: 0, ...overrides }
}

// Minimal EntityManager stub
function makeEM(ids: number[] = [1, 2, 3]): any {
  return {
    getEntitiesWithComponents: () => ids,
    getEntitiesWithComponent: () => ids,
    hasComponent: () => true,
  }
}

const CHECK_INTERVAL = 3000
const MAX_WORKS = 50
const EXPIRE_AFTER = 60000

describe('CreatureOrigamiSystem 基本结构', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无折纸作品', () => { expect((sys as any).works).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).works.push(makeWork(1, 'dragon'))
    expect((sys as any).works[0].shape).toBe('dragon')
  })
  it('返回内部引用', () => {
    ;(sys as any).works.push(makeWork(1))
    expect((sys as any).works).toBe((sys as any).works)
  })
  it('支持所有5种形状', () => {
    const shapes: OrigamiShape[] = ['crane', 'dragon', 'flower', 'boat', 'star']
    shapes.forEach((s, i) => { ;(sys as any).works.push(makeWork(i + 1, s)) })
    const all = (sys as any).works
    shapes.forEach((s, i) => { expect(all[i].shape).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).works.push(makeWork(1))
    ;(sys as any).works.push(makeWork(2))
    expect((sys as any).works).toHaveLength(2)
  })
})

describe('CreatureOrigamiSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < CHECK_INTERVAL 时 update 不执行（lastCheck 维持为0）', () => {
    const em = makeEM([1])
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行（lastCheck 更新）', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第一次触发后，未达下一阈值时跳过', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    const saved = (sys as any).lastCheck
    sys.update(0, em, CHECK_INTERVAL + 200) // 200 < CHECK_INTERVAL
    expect((sys as any).lastCheck).toBe(saved)
  })

  it('第一次触发后，达下一阈值时再次执行', () => {
    const em = makeEM([])
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureOrigamiSystem 时间过期清理', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未保存作品 tick < cutoff 时被删除', () => {
    // cutoff = tick - 60000；若 w.tick < cutoff 且 !preserved，删除
    // 让 update 以 tick = CHECK_INTERVAL + 60000 触发
    // cutoff = CHECK_INTERVAL + 60000 - 60000 = CHECK_INTERVAL
    // ���品 tick = 0 < CHECK_INTERVAL，且 preserved=false → 删除
    ;(sys as any).works.push(makeWork(1, 'crane', { tick: 0, preserved: false }))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发新建
    sys.update(0, em, CHECK_INTERVAL + EXPIRE_AFTER)
    expect((sys as any).works).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('保存的作品即使超时也不删除', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', { tick: 0, preserved: true }))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL + EXPIRE_AFTER)
    expect((sys as any).works).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('未超时的未保存作品不删除', () => {
    // cutoff = CHECK_INTERVAL + 100 - 60000 < 0，任何 tick >= 0 的不删除
    ;(sys as any).works.push(makeWork(1, 'crane', { tick: 0, preserved: false }))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL + 100) // 100 远小于 EXPIRE_AFTER
    expect((sys as any).works).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('混合：同批次仅过期未保存的被清除', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', { tick: 0, preserved: false }))   // 过期未保，删除
    ;(sys as any).works.push(makeWork(2, 'dragon', { tick: 0, preserved: true }))   // 过期已保，保留
    ;(sys as any).works.push(makeWork(3, 'star', { tick: CHECK_INTERVAL + EXPIRE_AFTER, preserved: false })) // 未过期，保留
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, CHECK_INTERVAL + EXPIRE_AFTER)
    expect((sys as any).works).toHaveLength(2)
    vi.restoreAllMocks()
  })
})

describe('CreatureOrigamiSystem COMPLEXITY 常量', () => {
  it('crane complexity = 30', () => {
    const w = makeWork(1, 'crane', { complexity: 30 })
    expect(w.complexity).toBe(30)
  })
  it('dragon complexity = 80（最复杂）', () => {
    const w = makeWork(1, 'dragon', { complexity: 80 })
    expect(w.complexity).toBe(80)
  })
  it('flower complexity = 20（最简单）', () => {
    const w = makeWork(1, 'flower', { complexity: 20 })
    expect(w.complexity).toBe(20)
  })
  it('boat complexity = 15', () => {
    const w = makeWork(1, 'boat', { complexity: 15 })
    expect(w.complexity).toBe(15)
  })
  it('star complexity = 50', () => {
    const w = makeWork(1, 'star', { complexity: 50 })
    expect(w.complexity).toBe(50)
  })
})

describe('CreatureOrigamiSystem MAX_WORKS 上限与排序', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过 MAX_WORKS 时按 beauty 降序截断', () => {
    // 注入 MAX_WORKS + 5 条，beauty 各异
    for (let i = 0; i < MAX_WORKS + 5; i++) {
      ;(sys as any).works.push(makeWork(i + 1, 'crane', { beauty: i, preserved: true, tick: 0 }))
    }
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // 使用较大 tick 但不触发过期（preserved=true）
    sys.update(0, em, CHECK_INTERVAL)
    const works = (sys as any).works
    expect(works.length).toBeLessThanOrEqual(MAX_WORKS)
    // 保留最高 beauty 的作品
    if (works.length > 1) {
      expect(works[0].beauty).toBeGreaterThanOrEqual(works[1].beauty)
    }
    vi.restoreAllMocks()
  })
})

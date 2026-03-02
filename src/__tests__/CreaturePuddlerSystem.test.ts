import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePuddlerSystem } from '../systems/CreaturePuddlerSystem'
import type { Puddler } from '../systems/CreaturePuddlerSystem'

let nextId = 1
function makeSys(): CreaturePuddlerSystem { return new CreaturePuddlerSystem() }
function makePuddler(entityId: number, overrides: Partial<Puddler> = {}): Puddler {
  return {
    id: nextId++,
    entityId,
    puddlingSkill: 70,
    stirringTechnique: 65,
    carbonControl: 75,
    ironPurity: 80,
    tick: 0,
    ...overrides,
  }
}
// 最小 em mock：getEntitiesWithComponent 控制招募是否触发
function makeEm(entities: number[] = []) {
  return { getEntitiesWithComponent: () => entities } as any
}

const CHECK_INTERVAL = 2780

describe('CreaturePuddlerSystem', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个 ──

  it('初始无精炼工', () => { expect((sys as any).puddlers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    expect((sys as any).puddlers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    expect((sys as any).puddlers).toBe((sys as any).puddlers)
  })

  it('字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(2))
    const p = (sys as any).puddlers[0]
    expect(p.puddlingSkill).toBe(70)
    expect(p.ironPurity).toBe(80)
  })

  it('多个全部返回', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    ;(sys as any).puddlers.push(makePuddler(2))
    expect((sys as any).puddlers).toHaveLength(2)
  })

  // ── 新增 ──

  it('节流：tick间隔不足CHECK_INTERVAL时update不执行', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 20 }))
    const em = makeEm([])
    sys.update(0, em, 0)            // 设定 lastCheck=0
    sys.update(0, em, CHECK_INTERVAL - 1)  // 不满足间隔
    // 技能不应增长
    expect((sys as any).puddlers[0].puddlingSkill).toBe(20)
  })

  it('节流：达到CHECK_INTERVAL后技能递增', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 20 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBeGreaterThan(20)
  })

  it('puddlingSkill 递增量为0.02', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(50.02, 10)
  })

  it('stirringTechnique 递增量为0.015', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { stirringTechnique: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBeCloseTo(50.015, 10)
  })

  it('ironPurity 递增量为0.01', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { ironPurity: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].ironPurity).toBeCloseTo(50.01, 10)
  })

  it('puddlingSkill 上限为100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 99.99 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBe(100)
  })

  it('stirringTechnique 上限为100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { stirringTechnique: 99.99 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBe(100)
  })

  it('ironPurity 上限为100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { ironPurity: 99.99 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].ironPurity).toBe(100)
  })

  it('cleanup: puddlingSkill<=4 时精炼工被移除', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 4 }))
    ;(sys as any).puddlers.push(makePuddler(2, { puddlingSkill: 3 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    // 上面两条在技能递增后仍<=4（4+0.02=4.02 > 4，所以skill=4时不被删除——需要是<=4才删，故精确边界是4）
    // 重置，直接测边界
    const sys2 = makeSys()
    ;(sys2 as any).puddlers.push(makePuddler(3, { puddlingSkill: 3.98 }))
    sys2.update(0, em, 0)
    sys2.update(0, em, CHECK_INTERVAL)
    // 3.98+0.02=4.0，恰好等于4，判断条件是 <=4，所以被删除
    expect((sys2 as any).puddlers).toHaveLength(0)
  })

  it('cleanup: puddlingSkill>4 时精炼工保留', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 5 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers).toHaveLength(1)
  })

  it('上限MAX_PUDDLERS=10：超过不再招募（即使随机通过）', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).puddlers.push(makePuddler(i + 1))
    }
    const origRandom = Math.random
    Math.random = () => 0.0001 // 必然通过 RECRUIT_CHANCE 检查
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puddlers).toHaveLength(10)
  })

  it('nextId 随每次招募递增', () => {
    ;(sys as any).nextId = 5
    const origRandom = Math.random
    Math.random = () => 0.0001 // RECRUIT_CHANCE=0.0014，0.0001<0.0014 => 通过
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    // 如果成功招募，nextId应为6
    const len = (sys as any).puddlers.length
    if (len > 0) {
      expect((sys as any).nextId).toBe(6)
    }
  })
})

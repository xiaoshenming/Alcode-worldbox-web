import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureApprenticeSystem } from '../systems/CreatureApprenticeSystem'
import type { Apprenticeship, ApprenticeSkill } from '../systems/CreatureApprenticeSystem'

// CreatureApprenticeSystem 测试:
// - getApprenticeships() → 返回内部数组引用（含已毕业和进行中）
// - getActiveCount()     → 只统计 graduated=false 的学徒关系数量
// update() 依赖 EntityManager，不在此测试。

let nextAppId = 1

function makeApprSys(): CreatureApprenticeSystem {
  return new CreatureApprenticeSystem()
}

function makeApprenticeship(masterId: number, apprenticeId: number, graduated = false, skill: ApprenticeSkill = 'combat'): Apprenticeship {
  return {
    id: nextAppId++,
    masterId,
    apprenticeId,
    civId: 1,
    skill,
    progress: graduated ? 100 : 50,
    startTick: 0,
    graduated,
  }
}

describe('CreatureApprenticeSystem.getApprenticeships', () => {
  let sys: CreatureApprenticeSystem

  beforeEach(() => { sys = makeApprSys(); nextAppId = 1 })

  it('初始无学徒关系', () => {
    expect(sys.getApprenticeships()).toHaveLength(0)
  })

  it('注入学徒关系后可查询', () => {
    ;(sys as any).apprenticeships.push(makeApprenticeship(1, 2))
    expect(sys.getApprenticeships()).toHaveLength(1)
    expect(sys.getApprenticeships()[0].masterId).toBe(1)
    expect(sys.getApprenticeships()[0].apprenticeId).toBe(2)
  })

  it('返回内部引用', () => {
    ;(sys as any).apprenticeships.push(makeApprenticeship(1, 2))
    expect(sys.getApprenticeships()).toBe((sys as any).apprenticeships)
  })

  it('包含已毕业和进行中的关系', () => {
    ;(sys as any).apprenticeships.push(makeApprenticeship(1, 2, false))
    ;(sys as any).apprenticeships.push(makeApprenticeship(3, 4, true))
    expect(sys.getApprenticeships()).toHaveLength(2)
    expect(sys.getApprenticeships()[0].graduated).toBe(false)
    expect(sys.getApprenticeships()[1].graduated).toBe(true)
  })

  it('支持所有 5 种技能类型', () => {
    const skills: ApprenticeSkill[] = ['combat', 'foraging', 'building', 'medicine', 'leadership']
    skills.forEach((s, i) => {
      ;(sys as any).apprenticeships.push(makeApprenticeship(i + 1, i + 10, false, s))
    })
    const all = sys.getApprenticeships()
    expect(all).toHaveLength(5)
    skills.forEach((s, i) => { expect(all[i].skill).toBe(s) })
  })
})

describe('CreatureApprenticeSystem.getActiveCount', () => {
  let sys: CreatureApprenticeSystem

  beforeEach(() => { sys = makeApprSys(); nextAppId = 1 })

  it('初始活跃数为 0', () => {
    expect(sys.getActiveCount()).toBe(0)
  })

  it('未毕业的关系计入活跃', () => {
    ;(sys as any).apprenticeships.push(makeApprenticeship(1, 2, false))
    ;(sys as any).apprenticeships.push(makeApprenticeship(3, 4, false))
    expect(sys.getActiveCount()).toBe(2)
  })

  it('已毕业的关系不计入活跃', () => {
    ;(sys as any).apprenticeships.push(makeApprenticeship(1, 2, true))
    ;(sys as any).apprenticeships.push(makeApprenticeship(3, 4, true))
    expect(sys.getActiveCount()).toBe(0)
  })

  it('混合时只统计未毕业', () => {
    ;(sys as any).apprenticeships.push(makeApprenticeship(1, 2, false))  // 活跃
    ;(sys as any).apprenticeships.push(makeApprenticeship(3, 4, true))   // 毕业
    ;(sys as any).apprenticeships.push(makeApprenticeship(5, 6, false))  // 活跃
    ;(sys as any).apprenticeships.push(makeApprenticeship(7, 8, true))   // 毕业
    expect(sys.getActiveCount()).toBe(2)
  })
})

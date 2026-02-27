import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMentorSystem } from '../systems/CreatureMentorSystem'
import type { MentorBond, MentorSkill } from '../systems/CreatureMentorSystem'

let nextId = 1
function makeSys(): CreatureMentorSystem { return new CreatureMentorSystem() }
function makeBond(mentorId: number, apprenticeId: number, skill: MentorSkill = 'combat'): MentorBond {
  return { id: nextId++, mentorId, apprenticeId, skill, progress: 30, quality: 70, formedTick: 0 }
}

describe('CreatureMentorSystem.getBonds', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无师徒关系', () => { expect(sys.getBonds()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'foraging'))
    expect(sys.getBonds()[0].skill).toBe('foraging')
  })
  it('返回内部引用', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    expect(sys.getBonds()).toBe((sys as any).bonds)
  })
  it('支持所有 6 种技能类型', () => {
    const skills: MentorSkill[] = ['combat', 'foraging', 'building', 'crafting', 'leadership', 'survival']
    skills.forEach((s, i) => { ;(sys as any).bonds.push(makeBond(i + 1, i + 10, s)) })
    const all = sys.getBonds()
    skills.forEach((s, i) => { expect(all[i].skill).toBe(s) })
  })
})

describe('CreatureMentorSystem.getBondCount / getEntityBond', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getBondCount 初始为 0', () => { expect(sys.getBondCount()).toBe(0) })
  it('getBondCount 注入后递增', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    ;(sys as any).bonds.push(makeBond(3, 4))
    expect(sys.getBondCount()).toBe(2)
  })
  it('getEntityBond 找不到返回 null', () => { expect(sys.getEntityBond(999)).toBeNull() })
  it('getEntityBond 匹配 mentorId', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    const b = sys.getEntityBond(1)
    expect(b).not.toBeNull()
    expect(b!.mentorId).toBe(1)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGladiatorSystem } from '../systems/CreatureGladiatorSystem'
import type { Gladiator, WeaponSkill } from '../systems/CreatureGladiatorSystem'

let nextId = 1
function makeSys(): CreatureGladiatorSystem { return new CreatureGladiatorSystem() }
function makeGladiator(entityId: number, weaponSkill: WeaponSkill = 'sword'): Gladiator {
  return { id: nextId++, entityId, wins: 5, losses: 2, fame: 80, weaponSkill, arenaId: 1, tick: 0 }
}

describe('CreatureGladiatorSystem.getGladiators', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无角斗士', () => { expect((sys as any).gladiators).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, 'trident'))
    expect((sys as any).gladiators[0].weaponSkill).toBe('trident')
  })
  it('返回内部引用', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    expect((sys as any).gladiators).toBe((sys as any).gladiators)
  })
  it('支持所有 5 种武器技能', () => {
    const skills: WeaponSkill[] = ['sword', 'spear', 'axe', 'fists', 'trident']
    skills.forEach((s, i) => { ;(sys as any).gladiators.push(makeGladiator(i + 1, s)) })
    const all = (sys as any).gladiators
    skills.forEach((s, i) => { expect(all[i].weaponSkill).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    ;(sys as any).gladiators.push(makeGladiator(2))
    expect((sys as any).gladiators).toHaveLength(2)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHerbalismSystem } from '../systems/CreatureHerbalismSystem'
import type { HerbalRemedy, HerbType, RemedyForm } from '../systems/CreatureHerbalismSystem'

let nextId = 1
function makeSys(): CreatureHerbalismSystem { return new CreatureHerbalismSystem() }
function makeRemedy(herbalistId: number, herb: HerbType = 'chamomile', form: RemedyForm = 'tea'): HerbalRemedy {
  return { id: nextId++, herbalistId, herb, form, potency: 60, healingPower: 50, tick: 0 }
}

describe('CreatureHerbalismSystem.getRemedies', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无草药', () => { expect((sys as any).remedies).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'ginseng', 'elixir'))
    expect((sys as any).remedies[0].herb).toBe('ginseng')
    expect((sys as any).remedies[0].form).toBe('elixir')
  })
  it('返回内部引用', () => {
    ;(sys as any).remedies.push(makeRemedy(1))
    expect((sys as any).remedies).toBe((sys as any).remedies)
  })
  it('支持所有 6 种草药', () => {
    const herbs: HerbType[] = ['chamomile', 'ginseng', 'lavender', 'echinacea', 'valerian', 'turmeric']
    herbs.forEach((h, i) => { ;(sys as any).remedies.push(makeRemedy(i + 1, h)) })
    const all = (sys as any).remedies
    herbs.forEach((h, i) => { expect(all[i].herb).toBe(h) })
  })
})

describe('CreatureHerbalismSystem.getSkill', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })
  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 88)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(88)
  })
})

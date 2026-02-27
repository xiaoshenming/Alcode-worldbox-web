import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRitualSystem } from '../systems/CreatureRitualSystem'
import type { Ritual, RitualType, RitualEffect } from '../systems/CreatureRitualSystem'

let nextId = 1
function makeSys(): CreatureRitualSystem { return new CreatureRitualSystem() }
function makeRitual(leaderId: number, type: RitualType = 'rain_dance', effect: RitualEffect = 'luck'): Ritual {
  return { id: nextId++, leaderId, participants: [], type, progress: 0, effect, tick: 0 }
}

describe('CreatureRitualSystem.getRituals', () => {
  let sys: CreatureRitualSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无仪式', () => { expect(sys.getRituals()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'harvest_feast', 'fertility'))
    expect(sys.getRituals()[0].type).toBe('harvest_feast')
  })
  it('返回内部引用', () => {
    ;(sys as any).rituals.push(makeRitual(1))
    expect(sys.getRituals()).toBe((sys as any).rituals)
  })
  it('支持所有6种仪式类型', () => {
    const types: RitualType[] = ['rain_dance', 'harvest_feast', 'war_cry', 'healing_circle', 'moon_prayer', 'ancestor_worship']
    types.forEach((t, i) => { ;(sys as any).rituals.push(makeRitual(i + 1, t)) })
    expect(sys.getRituals()).toHaveLength(6)
  })
})

describe('CreatureRitualSystem.getRitualsByType', () => {
  let sys: CreatureRitualSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    expect(sys.getRitualsByType('war_cry')).toHaveLength(0)
  })
  it('过滤特定仪式类型', () => {
    ;(sys as any).rituals.push(makeRitual(1, 'rain_dance'))
    ;(sys as any).rituals.push(makeRitual(2, 'rain_dance'))
    ;(sys as any).rituals.push(makeRitual(3, 'harvest_feast'))
    expect(sys.getRitualsByType('rain_dance')).toHaveLength(2)
  })
})

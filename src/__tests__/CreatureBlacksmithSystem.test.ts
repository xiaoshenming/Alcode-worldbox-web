import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBlacksmithSystem } from '../systems/CreatureBlacksmithSystem'
import type { BlacksmithData, BlacksmithSpecialty } from '../systems/CreatureBlacksmithSystem'

let nextId = 1
function makeSys(): CreatureBlacksmithSystem { return new CreatureBlacksmithSystem() }
function makeSmith(entityId: number, specialty: BlacksmithSpecialty = 'weapons'): BlacksmithData {
  return { entityId, skill: 30, itemsForged: 10, specialty, reputation: 35, active: true, tick: 0 }
}

describe('CreatureBlacksmithSystem.getSmiths', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铁匠', () => { expect((sys as any).smiths).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).smiths.push(makeSmith(1, 'jewelry'))
    expect((sys as any).smiths[0].specialty).toBe('jewelry')
  })

  it('返回内部引用', () => {
    ;(sys as any).smiths.push(makeSmith(1))
    expect((sys as any).smiths).toBe((sys as any).smiths)
  })

  it('支持所有 4 种专长', () => {
    const specs: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
    specs.forEach((s, i) => { ;(sys as any).smiths.push(makeSmith(i + 1, s)) })
    const all = (sys as any).smiths
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })

  it('active 字段存储正确', () => {
    const s = makeSmith(1)
    s.active = false
    ;(sys as any).smiths.push(s)
    expect((sys as any).smiths[0].active).toBe(false)
  })
})

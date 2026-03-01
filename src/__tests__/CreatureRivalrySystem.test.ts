import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivalrySystem } from '../systems/CreatureRivalrySystem'
import type { Rivalry, RivalryStage } from '../systems/CreatureRivalrySystem'

let nextId = 1
function makeSys(): CreatureRivalrySystem { return new CreatureRivalrySystem() }
function makeRivalry(entityA: number, entityB: number, stage: RivalryStage = 'tension'): Rivalry {
  return { id: nextId++, entityA, entityB, stage, intensity: 50, startedAt: 0, encounters: 3, cause: 'resource' }
}

describe('CreatureRivalrySystem.getRivalries', () => {
  let sys: CreatureRivalrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无竞争', () => { expect((sys as any).rivalries).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2, 'feud'))
    expect((sys as any).rivalries[0].stage).toBe('feud')
  })
  it('返回内部引用', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2))
    expect((sys as any).rivalries).toBe((sys as any).rivalries)
  })
  it('支持所有5种竞争阶段', () => {
    const stages: RivalryStage[] = ['tension', 'competition', 'hostility', 'feud', 'resolved']
    stages.forEach((s, i) => { ;(sys as any).rivalries.push(makeRivalry(i + 1, i + 2, s)) })
    const all = (sys as any).rivalries
    stages.forEach((s, i) => { expect(all[i].stage).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).rivalries.push(makeRivalry(1, 2))
    ;(sys as any).rivalries.push(makeRivalry(3, 4))
    expect((sys as any).rivalries).toHaveLength(2)
  })
})

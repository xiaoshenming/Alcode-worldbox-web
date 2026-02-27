import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRunnerSystem } from '../systems/CreatureRunnerSystem'
import type { Runner, RunnerEndurance } from '../systems/CreatureRunnerSystem'

let nextId = 1
function makeSys(): CreatureRunnerSystem { return new CreatureRunnerSystem() }
function makeRunner(creatureId: number, endurance: RunnerEndurance = 'novice'): Runner {
  return { id: nextId++, creatureId, endurance, speed: 70, messagesDelivered: 10, stamina: 80, reputation: 40, tick: 0 }
}

describe('CreatureRunnerSystem.getRunners', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无信使', () => { expect(sys.getRunners()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).runners.push(makeRunner(1, 'elite'))
    expect(sys.getRunners()[0].endurance).toBe('elite')
  })
  it('返回内部引用', () => {
    ;(sys as any).runners.push(makeRunner(1))
    expect(sys.getRunners()).toBe((sys as any).runners)
  })
  it('支持所有4种耐力等级', () => {
    const endurances: RunnerEndurance[] = ['novice', 'trained', 'elite', 'legendary']
    endurances.forEach((e, i) => { ;(sys as any).runners.push(makeRunner(i + 1, e)) })
    const all = sys.getRunners()
    endurances.forEach((e, i) => { expect(all[i].endurance).toBe(e) })
  })
  it('多个全部返回', () => {
    ;(sys as any).runners.push(makeRunner(1))
    ;(sys as any).runners.push(makeRunner(2))
    expect(sys.getRunners()).toHaveLength(2)
  })
})

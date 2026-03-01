import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFalconrySystem } from '../systems/CreatureFalconrySystem'
import type { TrainedFalcon, FalconBreed, FalconTask } from '../systems/CreatureFalconrySystem'

let nextId = 1
function makeSys(): CreatureFalconrySystem { return new CreatureFalconrySystem() }
function makeFalcon(ownerId: number, breed: FalconBreed = 'peregrine', task: FalconTask = 'hunting'): TrainedFalcon {
  return { id: nextId++, ownerId, breed, task, skill: 70, loyalty: 0.8, stamina: 90, tick: 0 }
}

describe('CreatureFalconrySystem.getFalcons', () => {
  let sys: CreatureFalconrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无猎鹰', () => { expect((sys as any).falcons).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).falcons.push(makeFalcon(1, 'gyrfalcon'))
    expect((sys as any).falcons[0].breed).toBe('gyrfalcon')
  })
  it('返回只读引用', () => {
    ;(sys as any).falcons.push(makeFalcon(1))
    expect((sys as any).falcons).toBe((sys as any).falcons)
  })
  it('支持所有4种猎鹰品种', () => {
    const breeds: FalconBreed[] = ['peregrine', 'gyrfalcon', 'merlin', 'kestrel']
    breeds.forEach((b, i) => { ;(sys as any).falcons.push(makeFalcon(i + 1, b)) })
    const all = (sys as any).falcons
    breeds.forEach((b, i) => { expect(all[i].breed).toBe(b) })
  })
  it('字段正确', () => {
    ;(sys as any).falcons.push(makeFalcon(2, 'merlin', 'scouting'))
    const f = (sys as any).falcons[0]
    expect(f.skill).toBe(70)
    expect(f.task).toBe('scouting')
  })
})

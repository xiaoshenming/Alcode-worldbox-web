import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFalconrySystem } from '../systems/CreatureFalconrySystem'
import type { TrainedFalcon, FalconBreed, FalconTask } from '../systems/CreatureFalconrySystem'

let nextId = 1
function makeSys(): CreatureFalconrySystem { return new CreatureFalconrySystem() }
function makeFalcon(ownerId: number, breed: FalconBreed = 'peregrine', task: FalconTask = 'hunting'): TrainedFalcon {
  return { id: nextId++, ownerId, breed, task, skill: 70, loyalty: 80, stamina: 90, tick: 0 }
}

const mockEm = { getEntitiesWithComponent: () => [] } as any

describe('CreatureFalconrySystem', () => {
  let sys: CreatureFalconrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无猎鹰', () => {
    expect((sys as any).falcons).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).falcons.push(makeFalcon(1, 'gyrfalcon'))
    expect((sys as any).falcons[0].breed).toBe('gyrfalcon')
  })

  it('FalconBreed包含4种', () => {
    const breeds: FalconBreed[] = ['peregrine', 'gyrfalcon', 'merlin', 'kestrel']
    breeds.forEach((b, i) => { ;(sys as any).falcons.push(makeFalcon(i + 1, b)) })
    const all = (sys as any).falcons
    breeds.forEach((b, i) => { expect(all[i].breed).toBe(b) })
  })

  it('FalconTask包含4种', () => {
    const tasks: FalconTask[] = ['hunting', 'scouting', 'resting', 'training']
    tasks.forEach((t, i) => { ;(sys as any).falcons.push(makeFalcon(i + 1, 'peregrine', t)) })
    const all = (sys as any).falcons
    tasks.forEach((t, i) => { expect(all[i].task).toBe(t) })
  })

  it('tick差值<2500时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, mockEm, 3499) // 3499-1000=2499 < 2500
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=2500时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, mockEm, 3500) // 3500-1000=2500 >= 2500
    expect((sys as any).lastCheck).toBe(3500)
  })

  it('注入多个猎鹰可查询', () => {
    ;(sys as any).falcons.push(makeFalcon(1, 'peregrine', 'hunting'))
    ;(sys as any).falcons.push(makeFalcon(2, 'merlin', 'scouting'))
    ;(sys as any).falcons.push(makeFalcon(3, 'kestrel', 'resting'))
    expect((sys as any).falcons).toHaveLength(3)
    expect((sys as any).falcons[1].breed).toBe('merlin')
    expect((sys as any).falcons[2].task).toBe('resting')
  })

  it('training任务下skill+0.3', () => {
    ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 40 })
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 2500)
    expect((sys as any).falcons[0].skill).toBeCloseTo(40.3)
  })

  it('hunting任务下stamina减少', () => {
    ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 50, loyalty: 80 })
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 2500)
    // stamina -= 1.5，loyalty -= 0.05
    expect((sys as any).falcons[0].stamina).toBeCloseTo(48.5)
  })

  it('loyalty<=0时移除猎鹰', () => {
    ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), loyalty: 0.04, stamina: 50 })
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 2500)
    // loyalty 0.04 - 0.05 = -0.01 <= 0 -> removed
    expect((sys as any).falcons).toHaveLength(0)
  })

  it('resting任务下stamina恢复', () => {
    ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 50, loyalty: 80 })
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 2500)
    // stamina += 3
    expect((sys as any).falcons[0].stamina).toBeCloseTo(53)
  })

  it('TrainedFalcon字段完整性', () => {
    const f = makeFalcon(10, 'kestrel', 'training')
    ;(sys as any).falcons.push(f)
    const r = (sys as any).falcons[0]
    expect(r.ownerId).toBe(10)
    expect(r.breed).toBe('kestrel')
    expect(r.task).toBe('training')
    expect(r.skill).toBe(70)
    expect(r.loyalty).toBe(80)
    expect(r.stamina).toBe(90)
  })
})

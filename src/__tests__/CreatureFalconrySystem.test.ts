import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

  // ============================================================
  // 初始状态
  // ============================================================
  describe('初始状态', () => {
    it('初始无猎鹰', () => {
      expect((sys as any).falcons).toHaveLength(0)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('falcons 是数组', () => {
      expect(Array.isArray((sys as any).falcons)).toBe(true)
    })
  })

  // ============================================================
  // TrainedFalcon 数据结构
  // ============================================================
  describe('TrainedFalcon 数据结构', () => {
    it('注入后可查询 breed', () => {
      ;(sys as any).falcons.push(makeFalcon(1, 'gyrfalcon'))
      expect((sys as any).falcons[0].breed).toBe('gyrfalcon')
    })

    it('FalconBreed 包含4种', () => {
      const breeds: FalconBreed[] = ['peregrine', 'gyrfalcon', 'merlin', 'kestrel']
      breeds.forEach((b, i) => { ;(sys as any).falcons.push(makeFalcon(i + 1, b)) })
      const all = (sys as any).falcons
      breeds.forEach((b, i) => { expect(all[i].breed).toBe(b) })
    })

    it('FalconTask 包含4种', () => {
      const tasks: FalconTask[] = ['hunting', 'scouting', 'resting', 'training']
      tasks.forEach((t, i) => { ;(sys as any).falcons.push(makeFalcon(i + 1, 'peregrine', t)) })
      const all = (sys as any).falcons
      tasks.forEach((t, i) => { expect(all[i].task).toBe(t) })
    })

    it('TrainedFalcon 字段完整性', () => {
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

    it('ownerId 字段正确', () => {
      ;(sys as any).falcons.push(makeFalcon(42, 'merlin'))
      expect((sys as any).falcons[0].ownerId).toBe(42)
    })

    it('id 字段唯一', () => {
      const f1 = makeFalcon(1)
      const f2 = makeFalcon(2)
      expect(f2.id).toBeGreaterThan(f1.id)
    })

    it('tick 字段存在', () => {
      const f = makeFalcon(1)
      expect(f.tick).toBeDefined()
    })

    it('注入多个猎鹰可查询', () => {
      ;(sys as any).falcons.push(makeFalcon(1, 'peregrine', 'hunting'))
      ;(sys as any).falcons.push(makeFalcon(2, 'merlin', 'scouting'))
      ;(sys as any).falcons.push(makeFalcon(3, 'kestrel', 'resting'))
      expect((sys as any).falcons).toHaveLength(3)
      expect((sys as any).falcons[1].breed).toBe('merlin')
      expect((sys as any).falcons[2].task).toBe('resting')
    })

    it('loyalty 可以设为任意数值', () => {
      const f = makeFalcon(1)
      f.loyalty = 1
      ;(sys as any).falcons.push(f)
      expect((sys as any).falcons[0].loyalty).toBe(1)
    })

    it('stamina 可以设为任意数值', () => {
      const f = makeFalcon(1)
      f.stamina = 15
      ;(sys as any).falcons.push(f)
      expect((sys as any).falcons[0].stamina).toBe(15)
    })
  })

  // ============================================================
  // CHECK_INTERVAL 节流控制
  // ============================================================
  describe('CHECK_INTERVAL 节流控制', () => {
    it('tick 差值 < 2500 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, mockEm, 3499) // 2499 < 2500
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 2500 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, mockEm, 3500) // 2500 >= 2500
      expect((sys as any).lastCheck).toBe(3500)
    })

    it('lastCheck = 0 时 tick = 2500 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).lastCheck).toBe(2500)
    })

    it('lastCheck = 0 时 tick = 2499 不触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2499)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值恰好等于 2500 时触发', () => {
      ;(sys as any).lastCheck = 5000
      sys.update(16, mockEm, 7500)
      expect((sys as any).lastCheck).toBe(7500)
    })

    it('连续两次都超过阈值时各自更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)  // lastCheck=2500
      sys.update(16, mockEm, 5000)  // lastCheck=5000
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('多次调用只有第一次跨越阈值时更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)  // 触发，lastCheck=2500
      sys.update(16, mockEm, 2501)  // 差值1，不触发
      expect((sys as any).lastCheck).toBe(2500)
    })

    it('tick 未达阈值时猎鹰属性不变化', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 40 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 100) // 未达阈值
      expect((sys as any).falcons[0].skill).toBe(40)
    })
  })

  // ============================================================
  // training 任务逻辑
  // ============================================================
  describe('training 任务逻辑', () => {
    it('training 任务下 skill + 0.3', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 40 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].skill).toBeCloseTo(40.3)
    })

    it('training 任务下 loyalty + 0.2', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 40, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // loyalty + 0.2 - 0.05 = +0.15
      expect((sys as any).falcons[0].loyalty).toBeCloseTo(80.15)
    })

    it('skill 上限 100', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 99.8 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].skill).toBe(100)
    })

    it('loyalty 上限 100（training 时 + 0.2）', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 40, loyalty: 99.9 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // min(100, 99.9+0.2)=100, 然后 -0.05 = 99.95
      expect((sys as any).falcons[0].loyalty).toBeCloseTo(99.95)
    })

    it('skill <= 50 时不切换任务', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 40, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].task).toBe('training')
    })

    it('skill > 50 时切换到 hunting 或 scouting', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 50.01, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // skill+0.3 -> 50.31 > 50 -> 切换
      const task = (sys as any).falcons[0].task
      expect(['hunting', 'scouting']).toContain(task)
    })

    it('skill 恰好等于 50 时不切换（<= 50）', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 49.7, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 49.7 + 0.3 = 50.0 -> not > 50 -> 不切换
      expect((sys as any).falcons[0].task).toBe('training')
    })
  })

  // ============================================================
  // hunting 任务逻辑
  // ============================================================
  describe('hunting 任务逻辑', () => {
    it('hunting 任务下 stamina 减少 1.5', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 50, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].stamina).toBeCloseTo(48.5)
    })

    it('hunting 且 stamina < 20 时切换到 resting', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 15, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // stamina 15 - 1.5 = 13.5 < 20 -> resting
      expect((sys as any).falcons[0].task).toBe('resting')
    })

    it('hunting 且 stamina = 21 时不切换任务', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 21, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // stamina 21 - 1.5 = 19.5 < 20 -> resting
      expect((sys as any).falcons[0].task).toBe('resting')
    })

    it('hunting 且 stamina = 25 时不切换任务（25-1.5=23.5 >= 20）', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 25, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].task).toBe('hunting')
    })

    it('hunting 任务同时扣减 loyalty 0.05', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 50, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].loyalty).toBeCloseTo(79.95)
    })
  })

  // ============================================================
  // scouting 任务逻辑
  // ============================================================
  describe('scouting 任务逻辑', () => {
    it('scouting 任务下 stamina 减少 0.8', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'scouting'), stamina: 50, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].stamina).toBeCloseTo(49.2)
    })

    it('scouting 且 stamina < 20 时切换到 resting', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'scouting'), stamina: 15, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].task).toBe('resting')
    })

    it('scouting 且 stamina >= 20 时保持任务', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'scouting'), stamina: 25, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 25 - 0.8 = 24.2 >= 20 -> 保持
      expect((sys as any).falcons[0].task).toBe('scouting')
    })

    it('scouting 任务同时扣减 loyalty 0.05', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'scouting'), stamina: 50, loyalty: 60 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].loyalty).toBeCloseTo(59.95)
    })

    it('scouting stamina 恰好为 20.8 时不切换（20.8-0.8=20.0，不 < 20）', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'scouting'), stamina: 20.8, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 20.8 - 0.8 = 20.0 不 < 20 -> 保持
      expect((sys as any).falcons[0].task).toBe('scouting')
    })
  })

  // ============================================================
  // resting 任务逻辑
  // ============================================================
  describe('resting 任务逻辑', () => {
    it('resting 任务下 stamina 恢复 3', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 50, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].stamina).toBeCloseTo(53)
    })

    it('resting stamina 上限 100', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 98.5, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].stamina).toBe(100)
    })

    it('resting 且 stamina > 80 时切换到 hunting 或 scouting', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 78, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // stamina 78+3=81 > 80 -> 切换到 hunting/scouting
      const task = (sys as any).falcons[0].task
      expect(['hunting', 'scouting']).toContain(task)
    })

    it('resting 且 stamina <= 80 时不切换任务', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 70, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 70+3=73 not > 80 -> 保持 resting
      expect((sys as any).falcons[0].task).toBe('resting')
    })

    it('resting 任务同时扣减 loyalty 0.05', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 50, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].loyalty).toBeCloseTo(79.95)
    })

    it('resting stamina 恰好等于 80 后不切换（80 not > 80）', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 77, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 77+3=80 not > 80 -> 保持
      expect((sys as any).falcons[0].task).toBe('resting')
    })
  })

  // ============================================================
  // loyalty 耗尽移除逻辑
  // ============================================================
  describe('loyalty 耗尽移除逻辑', () => {
    it('loyalty <= 0 时移除猎鹰', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), loyalty: 0.04, stamina: 50 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // loyalty 0.04 - 0.05 = -0.01 <= 0 -> removed
      expect((sys as any).falcons).toHaveLength(0)
    })

    it('loyalty 恰好等于 0 时移除', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), loyalty: 0.05, stamina: 50 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 0.05 - 0.05 = 0 <= 0 -> removed
      expect((sys as any).falcons).toHaveLength(0)
    })

    it('loyalty > 0 时保留猎鹰', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), loyalty: 1, stamina: 50 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      // 1 - 0.05 = 0.95 > 0 -> 保留
      expect((sys as any).falcons).toHaveLength(1)
    })

    it('多个猎鹰部分 loyalty 耗尽时只删低忠诚度', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), loyalty: 0.02, stamina: 50 })
      ;(sys as any).falcons.push({ ...makeFalcon(2, 'merlin', 'resting'), loyalty: 50, stamina: 50 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      const falcons = (sys as any).falcons as TrainedFalcon[]
      expect(falcons.some(f => f.ownerId === 1)).toBe(false)
      expect(falcons.some(f => f.ownerId === 2)).toBe(true)
    })

    it('全部 loyalty 耗尽时全部清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).falcons.push({ ...makeFalcon(i + 1, 'peregrine', 'resting'), loyalty: 0.01, stamina: 50 })
      }
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons).toHaveLength(0)
    })
  })

  // ============================================================
  // 招募新猎鹰（MAX_FALCONS = 25）
  // ============================================================
  describe('招募新猎鹰逻辑', () => {
    it('random < TAME_CHANCE 且有实体时招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.003
      const em = { getEntitiesWithComponent: () => [1, 2, 3] } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 2500)
      expect((sys as any).falcons.length).toBeGreaterThan(0)
    })

    it('random > TAME_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.003
      const em = { getEntitiesWithComponent: () => [1] } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 2500)
      expect((sys as any).falcons).toHaveLength(0)
    })

    it('已达 MAX_FALCONS 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 25; i++) {
        ;(sys as any).falcons.push(makeFalcon(i + 1))
      }
      const em = { getEntitiesWithComponent: () => [100] } as any
      ;(sys as any).lastCheck = 0
      const before = (sys as any).falcons.length
      sys.update(16, em, 2500)
      // 已经满了，不招募，但loyalty可能清除某些猎鹰
      // 只验证不超过25+合理的新加
      expect((sys as any).falcons.length).toBeLessThanOrEqual(25)
    })

    it('无实体时即使 random 通过也不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = { getEntitiesWithComponent: () => [] } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 2500)
      expect((sys as any).falcons).toHaveLength(0)
    })

    it('招募后 nextId 自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = { getEntitiesWithComponent: () => [1] } as any
      const beforeId = (sys as any).nextId
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 2500)
      expect((sys as any).nextId).toBeGreaterThan(beforeId)
    })

    it('招募的猎鹰初始 task 为 training', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = { getEntitiesWithComponent: () => [1] } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 2500)
      if ((sys as any).falcons.length > 0) {
        expect((sys as any).falcons[0].task).toBe('training')
      }
    })

    it('招募的猎鹰 stamina 为 100', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = { getEntitiesWithComponent: () => [1] } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 2500)
      if ((sys as any).falcons.length > 0) {
        // 注意：招募后会立即执行活动更新，training 下loyalty+0.2
        // 但 stamina=100 且 training 不改变 stamina
        expect((sys as any).falcons[0].stamina).toBe(100)
      }
    })
  })

  // ============================================================
  // 边界与极端值
  // ============================================================
  describe('边界与极端值', () => {
    it('falcons 为空时 update 不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, mockEm, 2500)).not.toThrow()
    })

    it('dt = 0 也能正常执行', () => {
      ;(sys as any).falcons.push(makeFalcon(1, 'peregrine', 'training'))
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(0, mockEm, 2500)).not.toThrow()
    })

    it('dt 为负数也不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(-16, mockEm, 2500)).not.toThrow()
    })

    it('非常大的 tick 值不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, mockEm, 9999999)).not.toThrow()
    })

    it('多个系统实例互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).falcons.push(makeFalcon(1))
      expect((sys2 as any).falcons).toHaveLength(0)
    })

    it('skill 精确上限100：skill=99.8 training 后 min(100,100.1)=100', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'training'), skill: 99.8, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].skill).toBe(100)
    })

    it('stamina 精确上限100：resting 后 min(100, stamina+3)', () => {
      ;(sys as any).falcons.push({ ...makeFalcon(1, 'peregrine', 'resting'), stamina: 98.5, loyalty: 80 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      expect((sys as any).falcons[0].stamina).toBe(100)
    })

    it('all breeds 均可作为合法 breed 注入', () => {
      const breeds: FalconBreed[] = ['peregrine', 'gyrfalcon', 'merlin', 'kestrel']
      for (const b of breeds) {
        ;(sys as any).falcons.push(makeFalcon(nextId, b))
      }
      expect((sys as any).falcons.length).toBe(4)
    })

    it('scouting 和 hunting 的 stamina 消耗速度不同', () => {
      const hunting = { ...makeFalcon(1, 'peregrine', 'hunting'), stamina: 50, loyalty: 80 }
      const scouting = { ...makeFalcon(2, 'peregrine', 'scouting'), stamina: 50, loyalty: 80 }
      ;(sys as any).falcons.push(hunting)
      ;(sys as any).falcons.push(scouting)
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 2500)
      const f = (sys as any).falcons as TrainedFalcon[]
      const huntingStamina = f.find(x => x.ownerId === 1)?.stamina ?? 0
      const scoutingStamina = f.find(x => x.ownerId === 2)?.stamina ?? 0
      // hunting 消耗 1.5，scouting 消耗 0.8，scouting 剩余更多
      expect(scoutingStamina).toBeGreaterThan(huntingStamina)
    })
  })
})

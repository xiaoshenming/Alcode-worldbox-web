import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCourierSystem } from '../systems/CreatureCourierSystem'
import type { Delivery, DeliveryStatus, MessagePriority } from '../systems/CreatureCourierSystem'

let nextId = 1
function makeSys(): CreatureCourierSystem { return new CreatureCourierSystem() }
function makeDelivery(
  courierId: number,
  status: DeliveryStatus = 'dispatched',
  priority: MessagePriority = 'routine',
  fromX = 10, fromY = 10, toX = 50, toY = 50,
  progress = 0, speed = 1, tick = 0
): Delivery {
  return { id: nextId++, courierId, fromX, fromY, toX, toY, status, priority, progress, speed, tick }
}

const EM_EMPTY = { getEntitiesWithComponent: () => [] } as any

describe('CreatureCourierSystem', () => {
  let sys: CreatureCourierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ─── 初始状态 ───────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无配送记录', () => {
      expect((sys as any).deliveries).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('deliveries 是数组类型', () => {
      expect(Array.isArray((sys as any).deliveries)).toBe(true)
    })
  })

  // ─── 类型枚举 ─────────────────────────────���─────────────────────
  describe('DeliveryStatus 类型', () => {
    it('支持 dispatched 状态', () => {
      const d = makeDelivery(1, 'dispatched')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].status).toBe('dispatched')
    })

    it('支持 traveling 状态', () => {
      const d = makeDelivery(1, 'traveling')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].status).toBe('traveling')
    })

    it('支持 delivered 状态', () => {
      const d = makeDelivery(1, 'delivered')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })

    it('支持 lost 状态', () => {
      const d = makeDelivery(1, 'lost')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].status).toBe('lost')
    })

    it('支持所有 4 种 DeliveryStatus', () => {
      const statuses: DeliveryStatus[] = ['dispatched', 'traveling', 'delivered', 'lost']
      statuses.forEach((s, i) => { ;(sys as any).deliveries.push(makeDelivery(i + 1, s)) })
      const all = (sys as any).deliveries as Delivery[]
      statuses.forEach((s, i) => { expect(all[i].status).toBe(s) })
    })
  })

  describe('MessagePriority 类型', () => {
    it('支持 routine 优先级', () => {
      const d = makeDelivery(1, 'dispatched', 'routine')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].priority).toBe('routine')
    })

    it('支持 urgent 优先级', () => {
      const d = makeDelivery(1, 'dispatched', 'urgent')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].priority).toBe('urgent')
    })

    it('支持 diplomatic 优先级', () => {
      const d = makeDelivery(1, 'dispatched', 'diplomatic')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].priority).toBe('diplomatic')
    })

    it('支持 military 优先级', () => {
      const d = makeDelivery(1, 'dispatched', 'military')
      ;(sys as any).deliveries.push(d)
      expect((sys as any).deliveries[0].priority).toBe('military')
    })

    it('支持所有 4 种 MessagePriority', () => {
      const priorities: MessagePriority[] = ['routine', 'urgent', 'diplomatic', 'military']
      priorities.forEach((p, i) => { ;(sys as any).deliveries.push(makeDelivery(i + 1, 'dispatched', p)) })
      const all = (sys as any).deliveries as Delivery[]
      priorities.forEach((p, i) => { expect(all[i].priority).toBe(p) })
    })
  })

  // ─── CHECK_INTERVAL 节流 ─────────────────────────────────────────
  describe('CHECK_INTERVAL 节流逻辑（2000）', () => {
    it('tick 差值 < 2000 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 1000 + 1999)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 2000 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      const tick = 1000 + 2000
      sys.update(1, EM_EMPTY, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('tick 差值恰好为 2000 时触发', () => {
      ;(sys as any).lastCheck = 500
      sys.update(1, EM_EMPTY, 2500)
      expect((sys as any).lastCheck).toBe(2500)
    })

    it('tick 差值为 1999 时不触发', () => {
      ;(sys as any).lastCheck = 500
      sys.update(1, EM_EMPTY, 2499)
      expect((sys as any).lastCheck).toBe(500)
    })

    it('lastCheck=0 时首次 tick=0 不触发（差值=0 < 2000）', () => {
      sys.update(1, EM_EMPTY, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('lastCheck=0 时首次 tick=2000 触发', () => {
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).lastCheck).toBe(2000)
    })

    it('连续两次触发间隔各为 2000 时 lastCheck 更新两次', () => {
      sys.update(1, EM_EMPTY, 2000)
      sys.update(1, EM_EMPTY, 4000)
      expect((sys as any).lastCheck).toBe(4000)
    })
  })

  // ─── Delivery 数据结构 ─────────────────────────────────────────
  describe('Delivery 数据结构', () => {
    it('Delivery 字段：id, courierId, fromX, fromY, toX, toY, status, priority, progress, speed, tick', () => {
      const d = makeDelivery(42, 'traveling', 'urgent', 5, 6, 15, 16, 3, 2, 100)
      expect(d.id).toBeDefined()
      expect(d.courierId).toBe(42)
      expect(d.fromX).toBe(5)
      expect(d.fromY).toBe(6)
      expect(d.toX).toBe(15)
      expect(d.toY).toBe(16)
      expect(d.status).toBe('traveling')
      expect(d.priority).toBe('urgent')
      expect(d.progress).toBe(3)
      expect(d.speed).toBe(2)
      expect(d.tick).toBe(100)
    })

    it('注入后可通过 courierId 查询', () => {
      ;(sys as any).deliveries.push(makeDelivery(99, 'traveling', 'urgent'))
      expect((sys as any).deliveries[0].courierId).toBe(99)
    })

    it('注入多个 Delivery 并全部查询', () => {
      ;(sys as any).deliveries.push(makeDelivery(1, 'dispatched', 'routine'))
      ;(sys as any).deliveries.push(makeDelivery(2, 'traveling', 'urgent'))
      ;(sys as any).deliveries.push(makeDelivery(3, 'delivered', 'military'))
      expect((sys as any).deliveries).toHaveLength(3)
      expect((sys as any).deliveries[1].courierId).toBe(2)
    })

    it('同一 courierId 可以有多个 Delivery', () => {
      ;(sys as any).deliveries.push(makeDelivery(5, 'dispatched'))
      ;(sys as any).deliveries.push(makeDelivery(5, 'traveling'))
      const all = (sys as any).deliveries as Delivery[]
      expect(all.filter(d => d.courierId === 5)).toHaveLength(2)
    })
  })

  // ─── update 核心逻辑 ──────────────────────────────────────────
  describe('update: dispatched → traveling', () => {
    it('dispatched 状态 update 后变为 traveling', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'dispatched', 'routine', 0, 0, 100, 0, 0, 5, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('traveling')
    })

    it('dispatched 状态 update 后 progress 增加 speed', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'dispatched', 'routine', 0, 0, 100, 0, 0, 5, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].progress).toBe(5)
    })

    it('speed=3 时 progress 从 0 增加到 3', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 200, 0, 0, 3, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].progress).toBe(3)
    })
  })

  describe('update: progress >= dist → delivered', () => {
    it('progress >= distance 时 status 变为 delivered', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // dist = sqrt((30-10)^2 + (10-10)^2) = 20, speed=25
      const d = makeDelivery(1, 'traveling', 'routine', 10, 10, 30, 10, 0, 25, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })

    it('progress 未到 distance 时保持 traveling', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // dist = 100, speed=1, progress=0
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 100, 0, 0, 1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('traveling')
    })

    it('fromX=toX, fromY=toY 时 dist=0, 强制使用 1, progress=speed 时立即 delivered', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // dist || 1 = 1, speed=2, progress=0 → 2 >= 1 → delivered
      const d = makeDelivery(1, 'traveling', 'routine', 5, 5, 5, 5, 0, 2, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })

    it('progress 恰好等于 dist 时 delivered', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // dist = 3,4,5 三角形: from(0,0) to(3,4), dist=5, speed=5
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 3, 4, 0, 5, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })
  })

  describe('update: lost 随机概率', () => {
    it('Math.random() < 0.002 时 traveling 变为 lost', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 1000, 0, 0, 1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('lost')
    })

    it('Math.random() = 0.002 时不触发 lost（< 0.002 才触发）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.002)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 1000, 0, 0, 1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('traveling')
    })

    it('Math.random() = 0.5 时 traveling 不变为 lost', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 1000, 0, 0, 1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).not.toBe('lost')
    })
  })

  describe('update: delivered/lost 状态不再推进', () => {
    it('delivered 状态不再推进 progress', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const currentTick = 2000
      const d: Delivery = {
        id: nextId++, courierId: 1, fromX: 0, fromY: 0, toX: 10, toY: 0,
        status: 'delivered', priority: 'routine', progress: 10, speed: 5,
        tick: currentTick - 100
      }
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, currentTick)
      const updated = (sys as any).deliveries[0] as Delivery
      expect(updated.status).toBe('delivered')
      expect(updated.progress).toBe(10)
    })

    it('lost 状态不再推进 progress', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const currentTick = 2000
      const d: Delivery = {
        id: nextId++, courierId: 1, fromX: 0, fromY: 0, toX: 100, toY: 0,
        status: 'lost', priority: 'routine', progress: 5, speed: 3,
        tick: currentTick - 100
      }
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, currentTick)
      const updated = (sys as any).deliveries[0] as Delivery
      expect(updated.progress).toBe(5)
    })
  })

  // ─── Cleanup 逻辑 ──────────────────────────────────────────────
  describe('cleanup 逻辑（cutoff = tick - 40000）', () => {
    it('delivered 且 tick < cutoff 时被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'delivered', 'routine', 0, 0, 0, 0, 0, 1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 100000)
      expect((sys as any).deliveries).toHaveLength(0)
    })

    it('lost 且 tick < cutoff 时被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'lost', 'routine', 0, 0, 0, 0, 0, 1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 100000)
      expect((sys as any).deliveries).toHaveLength(0)
    })

    it('traveling 状态记录不被 cleanup 删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 1000, 0, 0, 0.1, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 100000)
      expect((sys as any).deliveries).toHaveLength(1)
    })

    it('dispatched 状态记录不被 cleanup 删除（进入 traveling）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // speed 极小，不会 delivered；tick足够新，不会被 cleanup（traveling不cleanup）
      const d = makeDelivery(1, 'dispatched', 'routine', 0, 0, 9999, 0, 0, 0.001, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 100000)
      // dispatched → traveling，traveling 不会被 cleanup
      expect((sys as any).deliveries).toHaveLength(1)
    })

    it('delivered 且 tick >= cutoff 时保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const currentTick = 100000
      const cutoff = currentTick - 40000 // 60000
      // tick = 70000 > 60000 → 保留
      const d = makeDelivery(1, 'delivered', 'routine', 0, 0, 0, 0, 0, 1, 70000)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, currentTick)
      expect((sys as any).deliveries).toHaveLength(1)
    })

    it('mixed: 旧 delivered 删除，新 traveling 保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const currentTick = 100000
      const oldDelivered = makeDelivery(1, 'delivered', 'routine', 0, 0, 0, 0, 0, 1, 0)
      const newTraveling = makeDelivery(2, 'traveling', 'routine', 0, 0, 9999, 0, 0, 0.001, currentTick - 1000)
      ;(sys as any).deliveries.push(oldDelivered, newTraveling)
      sys.update(1, EM_EMPTY, currentTick)
      expect((sys as any).deliveries).toHaveLength(1)
      expect((sys as any).deliveries[0].courierId).toBe(2)
    })

    it('cutoff 边界：tick 恰好等于 cutoff 时保留（< 才删）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const currentTick = 100000
      const cutoff = currentTick - 40000 // 60000
      // d.tick = 60000 = cutoff，条件是 d.tick < cutoff → false → 保留
      const d = makeDelivery(1, 'delivered', 'routine', 0, 0, 0, 0, 0, 1, cutoff)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, currentTick)
      expect((sys as any).deliveries).toHaveLength(1)
    })

    it('多个旧 delivered 全部被 cleanup', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).deliveries.push(makeDelivery(1, 'delivered', 'routine', 0, 0, 0, 0, 0, 1, 0))
      ;(sys as any).deliveries.push(makeDelivery(2, 'lost', 'urgent', 0, 0, 0, 0, 0, 1, 0))
      ;(sys as any).deliveries.push(makeDelivery(3, 'delivered', 'military', 0, 0, 0, 0, 0, 1, 0))
      sys.update(1, EM_EMPTY, 100000)
      expect((sys as any).deliveries).toHaveLength(0)
    })
  })

  // ─── MAX_DELIVERIES 限制 ───────────────────────────────────────
  describe('MAX_DELIVERIES = 35 限制', () => {
    it('注入 35 个 delivery 时数组长度为 35', () => {
      for (let i = 0; i < 35; i++) {
        ;(sys as any).deliveries.push(makeDelivery(i + 1, 'traveling'))
      }
      expect((sys as any).deliveries).toHaveLength(35)
    })

    it('超过 35 个注入后长度超过 35（手动注入不受内部限制）', () => {
      for (let i = 0; i < 40; i++) {
        ;(sys as any).deliveries.push(makeDelivery(i + 1, 'traveling'))
      }
      expect((sys as any).deliveries).toHaveLength(40)
    })
  })

  // ─── 距离计算 ─────────────────────────────────────────────────
  describe('距离计算（勾股定理）', () => {
    it('水平距离: from(0,0) to(10,0), dist=10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 10, 0, 0, 10, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })

    it('垂直距离: from(0,0) to(0,20), dist=20, speed=19 → 未到达', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 0, 20, 0, 19, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('traveling')
    })

    it('斜向距离: 3-4-5 三角形, dist=5, speed=6 → delivered', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 3, 4, 0, 6, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })

    it('progress 累积：多次 update 后到达目标', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      // dist=10, speed=4; 第1次: progress=4, 第2次: progress=8, 第3次: progress=12 >= 10 → delivered
      const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 10, 0, 0, 4, 0)
      ;(sys as any).deliveries.push(d)
      sys.update(1, EM_EMPTY, 2000)
      expect((sys as any).deliveries[0].progress).toBe(4)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 4000)
      expect((sys as any).deliveries[0].progress).toBe(8)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 6000)
      expect((sys as any).deliveries[0].status).toBe('delivered')
    })
  })

  // ─── 招募逻辑（mock em）────────────────────────────────────────
  describe('招募新 Courier（dispatch）', () => {
    it('entities.length <= 1 时不生成新 delivery', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // 触发 dispatch 概率
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue(null),
      } as any
      sys.update(1, em, 2000)
      // 只有1个实体, entities.length = 1, 不满足 > 1 → 不生成
      expect((sys as any).deliveries).toHaveLength(0)
    })

    it('entities.length = 0 时不生成新 delivery', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        getComponent: vi.fn().mockReturnValue(null),
      } as any
      sys.update(1, em, 2000)
      expect((sys as any).deliveries).toHaveLength(0)
    })

    it('Math.random() >= DISPATCH_CHANCE(0.005) 时不派遣', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([1, 2, 3]),
        getComponent: vi.fn().mockReturnValue({ x: 10, y: 20 }),
      } as any
      sys.update(1, em, 2000)
      expect((sys as any).deliveries).toHaveLength(0)
    })

    it('deliveries.length >= MAX_DELIVERIES(35) 时不派遣', () => {
      // 填满35个
      for (let i = 0; i < 35; i++) {
        ;(sys as any).deliveries.push(makeDelivery(i + 1, 'traveling'))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([1, 2, 3]),
        getComponent: vi.fn().mockReturnValue({ x: 10, y: 20 }),
      } as any
      sys.update(1, em, 2000)
      expect((sys as any).deliveries).toHaveLength(35)
    })

    it('position 为 null 时不生成 delivery', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([1, 2]),
        getComponent: vi.fn().mockReturnValue(null),
      } as any
      sys.update(1, em, 2000)
      expect((sys as any).deliveries).toHaveLength(0)
    })
  })

  // ─── 多实例独立性 ──────────────────────────────────────────────
  describe('多实例独立性', () => {
    it('两个 sys 实例各自独立', () => {
      const sys2 = makeSys()
      ;(sys as any).deliveries.push(makeDelivery(1, 'traveling'))
      expect((sys as any).deliveries).toHaveLength(1)
      expect((sys2 as any).deliveries).toHaveLength(0)
    })

    it('一个实例的 lastCheck 不影响另一个', () => {
      const sys2 = makeSys()
      ;(sys as any).lastCheck = 5000
      expect((sys2 as any).lastCheck).toBe(0)
    })
  })
})

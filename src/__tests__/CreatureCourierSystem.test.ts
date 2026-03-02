import { describe, it, expect, beforeEach, vi } from 'vitest'
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

// em stub: getEntitiesWithComponent返回空数组（避免随机招募）
const EM_EMPTY = { getEntitiesWithComponent: () => [] } as any

describe('CreatureCourierSystem', () => {
  let sys: CreatureCourierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // 1. 初始无配送
  it('初始无配送', () => {
    expect((sys as any).deliveries).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).deliveries.push(makeDelivery(1, 'traveling', 'urgent'))
    expect((sys as any).deliveries[0].status).toBe('traveling')
    expect((sys as any).deliveries[0].priority).toBe('urgent')
  })

  // 3. DeliveryStatus包含4种
  it('支持所有4种配送状态', () => {
    const statuses: DeliveryStatus[] = ['dispatched', 'traveling', 'delivered', 'lost']
    statuses.forEach((s, i) => { ;(sys as any).deliveries.push(makeDelivery(i + 1, s)) })
    const all = (sys as any).deliveries as Delivery[]
    statuses.forEach((s, i) => { expect(all[i].status).toBe(s) })
  })

  // 4. MessagePriority包含4种
  it('支持所有4种消息优先级', () => {
    const priorities: MessagePriority[] = ['routine', 'urgent', 'diplomatic', 'military']
    priorities.forEach((p, i) => { ;(sys as any).deliveries.push(makeDelivery(i + 1, 'dispatched', p)) })
    const all = (sys as any).deliveries as Delivery[]
    priorities.forEach((p, i) => { expect(all[i].priority).toBe(p) })
  })

  // 5. tick差值<2000时不更新lastCheck
  it('tick差值<2000时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, EM_EMPTY, 1000 + 1999)
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=2000时更新lastCheck
  it('tick差值>=2000时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const tick = 1000 + 2000
    sys.update(1, EM_EMPTY, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })

  // 7. 注入多个Delivery并查询
  it('注入多个Delivery并全部查询', () => {
    ;(sys as any).deliveries.push(makeDelivery(1, 'dispatched', 'routine'))
    ;(sys as any).deliveries.push(makeDelivery(2, 'traveling', 'urgent'))
    ;(sys as any).deliveries.push(makeDelivery(3, 'delivered', 'military'))
    expect((sys as any).deliveries).toHaveLength(3)
    expect((sys as any).deliveries[1].courierId).toBe(2)
  })

  // 8. dispatched状态在update后变为traveling，progress增加speed
  it('dispatched状态update后变为traveling且progress增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不触发lost(0.002阈值)
    const d = makeDelivery(1, 'dispatched', 'routine', 0, 0, 100, 0, 0, 5, 0)
    ;(sys as any).deliveries.push(d)
    sys.update(1, EM_EMPTY, 2000)
    const updated = (sys as any).deliveries[0] as Delivery
    expect(updated.status).toBe('traveling')
    expect(updated.progress).toBe(5)
  })

  // 9. progress>=dist时status变为delivered
  it('progress>=distance时status变为delivered', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // dist = sqrt((30-10)^2 + (10-10)^2) = 20
    // speed=25, progress=0 → after update: progress=25 >= 20 → delivered
    const d = makeDelivery(1, 'traveling', 'routine', 10, 10, 30, 10, 0, 25, 0)
    ;(sys as any).deliveries.push(d)
    sys.update(1, EM_EMPTY, 2000)
    expect((sys as any).deliveries[0].status).toBe('delivered')
  })

  // 10. cleanup: delivered且tick<cutoff时被删除
  it('cleanup: delivered且tick足够旧时被删除', () => {
    // cutoff = tick - 40000 = 100000 - 40000 = 60000
    // d.tick = 0 < 60000 → 被删除
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const d = makeDelivery(1, 'delivered', 'routine', 0, 0, 0, 0, 0, 1, 0)
    ;(sys as any).deliveries.push(d)
    sys.update(1, EM_EMPTY, 100000)
    expect((sys as any).deliveries).toHaveLength(0)
  })

  // 11. cleanup: lost且tick足够旧时被删除
  it('cleanup: lost且tick足够旧时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const d = makeDelivery(1, 'lost', 'routine', 0, 0, 0, 0, 0, 1, 0)
    ;(sys as any).deliveries.push(d)
    sys.update(1, EM_EMPTY, 100000)
    expect((sys as any).deliveries).toHaveLength(0)
  })

  // 12. traveling状态的旧记录不在cutoff内则保留
  it('traveling状态记录不被cleanup删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // traveling状态不满足cleanup条件（只有delivered/lost才cleanup）
    const d = makeDelivery(1, 'traveling', 'routine', 0, 0, 1000, 0, 0, 0.1, 0)
    ;(sys as any).deliveries.push(d)
    sys.update(1, EM_EMPTY, 100000)
    expect((sys as any).deliveries).toHaveLength(1)
  })

  // 13. delivered状态不再推进progress
  it('delivered状态的delivery不再推进progress', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // 使用一个新tick使d.tick在cutoff范围内（不被cleanup）
    const currentTick = 2000
    const d: Delivery = { id: nextId++, courierId: 1, fromX: 0, fromY: 0, toX: 10, toY: 0, status: 'delivered', priority: 'routine', progress: 10, speed: 5, tick: currentTick - 100 }
    ;(sys as any).deliveries.push(d)
    sys.update(1, EM_EMPTY, currentTick)
    // status仍为delivered（不变），progress不再增加
    const updated = (sys as any).deliveries[0] as Delivery
    expect(updated.status).toBe('delivered')
    expect(updated.progress).toBe(10)
  })
})

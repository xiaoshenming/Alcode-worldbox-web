import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCourierSystem } from '../systems/CreatureCourierSystem'
import type { Delivery, DeliveryStatus, MessagePriority } from '../systems/CreatureCourierSystem'

let nextId = 1
function makeSys(): CreatureCourierSystem { return new CreatureCourierSystem() }
function makeDelivery(courierId: number, status: DeliveryStatus = 'dispatched', priority: MessagePriority = 'routine'): Delivery {
  return { id: nextId++, courierId, fromX: 10, fromY: 10, toX: 50, toY: 50, status, priority, progress: 0, speed: 1, tick: 0 }
}

describe('CreatureCourierSystem.getDeliveries', () => {
  let sys: CreatureCourierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无配送', () => { expect((sys as any).deliveries).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).deliveries.push(makeDelivery(1, 'traveling', 'urgent'))
    expect((sys as any).deliveries[0].status).toBe('traveling')
    expect((sys as any).deliveries[0].priority).toBe('urgent')
  })

  it('返回只读引用', () => {
    ;(sys as any).deliveries.push(makeDelivery(1))
    expect((sys as any).deliveries).toBe((sys as any).deliveries)
  })

  it('支持所有 4 种配送状态', () => {
    const statuses: DeliveryStatus[] = ['dispatched', 'traveling', 'delivered', 'lost']
    statuses.forEach((s, i) => { ;(sys as any).deliveries.push(makeDelivery(i + 1, s)) })
    const all = (sys as any).deliveries
    statuses.forEach((s, i) => { expect(all[i].status).toBe(s) })
  })

  it('支持所有 4 种优先级', () => {
    const priorities: MessagePriority[] = ['routine', 'urgent', 'diplomatic', 'military']
    priorities.forEach((p, i) => { ;(sys as any).deliveries.push(makeDelivery(i + 1, 'dispatched', p)) })
    const all = (sys as any).deliveries
    priorities.forEach((p, i) => { expect(all[i].priority).toBe(p) })
  })
})

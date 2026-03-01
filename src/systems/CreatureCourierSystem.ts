// Creature Courier System (v3.113) - Message runners between settlements
// Couriers carry messages and small goods between villages

import { EntityManager, EntityId } from '../ecs/Entity'

export type DeliveryStatus = 'dispatched' | 'traveling' | 'delivered' | 'lost'
export type MessagePriority = 'routine' | 'urgent' | 'diplomatic' | 'military'

export interface Delivery {
  id: number
  courierId: EntityId
  fromX: number
  fromY: number
  toX: number
  toY: number
  status: DeliveryStatus
  priority: MessagePriority
  progress: number
  speed: number
  tick: number
}

const CHECK_INTERVAL = 2000
const DISPATCH_CHANCE = 0.005
const MAX_DELIVERIES = 35

const PRIORITIES: MessagePriority[] = ['routine', 'urgent', 'diplomatic', 'military']

export class CreatureCourierSystem {
  private deliveries: Delivery[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Dispatch new couriers
    if (this.deliveries.length < MAX_DELIVERIES && Math.random() < DISPATCH_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 1) {
        const idx = Math.floor(Math.random() * entities.length)
        const eid = entities[idx]
        const pos = em.getComponent(eid, 'position') as { x: number; y: number } | undefined
        if (pos) {
          const destX = pos.x + Math.floor(Math.random() * 60) - 30
          const destY = pos.y + Math.floor(Math.random() * 60) - 30
          this.deliveries.push({
            id: this.nextId++,
            courierId: eid,
            fromX: pos.x, fromY: pos.y,
            toX: destX, toY: destY,
            status: 'dispatched',
            priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
            progress: 0,
            speed: 1 + Math.random() * 3,
            tick,
          })
        }
      }
    }

    // Update deliveries
    for (const d of this.deliveries) {
      if (d.status === 'delivered' || d.status === 'lost') continue
      if (d.status === 'dispatched') d.status = 'traveling'
      d.progress += d.speed
      const dist = Math.sqrt((d.toX - d.fromX) ** 2 + (d.toY - d.fromY) ** 2) || 1
      if (d.progress >= dist) {
        d.status = 'delivered'
      }
      // Small chance of getting lost
      if (Math.random() < 0.002) d.status = 'lost'
    }

    // Cleanup completed deliveries
    const cutoff = tick - 40000
    for (let i = this.deliveries.length - 1; i >= 0; i--) {
      const d = this.deliveries[i]
      if ((d.status === 'delivered' || d.status === 'lost') && d.tick < cutoff) {
        this.deliveries.splice(i, 1)
      }
    }
  }

}

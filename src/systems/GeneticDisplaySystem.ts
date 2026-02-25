/** GeneticDisplaySystem - family tree traits visualization in creature panel */
import { EntityManager, EntityId, CreatureComponent, GeneticsComponent } from '../ecs/Entity'

export interface TraitDisplay {
  name: string
  value: number
  color: string
  label: string  // e.g. "Strong", "Weak"
}

export interface FamilyNode {
  entityId: EntityId
  name: string
  generation: number
  alive: boolean
  traits: TraitDisplay[]
}

export interface FamilyTree {
  root: FamilyNode
  parents: [FamilyNode | null, FamilyNode | null]
  grandparents: FamilyNode[]
}

const TRAIT_COLORS: Record<string, string> = {
  strength: '#ff6644',
  vitality: '#44cc44',
  agility: '#4488ff',
  fertility: '#ff88cc',
  longevity: '#ccaa44',
  intelligence: '#aa88ff',
}

const TRAIT_LABELS: Record<string, [string, string, string]> = {
  // [low, normal, high]
  strength: ['Frail', 'Average', 'Strong'],
  vitality: ['Sickly', 'Healthy', 'Robust'],
  agility: ['Slow', 'Nimble', 'Swift'],
  fertility: ['Barren', 'Fertile', 'Prolific'],
  longevity: ['Short-lived', 'Normal', 'Long-lived'],
  intelligence: ['Dim', 'Clever', 'Brilliant'],
}

function traitLabel(name: string, value: number): string {
  const labels = TRAIT_LABELS[name]
  if (!labels) return 'Unknown'
  if (value < 0.8) return labels[0]
  if (value > 1.3) return labels[2]
  return labels[1]
}

export class GeneticDisplaySystem {
  /** Build trait display for a creature */
  getTraits(entityId: EntityId, em: EntityManager): TraitDisplay[] {
    const gen = em.getComponent<GeneticsComponent>(entityId, 'genetics')
    if (!gen) return []

    const result: TraitDisplay[] = []
    for (const [key, value] of Object.entries(gen.traits)) {
      result.push({
        name: key,
        value: value as number,
        color: TRAIT_COLORS[key] ?? '#888',
        label: traitLabel(key, value as number),
      })
    }
    return result
  }

  /** Build family tree for a creature (up to grandparents) */
  getFamilyTree(entityId: EntityId, em: EntityManager): FamilyTree | null {
    const gen = em.getComponent<GeneticsComponent>(entityId, 'genetics')
    const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
    if (!gen || !creature) return null

    const root = this.buildNode(entityId, em)
    if (!root) return null

    const parentA = gen.parentA !== null ? this.buildNode(gen.parentA, em) : null
    const parentB = gen.parentB !== null ? this.buildNode(gen.parentB, em) : null

    const grandparents: FamilyNode[] = []
    for (const parent of [gen.parentA, gen.parentB]) {
      if (parent === null) continue
      const pGen = em.getComponent<GeneticsComponent>(parent, 'genetics')
      if (!pGen) continue
      if (pGen.parentA !== null) {
        const gp = this.buildNode(pGen.parentA, em)
        if (gp) grandparents.push(gp)
      }
      if (pGen.parentB !== null) {
        const gp = this.buildNode(pGen.parentB, em)
        if (gp) grandparents.push(gp)
      }
    }

    return { root, parents: [parentA, parentB], grandparents }
  }

  /** Get mutation descriptions */
  getMutations(entityId: EntityId, em: EntityManager): string[] {
    const gen = em.getComponent<GeneticsComponent>(entityId, 'genetics')
    return gen?.mutations ?? []
  }

  /** Render trait bars into a canvas context (for creature panel) */
  renderTraitBars(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number,
    traits: TraitDisplay[]
  ): number {
    const barH = 12
    const gap = 3
    let cy = y

    ctx.save()
    ctx.font = '10px monospace'
    ctx.textBaseline = 'middle'

    for (const trait of traits) {
      // Label
      ctx.fillStyle = '#aaa'
      ctx.textAlign = 'left'
      ctx.fillText(trait.name.slice(0, 3).toUpperCase(), x, cy + barH / 2)

      // Bar background
      const barX = x + 30
      const barW = width - 70
      ctx.fillStyle = '#333'
      ctx.fillRect(barX, cy, barW, barH)

      // Bar fill (normalized: 0.5 = 0%, 2.0 = 100%)
      const pct = Math.min(1, Math.max(0, (trait.value - 0.5) / 1.5))
      ctx.fillStyle = trait.color
      ctx.globalAlpha = 0.8
      ctx.fillRect(barX, cy, barW * pct, barH)
      ctx.globalAlpha = 1

      // Value label
      ctx.fillStyle = '#ddd'
      ctx.textAlign = 'right'
      ctx.fillText(trait.label, x + width, cy + barH / 2)

      cy += barH + gap
    }

    ctx.restore()
    return cy - y  // total height used
  }

  /** Render mini family tree */
  renderFamilyTree(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    tree: FamilyTree
  ): void {
    ctx.save()
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const nodeW = 50
    const nodeH = 16
    const levelGap = 28

    // Root (current creature)
    this.drawNode(ctx, x, y, nodeW, nodeH, tree.root)

    // Parents
    const parentY = y - levelGap
    if (tree.parents[0]) {
      this.drawNode(ctx, x - 35, parentY, nodeW, nodeH, tree.parents[0])
      this.drawLine(ctx, x, y - nodeH / 2, x - 35, parentY + nodeH / 2)
    }
    if (tree.parents[1]) {
      this.drawNode(ctx, x + 35, parentY, nodeW, nodeH, tree.parents[1])
      this.drawLine(ctx, x, y - nodeH / 2, x + 35, parentY + nodeH / 2)
    }

    // Grandparents
    const gpY = parentY - levelGap
    const gpPositions = [-55, -20, 20, 55]
    for (let i = 0; i < Math.min(tree.grandparents.length, 4); i++) {
      this.drawNode(ctx, x + gpPositions[i], gpY, nodeW - 10, nodeH - 2, tree.grandparents[i])
      const parentX = i < 2 ? x - 35 : x + 35
      this.drawLine(ctx, parentX, parentY - nodeH / 2, x + gpPositions[i], gpY + (nodeH - 2) / 2)
    }

    ctx.restore()
  }

  private buildNode(entityId: EntityId, em: EntityManager): FamilyNode | null {
    const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
    const gen = em.getComponent<GeneticsComponent>(entityId, 'genetics')
    if (!creature) return null

    return {
      entityId,
      name: creature.name,
      generation: gen?.generation ?? 0,
      alive: true, // simplified - would check needs.health
      traits: this.getTraits(entityId, em),
    }
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    node: FamilyNode
  ): void {
    ctx.fillStyle = node.alive ? 'rgba(40,60,80,0.9)' : 'rgba(40,30,30,0.9)'
    ctx.strokeStyle = node.alive ? '#5588aa' : '#664444'
    ctx.lineWidth = 1
    ctx.fillRect(x - w / 2, y - h / 2, w, h)
    ctx.strokeRect(x - w / 2, y - h / 2, w, h)

    ctx.fillStyle = node.alive ? '#ddd' : '#888'
    const displayName = node.name.length > 7 ? node.name.slice(0, 6) + '…' : node.name
    ctx.fillText(displayName, x, y)
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, x2: number, y2: number
  ): void {
    ctx.strokeStyle = '#446'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}

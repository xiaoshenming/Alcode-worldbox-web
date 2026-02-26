import { TileType } from './Constants'
import { World } from '../game/World'

interface Node {
  x: number
  y: number
  g: number
  h: number
  f: number
  parent: Node | null
}

const WALKABLE: Set<TileType> = new Set([
  TileType.SAND, TileType.GRASS, TileType.FOREST, TileType.SNOW
])

// Dragons and special creatures can fly over anything except lava
const FLYABLE: Set<TileType> = new Set([
  TileType.DEEP_WATER, TileType.SHALLOW_WATER, TileType.SAND,
  TileType.GRASS, TileType.FOREST, TileType.MOUNTAIN, TileType.SNOW
])

export function isWalkable(tile: TileType, canFly: boolean = false): boolean {
  if (canFly) return FLYABLE.has(tile)
  return WALKABLE.has(tile)
}

// Simple A* with limited search radius for performance
export function findPath(
  world: World,
  startX: number, startY: number,
  endX: number, endY: number,
  canFly: boolean = false,
  maxSteps: number = 50
): { x: number; y: number }[] | null {
  const sx = Math.floor(startX)
  const sy = Math.floor(startY)
  const ex = Math.floor(endX)
  const ey = Math.floor(endY)

  // Already there
  if (sx === ex && sy === ey) return []

  // Target not walkable
  const targetTile = world.getTile(ex, ey)
  if (targetTile === null || !isWalkable(targetTile, canFly)) return null

  const open: Node[] = []
  const closed = new Set<number>()
  const key = (x: number, y: number) => y * world.width + x

  const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey)

  open.push({ x: sx, y: sy, g: 0, h: h(sx, sy), f: h(sx, sy), parent: null })

  const dirs = [
    [0, -1], [0, 1], [-1, 0], [1, 0],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ]

  let steps = 0

  while (open.length > 0 && steps < maxSteps * 10) {
    steps++

    // Find lowest f
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open[bestIdx]
    open.splice(bestIdx, 1)

    if (current.x === ex && current.y === ey) {
      // Reconstruct path
      const path: { x: number; y: number }[] = []
      let node: Node | null = current
      while (node && node.parent) {
        path.unshift({ x: node.x, y: node.y })
        node = node.parent
      }
      // Limit path length
      return path.slice(0, maxSteps)
    }

    closed.add(key(current.x, current.y))

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx
      const ny = current.y + dy

      if (nx < 0 || nx >= world.width || ny < 0 || ny >= world.height) continue
      if (closed.has(key(nx, ny))) continue

      const tile = world.getTile(nx, ny)
      if (tile === null || !isWalkable(tile, canFly)) continue

      // Diagonal cost
      const moveCost = (dx !== 0 && dy !== 0) ? 1.414 : 1
      const g = current.g + moveCost

      const existing = open.find(n => n.x === nx && n.y === ny)
      if (existing) {
        if (g < existing.g) {
          existing.g = g
          existing.f = g + existing.h
          existing.parent = current
        }
      } else {
        const hVal = h(nx, ny)
        open.push({ x: nx, y: ny, g, h: hVal, f: g + hVal, parent: current })
      }
    }
  }

  return null // No path found
}

// Lightweight: just find next step direction avoiding obstacles
export function findNextStep(
  world: World,
  fromX: number, fromY: number,
  toX: number, toY: number,
  canFly: boolean = false
): { x: number; y: number } | null {
  const fx = Math.floor(fromX)
  const fy = Math.floor(fromY)

  const dx = toX - fromX
  const dy = toY - fromY
  const dist2 = dx * dx + dy * dy
  if (dist2 < 0.25) return null

  // Preferred direction
  const dist = Math.sqrt(dist2)
  const ndx = dx / dist
  const ndy = dy / dist

  // Try direct, then alternatives
  const candidates = [
    { x: Math.sign(ndx), y: Math.sign(ndy) },
    { x: Math.sign(ndx), y: 0 },
    { x: 0, y: Math.sign(ndy) },
    { x: -Math.sign(ndy), y: Math.sign(ndx) }, // perpendicular
    { x: Math.sign(ndy), y: -Math.sign(ndx) },
  ]

  for (const c of candidates) {
    if (c.x === 0 && c.y === 0) continue
    const nx = fx + c.x
    const ny = fy + c.y
    const tile = world.getTile(nx, ny)
    if (tile !== null && isWalkable(tile, canFly)) {
      return { x: c.x, y: c.y }
    }
  }

  return null // Stuck
}

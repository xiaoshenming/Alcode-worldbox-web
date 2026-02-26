import { TileType } from './Constants'
import { World } from '../game/World'

// Static direction arrays to avoid GC in hot paths
const DIRS_8 = [
  [0, -1], [0, 1], [-1, 0], [1, 0],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
]

// Reusable candidate buffer for findNextStep
const _candidates = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]

// Reusable return object for findNextStep
const _stepResult = { x: 0, y: 0 }

interface Node {
  x: number
  y: number
  g: number
  h: number
  f: number
  parent: Node | null
  heapIndex: number
}

// ── Inline binary min-heap keyed on Node.f ──────────────────────────

const _heapData: Node[] = []
let _heapSize = 0

function _heapReset(): void {
  _heapSize = 0
}

function _heapPush(node: Node): void {
  node.heapIndex = _heapSize
  _heapData[_heapSize] = node
  _heapSize++
  _heapBubbleUp(node.heapIndex)
}

function _heapPop(): Node {
  const top = _heapData[0]
  _heapSize--
  if (_heapSize > 0) {
    const last = _heapData[_heapSize]
    _heapData[0] = last
    last.heapIndex = 0
    _heapSinkDown(0)
  }
  return top
}

/** Re-sort a node upward after its f value decreased. */
function _heapDecrease(node: Node): void {
  _heapBubbleUp(node.heapIndex)
}

function _heapBubbleUp(i: number): void {
  const node = _heapData[i]
  while (i > 0) {
    const pi = (i - 1) >> 1
    const parent = _heapData[pi]
    if (node.f >= parent.f) break
    _heapData[i] = parent
    parent.heapIndex = i
    i = pi
  }
  _heapData[i] = node
  node.heapIndex = i
}

function _heapSinkDown(i: number): void {
  const node = _heapData[i]
  while (true) {
    let smallest = i
    const l = 2 * i + 1
    const r = 2 * i + 2
    if (l < _heapSize && _heapData[l].f < _heapData[smallest].f) smallest = l
    if (r < _heapSize && _heapData[r].f < _heapData[smallest].f) smallest = r
    if (smallest === i) break
    const swap = _heapData[smallest]
    _heapData[i] = swap
    swap.heapIndex = i
    i = smallest
  }
  _heapData[i] = node
  node.heapIndex = i
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

// A* with binary min-heap and Map-based open set for O(log n) pop / O(1) lookup
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

  const w = world.width

  _heapReset()
  const openMap = new Map<number, Node>()
  const closed = new Set<number>()

  const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey)

  const hStart = h(sx, sy)
  const startNode: Node = { x: sx, y: sy, g: 0, h: hStart, f: hStart, parent: null, heapIndex: 0 }
  _heapPush(startNode)
  openMap.set(sy * w + sx, startNode)

  let steps = 0
  const maxIter = maxSteps * 10

  while (_heapSize > 0 && steps < maxIter) {
    steps++

    const current = _heapPop()
    const currentKey = current.y * w + current.x
    openMap.delete(currentKey)

    if (current.x === ex && current.y === ey) {
      // Reconstruct path: push + reverse instead of unshift
      const path: { x: number; y: number }[] = []
      let node: Node | null = current
      while (node && node.parent) {
        path.push({ x: node.x, y: node.y })
        node = node.parent
      }
      path.reverse()
      // Limit path length
      if (path.length > maxSteps) path.length = maxSteps
      return path
    }

    closed.add(currentKey)

    for (let d = 0; d < 8; d++) {
      const dir = DIRS_8[d]
      const nx = current.x + dir[0]
      const ny = current.y + dir[1]

      if (nx < 0 || nx >= w || ny < 0 || ny >= world.height) continue

      const nKey = ny * w + nx
      if (closed.has(nKey)) continue

      const tile = world.getTile(nx, ny)
      if (tile === null || !isWalkable(tile, canFly)) continue

      // Diagonal cost
      const moveCost = (dir[0] !== 0 && dir[1] !== 0) ? 1.414 : 1
      const g = current.g + moveCost

      const existing = openMap.get(nKey)
      if (existing !== undefined) {
        if (g < existing.g) {
          existing.g = g
          existing.f = g + existing.h
          existing.parent = current
          _heapDecrease(existing)
        }
      } else {
        const hVal = h(nx, ny)
        const newNode: Node = { x: nx, y: ny, g, h: hVal, f: g + hVal, parent: current, heapIndex: 0 }
        _heapPush(newNode)
        openMap.set(nKey, newNode)
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
  const sx = Math.sign(ndx), sy = Math.sign(ndy)
  _candidates[0].x = sx;  _candidates[0].y = sy
  _candidates[1].x = sx;  _candidates[1].y = 0
  _candidates[2].x = 0;   _candidates[2].y = sy
  _candidates[3].x = -sy; _candidates[3].y = sx  // perpendicular
  _candidates[4].x = sy;  _candidates[4].y = -sx

  for (let i = 0; i < 5; i++) {
    const c = _candidates[i]
    if (c.x === 0 && c.y === 0) continue
    const nx = fx + c.x
    const ny = fy + c.y
    const tile = world.getTile(nx, ny)
    if (tile !== null && isWalkable(tile, canFly)) {
      _stepResult.x = c.x
      _stepResult.y = c.y
      return _stepResult
    }
  }

  return null // Stuck
}

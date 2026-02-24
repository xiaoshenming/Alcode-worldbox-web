import { TileType, EntityType, PowerType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from './World'
import { Camera } from './Camera'

interface Power {
  type: PowerType
  name: string
  icon: string
  tileType?: TileType
  entityType?: EntityType
}

export class Powers {
  private world: World
  private currentPower: Power | null = null
  private brushSize: number = 2

  readonly terrainPowers: Power[] = [
    { type: PowerType.TERRAIN, name: 'Deep Water', icon: '🌊', tileType: TileType.DEEP_WATER },
    { type: PowerType.TERRAIN, name: 'Shallow Water', icon: '💧', tileType: TileType.SHALLOW_WATER },
    { type: PowerType.TERRAIN, name: 'Sand', icon: '🏖️', tileType: TileType.SAND },
    { type: PowerType.TERRAIN, name: 'Grass', icon: '🌿', tileType: TileType.GRASS },
    { type: PowerType.TERRAIN, name: 'Forest', icon: '🌲', tileType: TileType.FOREST },
    { type: PowerType.TERRAIN, name: 'Mountain', icon: '⛰️', tileType: TileType.MOUNTAIN },
    { type: PowerType.TERRAIN, name: 'Snow', icon: '❄️', tileType: TileType.SNOW },
    { type: PowerType.TERRAIN, name: 'Lava', icon: '🔥', tileType: TileType.LAVA },
  ]

  readonly creaturePowers: Power[] = [
    { type: PowerType.CREATURE, name: 'Human', icon: '👤', entityType: EntityType.HUMAN },
    { type: PowerType.CREATURE, name: 'Elf', icon: '🧝', entityType: EntityType.ELF },
    { type: PowerType.CREATURE, name: 'Dwarf', icon: '🧔', entityType: EntityType.DWARF },
    { type: PowerType.CREATURE, name: 'Orc', icon: '👹', entityType: EntityType.ORC },
    { type: PowerType.CREATURE, name: 'Sheep', icon: '🐑', entityType: EntityType.SHEEP },
    { type: PowerType.CREATURE, name: 'Wolf', icon: '🐺', entityType: EntityType.WOLF },
    { type: PowerType.CREATURE, name: 'Dragon', icon: '🐉', entityType: EntityType.DRAGON },
  ]

  readonly naturePowers: Power[] = [
    { type: PowerType.NATURE, name: 'Rain', icon: '🌧️' },
    { type: PowerType.NATURE, name: 'Lightning', icon: '⚡' },
    { type: PowerType.NATURE, name: 'Fire', icon: '🔥' },
    { type: PowerType.NATURE, name: 'Earthquake', icon: '🌋' },
    { type: PowerType.NATURE, name: 'Meteor', icon: '☄️' },
    { type: PowerType.NATURE, name: 'Tornado', icon: '🌪️' },
  ]

  readonly disasterPowers: Power[] = [
    { type: PowerType.DISASTER, name: 'Nuke', icon: '☢️' },
    { type: PowerType.DISASTER, name: 'Black Hole', icon: '🕳️' },
    { type: PowerType.DISASTER, name: 'Acid Rain', icon: '☠️' },
    { type: PowerType.DISASTER, name: 'Plague', icon: '🦠' },
  ]

  constructor(world: World) {
    this.world = world
  }

  setPower(power: Power): void {
    this.currentPower = power
  }

  getPower(): Power | null {
    return this.currentPower
  }

  setBrushSize(size: number): void {
    this.brushSize = size
  }

  apply(x: number, y: number): void {
    if (!this.currentPower) return

    const half = Math.floor(this.brushSize / 2)

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const tx = x + dx
        const ty = y + dy

        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

        if (this.currentPower.tileType !== undefined) {
          this.world.setTile(tx, ty, this.currentPower.tileType)
        }
      }
    }
  }

  applyContinuous(x: number, y: number): void {
    // For brush painting while dragging
    this.apply(x, y)
  }
}

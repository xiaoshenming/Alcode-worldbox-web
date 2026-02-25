import { Component, EntityId } from '../ecs/Entity'

// Building types
export enum BuildingType {
  HUT = 'hut',
  HOUSE = 'house',
  FARM = 'farm',
  BARRACKS = 'barracks',
  TOWER = 'tower',
  CASTLE = 'castle',
  MINE = 'mine',
  PORT = 'port'
}

export const BUILDING_COLORS: Record<BuildingType, string> = {
  [BuildingType.HUT]: '#8B7355',
  [BuildingType.HOUSE]: '#A0522D',
  [BuildingType.FARM]: '#DAA520',
  [BuildingType.BARRACKS]: '#696969',
  [BuildingType.TOWER]: '#808080',
  [BuildingType.CASTLE]: '#B8860B',
  [BuildingType.MINE]: '#4A4A4A',
  [BuildingType.PORT]: '#5F9EA0',
}

export const BUILDING_SIZES: Record<BuildingType, number> = {
  [BuildingType.HUT]: 1,
  [BuildingType.HOUSE]: 2,
  [BuildingType.FARM]: 3,
  [BuildingType.BARRACKS]: 2,
  [BuildingType.TOWER]: 1,
  [BuildingType.CASTLE]: 3,
  [BuildingType.MINE]: 2,
  [BuildingType.PORT]: 2,
}

export interface TradeRoute {
  partnerId: number      // 贸易伙伴文明 ID
  fromPort: { x: number; y: number }  // 己方港口位置
  toPort: { x: number; y: number }    // 对方港口位置
  active: boolean
  income: number         // 每 tick 收入
}

// Civilization data
export interface Civilization {
  id: number
  name: string
  color: string
  population: number
  territory: Set<string> // "x,y" keys
  buildings: EntityId[]
  resources: {
    food: number
    wood: number
    stone: number
    gold: number
  }
  techLevel: number // 1-5
  relations: Map<number, number> // civId -> relation (-100 to 100)
  tradeRoutes: TradeRoute[]
}

// Components
export interface BuildingComponent extends Component {
  type: 'building'
  buildingType: BuildingType
  civId: number
  health: number
  maxHealth: number
  level: number
}

export interface CivMemberComponent extends Component {
  type: 'civMember'
  civId: number
  role: 'worker' | 'soldier' | 'leader'
}

export interface TerritoryComponent extends Component {
  type: 'territory'
  civId: number
}

// Civ name pools
const CIV_NAMES = [
  'Avalon', 'Ironhold', 'Greenshire', 'Stormkeep', 'Sunhaven',
  'Darkwood', 'Frostpeak', 'Goldvale', 'Silvermere', 'Redstone',
  'Moonfall', 'Starforge', 'Thornwall', 'Windhelm', 'Deepwell',
  'Highgate', 'Ashford', 'Brightwater', 'Cloudrest', 'Dawnbreak'
]

const CIV_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff5722', '#607d8b', '#795548', '#cddc39', '#ff9800'
]

let nextCivId = 1

// Tech tree definitions
export interface TechInfo {
  name: string
  description: string
  unlocks: string[]
}

export const TECH_TREE: Record<number, TechInfo> = {
  1: { name: 'Stone Age', description: 'Basic survival', unlocks: ['Hut', 'Farm'] },
  2: { name: 'Bronze Age', description: 'Metalworking begins', unlocks: ['Barracks', 'Mine', 'Port'] },
  3: { name: 'Iron Age', description: 'Advanced warfare', unlocks: ['Tower', '+20% combat damage'] },
  4: { name: 'Medieval', description: 'Fortification era', unlocks: ['Castle', '+30% gather rate'] },
  5: { name: 'Renaissance', description: 'Golden age', unlocks: ['+50% all production', '+20% health'] },
}

export function createCivilization(): Civilization {
  const id = nextCivId++
  return {
    id,
    name: CIV_NAMES[Math.floor(Math.random() * CIV_NAMES.length)],
    color: CIV_COLORS[(id - 1) % CIV_COLORS.length],
    population: 0,
    territory: new Set(),
    buildings: [],
    resources: { food: 50, wood: 30, stone: 10, gold: 0 },
    techLevel: 1,
    relations: new Map(),
    tradeRoutes: []
  }
}

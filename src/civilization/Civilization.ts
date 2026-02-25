import { Component, EntityId } from '../ecs/Entity'

// Culture traits
export type CultureTrait = 'warrior' | 'merchant' | 'scholar' | 'nature' | 'builder'

// Religion types
export type ReligionType = 'sun' | 'moon' | 'earth' | 'storm' | 'ancestor'

export const RELIGION_NAMES: Record<ReligionType, string> = {
  sun: 'Solar Faith',
  moon: 'Lunar Order',
  earth: 'Earth Cult',
  storm: 'Storm Worship',
  ancestor: 'Ancestor Spirits'
}

export const RELIGION_ICONS: Record<ReligionType, string> = {
  sun: '☀️',
  moon: '🌙',
  earth: '🌍',
  storm: '⛈️',
  ancestor: '👻'
}

export const RELIGION_TYPES: ReligionType[] = ['sun', 'moon', 'earth', 'storm', 'ancestor']

export const CULTURE_TRAITS: CultureTrait[] = ['warrior', 'merchant', 'scholar', 'nature', 'builder']

export const CULTURE_ICONS: Record<CultureTrait, string> = {
  warrior: '⚔️',
  merchant: '💰',
  scholar: '📚',
  nature: '🌿',
  builder: '🏗️',
}

// Building types
export enum BuildingType {
  HUT = 'hut',
  HOUSE = 'house',
  FARM = 'farm',
  BARRACKS = 'barracks',
  TOWER = 'tower',
  CASTLE = 'castle',
  MINE = 'mine',
  PORT = 'port',
  TEMPLE = 'temple',
  WALL = 'wall',
  MARKET = 'market',
  ACADEMY = 'academy',
  GRANARY = 'granary',
  WORKSHOP = 'workshop'
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
  [BuildingType.TEMPLE]: '#DAA0F0',
  [BuildingType.WALL]: '#7a7a8a',
  [BuildingType.MARKET]: '#e6a040',
  [BuildingType.ACADEMY]: '#6080c0',
  [BuildingType.GRANARY]: '#c0a060',
  [BuildingType.WORKSHOP]: '#8a6a4a',
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
  [BuildingType.TEMPLE]: 2,
  [BuildingType.WALL]: 1,
  [BuildingType.MARKET]: 2,
  [BuildingType.ACADEMY]: 2,
  [BuildingType.GRANARY]: 2,
  [BuildingType.WORKSHOP]: 2,
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
  culture: {
    trait: CultureTrait
    strength: number // 0-100, grows over time
  }
  religion: {
    type: ReligionType
    faith: number      // 0-100, grows with temples
    temples: number    // count of temples
    blessing: string | null  // active blessing effect
    blessingTimer: number    // ticks remaining on blessing
  }
  happiness: number      // 0-100, affects productivity and revolt chance
  taxRate: number        // 0-3 (none/low/medium/high), generates gold but reduces happiness
  revoltTimer: number    // ticks until next revolt check
  research: {
    currentTech: string | null  // tech being researched
    progress: number            // 0-100 research progress
    completed: string[]         // list of completed tech names
    researchRate: number        // base research speed
  }
  treaties: number[]        // treaty IDs this civ is part of
  embassies: { civId: number; x: number; y: number }[]
  diplomaticStance: 'peaceful' | 'neutral' | 'aggressive' | 'isolationist'
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

// Individual technology definitions
export interface Technology {
  name: string
  level: number          // which tech level (1-5) this belongs to
  cost: number           // gold cost to research
  researchTime: number   // base ticks to complete (100 = ~1.7 seconds at 60fps)
  description: string
  effects: TechEffect[]
}

export interface TechEffect {
  type: 'food_bonus' | 'gather_speed' | 'unlock_building' | 'research_speed'
      | 'combat_bonus' | 'health_regen' | 'build_speed' | 'building_hp'
      | 'gold_income' | 'territory_expansion' | 'research_to_allies'
      | 'all_building_effects'
  value: number          // multiplier or flat bonus
  building?: BuildingType // for unlock_building
}

export const TECHNOLOGIES: Technology[] = [
  // Level 1 - Stone Age
  {
    name: 'Agriculture', level: 1, cost: 10, researchTime: 200,
    description: 'Unlocks farms and boosts food production',
    effects: [
      { type: 'unlock_building', value: 1, building: BuildingType.FARM },
      { type: 'food_bonus', value: 0.2 }
    ]
  },
  {
    name: 'Tool Making', level: 1, cost: 10, researchTime: 180,
    description: 'Faster resource gathering',
    effects: [{ type: 'gather_speed', value: 0.15 }]
  },
  // Level 2 - Bronze Age
  {
    name: 'Bronze Working', level: 2, cost: 25, researchTime: 350,
    description: 'Unlocks barracks and mines',
    effects: [
      { type: 'unlock_building', value: 1, building: BuildingType.BARRACKS },
      { type: 'unlock_building', value: 1, building: BuildingType.MINE }
    ]
  },
  {
    name: 'Sailing', level: 2, cost: 30, researchTime: 400,
    description: 'Unlocks ports for trade',
    effects: [{ type: 'unlock_building', value: 1, building: BuildingType.PORT }]
  },
  {
    name: 'Writing', level: 2, cost: 20, researchTime: 300,
    description: 'Increases research speed',
    effects: [{ type: 'research_speed', value: 0.25 }]
  },
  // Level 3 - Iron Age
  {
    name: 'Iron Forging', level: 3, cost: 50, researchTime: 500,
    description: 'Unlocks towers and boosts combat',
    effects: [
      { type: 'unlock_building', value: 1, building: BuildingType.TOWER },
      { type: 'combat_bonus', value: 0.2 }
    ]
  },
  {
    name: 'Mathematics', level: 3, cost: 40, researchTime: 450,
    description: 'Faster construction',
    effects: [{ type: 'build_speed', value: 0.25 }]
  },
  {
    name: 'Medicine', level: 3, cost: 45, researchTime: 450,
    description: 'Improved health regeneration',
    effects: [{ type: 'health_regen', value: 0.3 }]
  },
  // Level 4 - Medieval
  {
    name: 'Fortification', level: 4, cost: 80, researchTime: 600,
    description: 'Unlocks castles and tougher buildings',
    effects: [
      { type: 'unlock_building', value: 1, building: BuildingType.CASTLE },
      { type: 'building_hp', value: 0.3 }
    ]
  },
  {
    name: 'Banking', level: 4, cost: 70, researchTime: 550,
    description: 'Increased gold income',
    effects: [{ type: 'gold_income', value: 0.3 }]
  },
  {
    name: 'Engineering', level: 4, cost: 75, researchTime: 600,
    description: 'Faster territory expansion',
    effects: [{ type: 'territory_expansion', value: 0.3 }]
  },
  // Level 5 - Renaissance
  {
    name: 'Gunpowder', level: 5, cost: 120, researchTime: 800,
    description: '+50% combat effectiveness',
    effects: [{ type: 'combat_bonus', value: 0.5 }]
  },
  {
    name: 'Printing Press', level: 5, cost: 100, researchTime: 700,
    description: 'Share research progress with allies',
    effects: [{ type: 'research_to_allies', value: 0.2 }]
  },
  {
    name: 'Architecture', level: 5, cost: 110, researchTime: 750,
    description: 'All building effects enhanced',
    effects: [{ type: 'all_building_effects', value: 0.25 }]
  },
]

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
    tradeRoutes: [],
    culture: {
      trait: CULTURE_TRAITS[Math.floor(Math.random() * CULTURE_TRAITS.length)],
      strength: 10
    },
    religion: {
      type: RELIGION_TYPES[Math.floor(Math.random() * RELIGION_TYPES.length)],
      faith: 5,
      temples: 0,
      blessing: null,
      blessingTimer: 0
    },
    happiness: 70,
    taxRate: 1,
    revoltTimer: 0,
    research: {
      currentTech: null,
      progress: 0,
      completed: [],
      researchRate: 1.0
    },
    treaties: [],
    embassies: [],
    diplomaticStance: 'neutral'
  }
}

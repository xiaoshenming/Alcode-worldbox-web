export type AchievementCategory = 'creator' | 'destroyer' | 'civilization' | 'military' | 'nature' | 'secret';

export interface WorldStats {
  totalCreatures: number;
  speciesSet: Set<string> | string[];
  maxCityPop: number;
  filledTilePercent: number;
  hasIsland: boolean;
  totalKills: number;
  extinctSpecies: string[];
  scorchedTiles: number;
  disastersLast60Ticks: number;
  nukeUsed: boolean;
  civsMet: number;
  activeTradeRoutes: number;
  maxEra: string;
  peaceTicks: number;
  maxTerritoryPercent: number;
  totalCombats: number;
  shipCount: number;
  citiesCaptured: number;
  maxHeroLevel: number;
  maxArmySize: number;
  volcanoEruptions: number;
  waterTilesCreatedAtOnce: number;
  diseasedCivs: number;
  evolutionEvents: number;
  coexistSpecies: number;
  coexistTicks: number;
  totalTicks: number;
  exploredPercent: number;
  totalCivs: number;
  totalWars: number;
  clonedCreatures: number;
  portalPairs: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  condition: (stats: WorldStats) => boolean;
  unlocked: boolean;
  unlockTick: number | null;
}

export interface AchievementSaveData {
  unlocked: Record<string, number>;
}

const DEFS: Omit<Achievement, 'unlocked' | 'unlockTick'>[] = [
  // Creator
  { id: 'first_life', name: 'First Life', description: 'Spawn your first creature', category: 'creator', icon: '\u{1F331}', condition: s => s.totalCreatures >= 1 },
  { id: 'diverse_world', name: 'Diverse World', description: 'Have 4+ species alive', category: 'creator', icon: '\u{1F30D}', condition: s => (Array.isArray(s.speciesSet) ? s.speciesSet.length : s.speciesSet.size) >= 4 },
  { id: 'mega_city', name: 'Mega City', description: 'A city reaches 50+ population', category: 'creator', icon: '\u{1F3D9}\uFE0F', condition: s => s.maxCityPop >= 50 },
  { id: 'world_builder', name: 'World Builder', description: 'Fill 80% of the map with land', category: 'creator', icon: '\u{1F3D7}\uFE0F', condition: s => s.filledTilePercent >= 80 },
  { id: 'island_maker', name: 'Island Maker', description: 'Create an island surrounded by water', category: 'creator', icon: '\u{1F3DD}\uFE0F', condition: s => s.hasIsland },
  // Destroyer
  { id: 'apocalypse', name: 'Apocalypse', description: 'Kill 1000 creatures', category: 'destroyer', icon: '\u{1F480}', condition: s => s.totalKills >= 1000 },
  { id: 'extinction_event', name: 'Extinction Event', description: 'Wipe out an entire species', category: 'destroyer', icon: '\u{2620}\uFE0F', condition: s => s.extinctSpecies.length >= 1 },
  { id: 'scorched_earth', name: 'Scorched Earth', description: 'Convert 500 tiles to sand or lava', category: 'destroyer', icon: '\u{1F525}', condition: s => s.scorchedTiles >= 500 },
  { id: 'chain_reaction', name: 'Chain Reaction', description: 'Trigger 3 disasters within 60 ticks', category: 'destroyer', icon: '\u{26A1}', condition: s => s.disastersLast60Ticks >= 3 },
  { id: 'nuclear_option', name: 'Nuclear Option', description: 'Use the nuke power', category: 'destroyer', icon: '\u{2622}\uFE0F', condition: s => s.nukeUsed },
  // Civilization
  { id: 'first_contact', name: 'First Contact', description: 'Two civilizations meet', category: 'civilization', icon: '\u{1F91D}', condition: s => s.civsMet >= 2 },
  { id: 'trade_empire', name: 'Trade Empire', description: 'Have 5+ active trade routes', category: 'civilization', icon: '\u{1F4B0}', condition: s => s.activeTradeRoutes >= 5 },
  { id: 'golden_age', name: 'Golden Age', description: 'A civilization reaches the Renaissance', category: 'civilization', icon: '\u{1F451}', condition: s => s.maxEra === 'renaissance' || s.maxEra === 'industrial' || s.maxEra === 'modern' },
  { id: 'world_peace', name: 'World Peace', description: 'All civs at peace for 1000 ticks', category: 'civilization', icon: '\u{1F54A}\uFE0F', condition: s => s.peaceTicks >= 1000 },
  { id: 'hegemon', name: 'Hegemon', description: 'One civ controls 60% of territory', category: 'civilization', icon: '\u{1F3F0}', condition: s => s.maxTerritoryPercent >= 60 },
  // Military
  { id: 'first_blood', name: 'First Blood', description: 'Witness the first combat', category: 'military', icon: '\u{2694}\uFE0F', condition: s => s.totalCombats >= 1 },
  { id: 'naval_power', name: 'Naval Power', description: 'Build 5 ships', category: 'military', icon: '\u{26F5}', condition: s => s.shipCount >= 5 },
  { id: 'siege_master', name: 'Siege Master', description: 'Capture 3 cities', category: 'military', icon: '\u{1F3F4}', condition: s => s.citiesCaptured >= 3 },
  { id: 'legendary_hero', name: 'Legendary Hero', description: 'A hero reaches level 10', category: 'military', icon: '\u{1F9B8}', condition: s => s.maxHeroLevel >= 10 },
  { id: 'grand_army', name: 'Grand Army', description: 'Amass an army of 50+ units', category: 'military', icon: '\u{1F6E1}\uFE0F', condition: s => s.maxArmySize >= 50 },
  // Nature
  { id: 'volcano_eruption', name: 'Volcano Eruption', description: 'Witness a volcanic eruption', category: 'nature', icon: '\u{1F30B}', condition: s => s.volcanoEruptions >= 1 },
  { id: 'great_flood', name: 'Great Flood', description: '50+ water tiles created at once', category: 'nature', icon: '\u{1F30A}', condition: s => s.waterTilesCreatedAtOnce >= 50 },
  { id: 'pandemic', name: 'Pandemic', description: 'Disease spreads to 3+ civilizations', category: 'nature', icon: '\u{1F9A0}', condition: s => s.diseasedCivs >= 3 },
  { id: 'evolution', name: 'Evolution', description: 'A creature evolves a new trait', category: 'nature', icon: '\u{1F9EC}', condition: s => s.evolutionEvents >= 1 },
  { id: 'ecosystem_balance', name: 'Ecosystem Balance', description: '5+ species coexist for 2000 ticks', category: 'nature', icon: '\u{1F333}', condition: s => s.coexistSpecies >= 5 && s.coexistTicks >= 2000 },
  // Secret
  { id: 'time_lord', name: 'Time Lord', description: 'Play for 100,000 ticks', category: 'secret', icon: '\u{231B}', condition: s => s.totalTicks >= 100000 },
  { id: 'cartographer', name: 'Cartographer', description: 'Explore the entire map', category: 'secret', icon: '\u{1F5FA}\uFE0F', condition: s => s.exploredPercent >= 100 },
  { id: 'pacifist_god', name: 'Pacifist God', description: 'Reach 5 civs without any wars', category: 'secret', icon: '\u{262E}\uFE0F', condition: s => s.totalCivs >= 5 && s.totalWars === 0 },
  { id: 'clone_army', name: 'Clone Army', description: 'Clone 20 creatures', category: 'secret', icon: '\u{1F9EA}', condition: s => s.clonedCreatures >= 20 },
  { id: 'portal_master', name: 'Portal Master', description: 'Create 5 portal pairs', category: 'secret', icon: '\u{1F300}', condition: s => s.portalPairs >= 5 },
];

export class AchievementContentSystem {
  private achievements: Achievement[];
  private _unlockedBuf: Achievement[] = [];
  private _categoryBuf: Achievement[] = [];

  constructor() {
    this.achievements = DEFS.map(d => ({ ...d, unlocked: false, unlockTick: null }));
  }

  check(stats: WorldStats): string[] {
    const newly: string[] = [];
    for (const a of this.achievements) {
      if (!a.unlocked && a.condition(stats)) {
        a.unlocked = true;
        a.unlockTick = stats.totalTicks;
        newly.push(a.id);
      }
    }
    return newly;
  }

  getAll(): Achievement[] {
    return this.achievements;
  }

  getUnlocked(): Achievement[] {
    this._unlockedBuf.length = 0
    for (const a of this.achievements) { if (a.unlocked) this._unlockedBuf.push(a) }
    return this._unlockedBuf
  }

  getByCategory(cat: AchievementCategory): Achievement[] {
    this._categoryBuf.length = 0
    for (const a of this.achievements) { if (a.category === cat) this._categoryBuf.push(a) }
    return this._categoryBuf
  }

  getById(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id);
  }

  getProgress(id: string): { unlocked: boolean; unlockTick: number | null } {
    const a = this.getById(id);
    return a ? { unlocked: a.unlocked, unlockTick: a.unlockTick } : { unlocked: false, unlockTick: null };
  }

  save(): AchievementSaveData {
    const unlocked: Record<string, number> = {};
    for (const a of this.achievements) {
      if (a.unlocked && a.unlockTick !== null) unlocked[a.id] = a.unlockTick;
    }
    return { unlocked };
  }

  load(data: AchievementSaveData): void {
    for (const a of this.achievements) {
      if (data.unlocked[a.id] !== undefined) {
        a.unlocked = true;
        a.unlockTick = data.unlocked[a.id];
      } else {
        a.unlocked = false;
        a.unlockTick = null;
      }
    }
  }

  reset(): void {
    for (const a of this.achievements) {
      a.unlocked = false;
      a.unlockTick = null;
    }
  }
}

// Fog of War & Exploration System
// Each civilization maintains its own fog map tracking unexplored, explored, and visible tiles

import { EntityManager, PositionComponent } from '../ecs/Entity';
import { CivManager } from '../civilization/CivManager';
import { CivMemberComponent } from '../civilization/Civilization';
import { ParticleSystem } from '../systems/ParticleSystem';
import { EventLog } from '../systems/EventLog';
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants';
import { World } from '../game/World';

export type FogState = 0 | 1 | 2; // 0=unexplored, 1=explored(dim), 2=visible(clear)

export interface CivFogData {
  civId: number;
  fogMap: Uint8Array; // flat array, WORLD_WIDTH * WORLD_HEIGHT, stores FogState
  exploredCount: number;
  discoveryEvents: DiscoveryEvent[];
}

export interface DiscoveryEvent {
  x: number;
  y: number;
  type: 'ruins' | 'treasure' | 'ancient_monument' | 'resource_deposit' | 'lost_tribe';
  description: string;
  tick: number;
  claimed: boolean;
  reward: { gold?: number; food?: number; xp?: number; techBoost?: number };
}

const TOTAL_TILES = WORLD_WIDTH * WORLD_HEIGHT;

// Vision radii by role
const VISION_SOLDIER = 8;
const VISION_WORKER = 4;
const VISION_LEADER = 6;

const DISCOVERY_COLORS: Record<DiscoveryEvent['type'], string> = {
  ruins: '#ffd700',
  treasure: '#ffaa00',
  ancient_monument: '#00e5ff',
  resource_deposit: '#8bc34a',
  lost_tribe: '#ff9800',
};

// Discovery descriptions
const DISCOVERY_DESC: Record<DiscoveryEvent['type'], string[]> = {
  ruins: ['Ancient ruins with hidden treasures', 'Crumbling temple of a forgotten god', 'Abandoned fortress with gold reserves'],
  treasure: ['A buried chest of gold coins', 'Gleaming jewels hidden under a rock', 'A merchant\'s lost stash'],
  ancient_monument: ['A towering obelisk inscribed with knowledge', 'Mysterious stone circle radiating power', 'Carved monolith of an elder race'],
  resource_deposit: ['Rich vein of ore and timber', 'Fertile clearing with wild crops', 'Hidden grove full of resources'],
  lost_tribe: ['A small tribe eager to join civilization', 'Wandering refugees seeking a home', 'Hermits willing to pledge allegiance'],
};

export class FogOfWarSystem {
  private civFogMap: Map<number, CivFogData> = new Map();
  // Track which civs have already been "discovered" by each civ to avoid repeat diplomacy events
  private discoveredCivs: Map<number, Set<number>> = new Map();
  // Reusable flat buffers for member positions (zero object alloc per member)
  private _mpCivId: number[] = []
  private _mpX: number[] = []
  private _mpY: number[] = []
  private _mpR: number[] = []

  getCivFog(civId: number): CivFogData | undefined {
    return this.civFogMap.get(civId);
  }

  getExplorationPercent(civId: number): number {
    const data = this.civFogMap.get(civId);
    if (!data) return 0;
    return (data.exploredCount / TOTAL_TILES) * 100;
  }

  getDiscoveries(civId: number): DiscoveryEvent[] {
    const data = this.civFogMap.get(civId);
    return data ? data.discoveryEvents : [];
  }

  getFogAlpha(civId: number, x: number, y: number): number {
    const data = this.civFogMap.get(civId);
    if (!data) return 0.8;
    const state = data.fogMap[y * WORLD_WIDTH + x];
    if (state === 2) return 0.0;  // visible — clear
    if (state === 1) return 0.4;  // explored — dim
    return 0.8;                   // unexplored — dark
  }

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    // Only update every 10 ticks for performance
    if (tick % 10 !== 0) return;

    // Ensure every living civ has a fog data entry
    for (const [civId] of civManager.civilizations) {
      if (!this.civFogMap.has(civId)) {
        this.civFogMap.set(civId, {
          civId,
          fogMap: new Uint8Array(TOTAL_TILES), // all 0 = unexplored
          exploredCount: 0,
          discoveryEvents: [],
        });
      }
      if (!this.discoveredCivs.has(civId)) {
        this.discoveredCivs.set(civId, new Set());
      }
    }

    // Collect civ member positions into flat buffers (zero object alloc per member)
    const mpCivId = this._mpCivId; mpCivId.length = 0
    const mpX = this._mpX; mpX.length = 0
    const mpY = this._mpY; mpY.length = 0
    const mpR = this._mpR; mpR.length = 0
    const civMemberIds = em.getEntitiesWithComponent('civMember');
    for (const id of civMemberIds) {
      const member = em.getComponent<CivMemberComponent>(id, 'civMember');
      const pos = em.getComponent<PositionComponent>(id, 'position');
      if (!member || !pos) continue;

      const radius = member.role === 'soldier' ? VISION_SOLDIER
        : member.role === 'leader' ? VISION_LEADER
        : VISION_WORKER;

      mpCivId.push(member.civId)
      mpX.push(Math.floor(pos.x))
      mpY.push(Math.floor(pos.y))
      mpR.push(radius)
    }

    // Process each civ
    for (const [civId, fogData] of this.civFogMap) {
      const civ = civManager.civilizations.get(civId);
      if (!civ) continue;

      // Phase 1: Decay all currently visible tiles to explored
      // We do this before re-applying vision so tiles that leave vision become dim
      for (let i = 0; i < TOTAL_TILES; i++) {
        if (fogData.fogMap[i] === 2) {
          fogData.fogMap[i] = 1;
        }
      }

      // Phase 2: Territory tiles are always visible
      for (const key of civ.territory) {
        const comma = key.indexOf(',')
        const tx = +key.substring(0, comma)
        const ty = +key.substring(comma + 1)
        const idx = ty * WORLD_WIDTH + tx;
        if (fogData.fogMap[idx] === 0) {
          fogData.exploredCount++;
        }
        fogData.fogMap[idx] = 2;
      }

      // Phase 3: Civ members reveal fog in a radius
      for (let mi = 0; mi < mpCivId.length; mi++) {
        if (mpCivId[mi] !== civId) continue
        this.revealRadius(fogData, world, civManager, particles, tick, civId, mpX[mi], mpY[mi], mpR[mi]);
      }

      // Phase 4: Check for discovery of other civs' territory
      this.checkCivDiscovery(fogData, civManager, civId, tick);
    }
  }

  private revealRadius(
    fogData: CivFogData, world: World, civManager: CivManager,
    particles: ParticleSystem, tick: number,
    civId: number, cx: number, cy: number, radius: number
  ): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) continue;

        const idx = y * WORLD_WIDTH + x;
        const wasUnexplored = fogData.fogMap[idx] === 0;

        if (wasUnexplored) {
          fogData.exploredCount++;
          // Roll for discovery event on newly explored tiles
          this.rollDiscovery(fogData, world, particles, tick, civId, x, y);
        }

        fogData.fogMap[idx] = 2; // visible
      }
    }
  }

  private rollDiscovery(
    fogData: CivFogData, world: World, particles: ParticleSystem,
    tick: number, civId: number, x: number, y: number
  ): void {
    const tile = world.getTile(x, y);
    if (tile === null) return;

    let type: DiscoveryEvent['type'] | null = null;
    const roll = Math.random();

    if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
      if (roll < 0.01) {
        type = 'ancient_monument'; // 1% on mountain only
        if (tile !== TileType.MOUNTAIN) type = null;
      } else if (roll < 0.04) {
        type = 'resource_deposit'; // 3% on mountain/forest
      } else if (roll < 0.09) {
        type = 'ruins'; // 5% on mountain/forest
      }
    }

    if (!type && (tile === TileType.GRASS || tile === TileType.FOREST)) {
      if (roll < 0.01) {
        type = 'lost_tribe'; // 1% on grass/forest
      }
    }

    if (!type && roll < 0.02) {
      type = 'treasure'; // 2% on any tile
    }

    if (!type) return;

    // Ancient monument only on mountain
    if (type === 'ancient_monument' && tile !== TileType.MOUNTAIN) return;

    const reward = this.generateReward(type);
    const descs = DISCOVERY_DESC[type];
    const description = descs[Math.floor(Math.random() * descs.length)];

    const event: DiscoveryEvent = { x, y, type, description, tick, claimed: false, reward };
    fogData.discoveryEvents.push(event);

    // Auto-claim the reward
    this.claimDiscovery(event, civId);

    // Spawn particles at discovery location
    particles.spawn(x, y, 8, DISCOVERY_COLORS[type], 1.5);

    EventLog.log('artifact', `${type.replace('_', ' ')} discovered at (${x},${y}): ${description}`, tick);
  }

  private generateReward(type: DiscoveryEvent['type']): DiscoveryEvent['reward'] {
    switch (type) {
      case 'ruins':
        return { gold: 10 + Math.floor(Math.random() * 15), xp: 5 + Math.floor(Math.random() * 10) };
      case 'treasure':
        return { gold: 15 + Math.floor(Math.random() * 25) };
      case 'ancient_monument':
        return { techBoost: 5 + Math.floor(Math.random() * 10) };
      case 'resource_deposit':
        return { food: 10 + Math.floor(Math.random() * 15), gold: 5 };
      case 'lost_tribe':
        return { food: 5 };
      default:
        return {};
    }
  }

  private claimDiscovery(event: DiscoveryEvent, civId: number): void {
    if (event.claimed) return;
    event.claimed = true;

    // We don't have direct access to CivManager here, but the caller (update) does.
    // Instead, store civId on the event and apply rewards in the update loop.
    // For simplicity, we apply via a deferred approach — store in a queue.
    // Actually, let's just apply inline since we have civId context.
    this._pendingRewards.push({ civId, reward: event.reward });
  }

  // Pending rewards to apply (processed in update after reveal pass)
  private _pendingRewards: { civId: number; reward: DiscoveryEvent['reward'] }[] = [];

  /** Call after update to apply discovery rewards to civilizations */
  applyPendingRewards(civManager: CivManager): void {
    for (const { civId, reward } of this._pendingRewards) {
      const civ = civManager.civilizations.get(civId);
      if (!civ) continue;
      if (reward.gold) civ.resources.gold += reward.gold;
      if (reward.food) civ.resources.food += reward.food;
      if (reward.techBoost && civ.research.currentTech) {
        civ.research.progress = Math.min(100, civ.research.progress + reward.techBoost);
      }
      // lost_tribe adds population — handled by spawning logic externally
      // For now, just bump population count directly for simplicity
      if (reward.food && !reward.gold && !reward.techBoost && !reward.xp) {
        // This heuristic identifies lost_tribe (only food, no other rewards)
        civ.population += 1;
        EventLog.log('birth', `A lost tribe joined ${civ.name}! (+1 population)`, 0);
      }
    }
    this._pendingRewards.length = 0;
  }

  private checkCivDiscovery(fogData: CivFogData, civManager: CivManager, civId: number, tick: number): void {
    const discovered = this.discoveredCivs.get(civId);
    if (!discovered) return;

    for (const [otherId, otherCiv] of civManager.civilizations) {
      if (otherId === civId || discovered.has(otherId)) continue;

      // Check if any of the other civ's territory is now visible (state 2)
      let found = false;
      for (const key of otherCiv.territory) {
        const comma = key.indexOf(',')
        const tx = +key.substring(0, comma)
        const ty = +key.substring(comma + 1)
        if (fogData.fogMap[ty * WORLD_WIDTH + tx] === 2) {
          found = true;
          break;
        }
      }

      if (found) {
        discovered.add(otherId);
        const myCiv = civManager.civilizations.get(civId);
        const civName = myCiv ? myCiv.name : `Civ ${civId}`;
        EventLog.log('diplomacy', `${civName} discovered ${otherCiv.name}'s territory!`, tick);

        // Initialize relations if not set
        if (myCiv && !myCiv.relations.has(otherId)) {
          myCiv.relations.set(otherId, 0);
        }
        if (!otherCiv.relations.has(civId)) {
          otherCiv.relations.set(civId, 0);
        }
      }
    }
  }

  /** Remove fog data for a destroyed civilization */
  removeCiv(civId: number): void {
    this.civFogMap.delete(civId);
    this.discoveredCivs.delete(civId);
    // Clean up references in other civs' discovered sets
    for (const [, set] of this.discoveredCivs) {
      set.delete(civId);
    }
  }
}

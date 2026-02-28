// Biome Wildlife & Ecosystem System
// Manages wildlife spawning, food chains, population balance, and ecosystem health

import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent, AIComponent, RenderComponent } from '../ecs/Entity';
import { CivManager } from '../civilization/CivManager';
import { ParticleSystem } from '../systems/ParticleSystem';
import { EventLog } from '../systems/EventLog';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants';
import { World } from '../game/World';
import { generateName } from '../utils/NameGenerator';
import {
  WildlifeType,
  WildlifeSpawnRule,
  WILDLIFE_RULES,
  MAX_WILDLIFE,
  SPAWN_INTERVAL,
  HUNT_RANGE,
  FLEE_RANGE,
  AREA_CHECK_SIZE,
  MAX_AGE_WILDLIFE,
} from './EcosystemData'

export type { WildlifeType, WildlifeSpawnRule }

export class EcosystemSystem {
  private wildlifeCounts: Map<string, number> = new Map();
  private ecosystemHealth: number = 50;
  private ruleMap: Map<string, WildlifeSpawnRule> = new Map();

  constructor() {
    for (const rule of WILDLIFE_RULES) {
      this.ruleMap.set(rule.species, rule);
    }
  }

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    // Refresh wildlife counts
    this.refreshCounts(em);

    // Spawning phase (every SPAWN_INTERVAL ticks)
    if (tick % SPAWN_INTERVAL === 0) {
      this.spawnWildlife(em, world, tick);
    }

    // Behavior phase (every 3 ticks for performance)
    if (tick % 3 === 0) {
      this.updateBehaviors(em, world, tick);
    }

    // Population balance (every 200 ticks)
    if (tick % 200 === 0) {
      this.balancePopulation(em, world, tick);
      this.calculateHealth();
    }
  }

  getEcosystemHealth(): number {
    return this.ecosystemHealth;
  }

  getWildlifeCounts(): Map<string, number> {
    return this.wildlifeCounts;
  }

  private refreshCounts(em: EntityManager): void {
    this.wildlifeCounts.clear();
    const entities = em.getEntitiesWithComponents('creature', 'position');
    for (const id of entities) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature');
      if (!creature) continue;
      if (this.isWildlife(creature.species)) {
        const count = this.wildlifeCounts.get(creature.species) || 0;
        this.wildlifeCounts.set(creature.species, count + 1);
      }
    }
  }

  private isWildlife(species: string): boolean {
    return this.ruleMap.has(species);
  }

  private getTotalWildlife(): number {
    let total = 0;
    for (const count of this.wildlifeCounts.values()) {
      total += count;
    }
    return total;
  }

  private spawnWildlife(em: EntityManager, world: World, tick: number): void {
    if (this.getTotalWildlife() >= MAX_WILDLIFE) return;

    this.rebuildCreatureCache(em, tick);
    const season = world.getSeason();
    let seasonMultiplier = 1.0;
    if (season === 'spring') seasonMultiplier = 1.8;
    else if (season === 'summer') seasonMultiplier = 1.2;
    else if (season === 'autumn') seasonMultiplier = 0.7;
    else if (season === 'winter') seasonMultiplier = 0.3;

    // Check a batch of random tiles
    const checks = 30;
    for (let i = 0; i < checks; i++) {
      if (this.getTotalWildlife() >= MAX_WILDLIFE) break;

      const tx = Math.floor(Math.random() * WORLD_WIDTH);
      const ty = Math.floor(Math.random() * WORLD_HEIGHT);
      const tile = world.getTile(tx, ty);
      if (tile === null) continue;

      // Find eligible rules for this tile
      for (const rule of WILDLIFE_RULES) {
        if (!rule.biome.includes(tile)) continue;
        if (Math.random() > rule.spawnChance * seasonMultiplier * SPAWN_INTERVAL) continue;

        // Check local density
        const localCount = this.countSpeciesInArea(em, rule.species, tx, ty);
        if (localCount >= rule.maxPerBiome) continue;

        this.spawnWildlifeEntity(em, rule, tx, ty, tick);
        break; // one spawn per tile check
      }
    }
  }

  // Flat parallel arrays instead of object array to avoid per-creature object allocation
  private _cacheSpecies: string[] = [];
  private _cacheX: number[] = [];
  private _cacheY: number[] = [];
  private _cacheLen = 0;
  private _creatureCacheTick = -1;

  private rebuildCreatureCache(em: EntityManager, tick: number): void {
    if (this._creatureCacheTick === tick) return;
    this._creatureCacheTick = tick;
    this._cacheLen = 0;
    const entities = em.getEntitiesWithComponents('creature', 'position');
    for (const id of entities) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature');
      if (!creature) continue;
      const pos = em.getComponent<PositionComponent>(id, 'position');
      if (!pos) continue;
      const i = this._cacheLen++;
      this._cacheSpecies[i] = creature.species;
      this._cacheX[i] = pos.x;
      this._cacheY[i] = pos.y;
    }
  }

  private countSpeciesInArea(em: EntityManager, species: string, cx: number, cy: number): number {
    const half = AREA_CHECK_SIZE / 2;
    let count = 0;
    const len = this._cacheLen;
    const cacheSpecies = this._cacheSpecies;
    const cacheX = this._cacheX;
    const cacheY = this._cacheY;
    for (let i = 0; i < len; i++) {
      if (cacheSpecies[i] !== species) continue;
      if (Math.abs(cacheX[i] - cx) <= half && Math.abs(cacheY[i] - cy) <= half) {
        count++;
      }
    }
    return count;
  }

  private spawnWildlifeEntity(em: EntityManager, rule: WildlifeSpawnRule, x: number, y: number, tick: number): void {
    const id = em.createEntity();

    em.addComponent(id, {
      type: 'position',
      x, y
    } as PositionComponent);

    em.addComponent(id, {
      type: 'velocity',
      vx: 0, vy: 0
    });

    em.addComponent(id, {
      type: 'render',
      color: rule.color,
      size: rule.size
    } as RenderComponent);

    const ageRange = MAX_AGE_WILDLIFE[rule.species];
    const maxAge = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0]);

    em.addComponent(id, {
      type: 'creature',
      species: rule.species,
      speed: rule.speed,
      damage: rule.damage,
      isHostile: rule.predator,
      name: generateName(rule.species),
      age: 0,
      maxAge,
      gender: Math.random() < 0.5 ? 'male' : 'female'
    } as CreatureComponent);

    em.addComponent(id, {
      type: 'needs',
      hunger: Math.random() * 20,
      health: 100
    } as NeedsComponent);

    em.addComponent(id, {
      type: 'ai',
      state: 'wandering',
      targetX: x,
      targetY: y,
      targetEntity: null,
      cooldown: 0
    } as AIComponent);

    EventLog.log('birth', `A wild ${rule.species} appeared`, tick);
  }

  private updateBehaviors(em: EntityManager, world: World, tick: number): void {
    const entities = em.getEntitiesWithComponents('creature', 'position', 'ai', 'needs');
    // Pre-fetch all creature+position entities once to avoid O(N²) calls inside the loop
    const allCreaturePos = em.getEntitiesWithComponents('creature', 'position');

    for (const id of entities) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature');
      if (!creature || !this.isWildlife(creature.species)) continue;

      const pos = em.getComponent<PositionComponent>(id, 'position');
      const ai = em.getComponent<AIComponent>(id, 'ai');
      const needs = em.getComponent<NeedsComponent>(id, 'needs');
      if (!pos || !ai || !needs) continue;
      const rule = this.ruleMap.get(creature.species);
      if (!rule) continue;

      // Check for threats first (flee behavior)
      if (rule.fleeFrom.length > 0) {
        const threat = this.findNearestThreat(em, id, pos, rule.fleeFrom, allCreaturePos);
        if (threat) {
          this.flee(pos, ai, threat);
          continue;
        }
      }

      // Predator hunting behavior
      if (rule.predator && rule.prey.length > 0 && needs.hunger > 40) {
        const preyTarget = this.findNearestPrey(em, id, pos, rule.prey, allCreaturePos);
        if (preyTarget) {
          const preyPos = em.getComponent<PositionComponent>(preyTarget, 'position');
          if (preyPos) {
            const pdx = preyPos.x - pos.x, pdy = preyPos.y - pos.y
            if (pdx * pdx + pdy * pdy < 2.25) {
              // Attack prey
              this.attackPrey(em, id, preyTarget, creature, tick);
            } else {
              // Chase prey
              ai.state = 'attacking';
              ai.targetX = preyPos.x;
              ai.targetY = preyPos.y;
              ai.targetEntity = preyTarget;
            }
            continue;
          }
        }
      }

      // Wander if idle or cooldown expired
      if (ai.state === 'idle' || ai.cooldown <= 0) {
        this.wander(pos, ai, world);
      }

      if (ai.cooldown > 0) ai.cooldown--;
    }
  }

  private findNearestThreat(em: EntityManager, selfId: EntityId, selfPos: PositionComponent, fleeFrom: string[], allEntities: EntityId[]): PositionComponent | null {
    let nearest: PositionComponent | null = null;
    let nearestDistSq = FLEE_RANGE * FLEE_RANGE;

    for (const id of allEntities) {
      if (id === selfId) continue;
      const creature = em.getComponent<CreatureComponent>(id, 'creature');
      if (!creature || !fleeFrom.includes(creature.species)) continue;
      const pos = em.getComponent<PositionComponent>(id, 'position');
      if (!pos) continue;
      const dx = pos.x - selfPos.x, dy = pos.y - selfPos.y
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = pos;
      }
    }
    return nearest;
  }

  private findNearestPrey(em: EntityManager, selfId: EntityId, selfPos: PositionComponent, preySpecies: string[], allEntities: EntityId[]): EntityId | null {
    let nearest: EntityId | null = null;
    let nearestDistSq = HUNT_RANGE * HUNT_RANGE;

    for (const id of allEntities) {
      if (id === selfId) continue;
      const creature = em.getComponent<CreatureComponent>(id, 'creature');
      if (!creature || !preySpecies.includes(creature.species)) continue;
      const pos = em.getComponent<PositionComponent>(id, 'position');
      if (!pos) continue;
      const dx = pos.x - selfPos.x, dy = pos.y - selfPos.y
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = id;
      }
    }
    return nearest;
  }

  private flee(selfPos: PositionComponent, ai: AIComponent, threatPos: PositionComponent): void {
    const dx = selfPos.x - threatPos.x;
    const dy = selfPos.y - threatPos.y;
    const len = Math.hypot(dx, dy) || 1;
    ai.state = 'fleeing';
    ai.targetX = Math.max(0, Math.min(WORLD_WIDTH - 1, selfPos.x + (dx / len) * 10));
    ai.targetY = Math.max(0, Math.min(WORLD_HEIGHT - 1, selfPos.y + (dy / len) * 10));
    ai.targetEntity = null;
  }

  private attackPrey(em: EntityManager, attackerId: EntityId, preyId: EntityId, attacker: CreatureComponent, tick: number): void {
    const preyNeeds = em.getComponent<NeedsComponent>(preyId, 'needs');
    const preyCreature = em.getComponent<CreatureComponent>(preyId, 'creature');
    if (!preyNeeds || !preyCreature) return;

    preyNeeds.health -= attacker.damage;

    if (preyNeeds.health <= 0) {
      // Prey killed — feed the predator
      const attackerNeeds = em.getComponent<NeedsComponent>(attackerId, 'needs');
      if (attackerNeeds) {
        attackerNeeds.hunger = Math.max(0, attackerNeeds.hunger - 40);
      }

      const preyPos = em.getComponent<PositionComponent>(preyId, 'position');
      if (preyPos) {
        // Blood particles
        for (let i = 0; i < 3; i++) {
          // Particles are handled by the main particle system via addParticle
        }
      }

      EventLog.log('death', `${attacker.name} the ${attacker.species} hunted a ${preyCreature.species}`, tick);
      em.removeEntity(preyId);

      // Reset attacker AI
      const ai = em.getComponent<AIComponent>(attackerId, 'ai');
      if (ai) {
        ai.state = 'idle';
        ai.targetEntity = null;
        ai.cooldown = 20;
      }
    }
  }

  private wander(selfPos: PositionComponent, ai: AIComponent, world: World): void {
    ai.state = 'wandering';
    const range = 15;
    ai.targetX = Math.max(0, Math.min(WORLD_WIDTH - 1, selfPos.x + (Math.random() - 0.5) * range * 2));
    ai.targetY = Math.max(0, Math.min(WORLD_HEIGHT - 1, selfPos.y + (Math.random() - 0.5) * range * 2));
    ai.targetEntity = null;
    ai.cooldown = 30 + Math.floor(Math.random() * 40);
  }

  private balancePopulation(em: EntityManager, world: World, tick: number): void {
    const season = world.getSeason();

    const entities = em.getEntitiesWithComponents('creature', 'needs');
    for (const id of entities) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature');
      if (!creature || !this.isWildlife(creature.species)) continue;

      const needs = em.getComponent<NeedsComponent>(id, 'needs');
      if (!needs) continue;
      const rule = this.ruleMap.get(creature.species);
      if (!rule) continue;

      // Winter starvation pressure
      if (season === 'winter') {
        needs.hunger += 5;
      }

      // Predators starve faster when prey is scarce
      if (rule.predator) {
        let totalPrey = 0;
        for (const preySpecies of rule.prey) {
          totalPrey += this.wildlifeCounts.get(preySpecies) || 0;
        }
        if (totalPrey === 0) {
          needs.hunger += 8;
        } else if (totalPrey < 3) {
          needs.hunger += 3;
        }
      }

      // Starvation death
      if (needs.hunger >= 100) {
        EventLog.log('death', `${creature.name} the ${creature.species} starved`, tick);
        em.removeEntity(id);
      }
    }
  }

  private calculateHealth(): void {
    const total = this.getTotalWildlife();
    if (total === 0) {
      this.ecosystemHealth = 0;
      return;
    }

    // Biodiversity: how many different species exist
    const speciesPresent = this.wildlifeCounts.size;
    const totalSpecies = WILDLIFE_RULES.length;
    const diversityScore = (speciesPresent / totalSpecies) * 50;

    // Balance: penalize if any single species dominates
    let maxRatio = 0;
    for (const count of this.wildlifeCounts.values()) {
      const ratio = total > 0 ? count / total : 0;
      if (ratio > maxRatio) maxRatio = ratio;
    }
    const balanceScore = (1 - maxRatio) * 30;

    // Population health: not too few, not too many
    const popRatio = Math.min(total / (MAX_WILDLIFE * 0.5), 1);
    const popScore = popRatio * 20;

    this.ecosystemHealth = Math.round(Math.min(100, diversityScore + balanceScore + popScore));
  }
}

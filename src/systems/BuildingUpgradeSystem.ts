import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity';
import { CivManager } from '../civilization/CivManager';
import { BuildingComponent, BuildingType, Civilization } from '../civilization/Civilization';
import { EventLog } from '../systems/EventLog';

export interface UpgradePath {
  from: BuildingType;
  to: BuildingType;
  cost: { wood: number; stone: number; gold: number };
  techLevel: number;
}

const UPGRADE_PATHS: UpgradePath[] = [
  { from: BuildingType.HUT, to: BuildingType.HOUSE, cost: { wood: 15, stone: 5, gold: 0 }, techLevel: 1 },
  { from: BuildingType.HOUSE, to: BuildingType.CASTLE, cost: { wood: 40, stone: 60, gold: 20 }, techLevel: 4 },
  { from: BuildingType.FARM, to: BuildingType.GRANARY, cost: { wood: 20, stone: 10, gold: 5 }, techLevel: 2 },
  { from: BuildingType.BARRACKS, to: BuildingType.WORKSHOP, cost: { wood: 25, stone: 30, gold: 10 }, techLevel: 3 },
  { from: BuildingType.TOWER, to: BuildingType.WALL, cost: { wood: 5, stone: 20, gold: 0 }, techLevel: 2 },
];

// Cost per level-up: base cost scales with current level
const LEVEL_UP_COST = { wood: 10, stone: 8, gold: 3 };
const MAX_LEVEL = 3;
const UPGRADE_CHECK_INTERVAL = 200;

export class BuildingUpgradeSystem {
  private lastCheck: Map<EntityId, number> = new Map();

  update(em: EntityManager, civManager: CivManager, tick: number): void {
    const buildingIds = em.getEntitiesWithComponent('building');

    for (const id of buildingIds) {
      const building = em.getComponent<BuildingComponent>(id, 'building');
      if (!building) continue;

      const lastTick = this.lastCheck.get(id) ?? 0;
      if (tick - lastTick < UPGRADE_CHECK_INTERVAL) continue;
      this.lastCheck.set(id, tick);

      const civ = civManager.civilizations.get(building.civId);
      if (!civ) continue;

      // Only upgrade buildings at full health (not under attack)
      if (building.health < building.maxHealth) continue;

      // Try type upgrade first, then level-up
      if (!this.tryTypeUpgrade(em, id, building, civ, tick)) {
        this.tryLevelUp(em, id, building, civ, tick);
      }
    }

    // Apply continuous building effects
    this.applyNewBuildingEffects(em, civManager);
  }

  private tryTypeUpgrade(em: EntityManager, id: EntityId, building: BuildingComponent, civ: Civilization, tick: number): boolean {
    const path = UPGRADE_PATHS.find(p => p.from === building.buildingType);
    if (!path) return false;
    if (civ.techLevel < path.techLevel) return false;
    if (civ.resources.wood < path.cost.wood || civ.resources.stone < path.cost.stone || civ.resources.gold < path.cost.gold) return false;

    // Deduct resources
    civ.resources.wood -= path.cost.wood;
    civ.resources.stone -= path.cost.stone;
    civ.resources.gold -= path.cost.gold;

    // Upgrade the building type, reset level to 1
    building.buildingType = path.to;
    building.level = 1;
    building.maxHealth = 100;
    building.health = 100;

    EventLog.log('building', `${civ.name} upgraded ${path.from} to ${path.to}`, tick);
    return true;
  }

  private tryLevelUp(em: EntityManager, id: EntityId, building: BuildingComponent, civ: Civilization, tick: number): boolean {
    if (building.level >= MAX_LEVEL) return false;

    // Workshop discount: 10% per level of each workshop owned
    const workshopDiscount = this.getWorkshopDiscount(em, civ);
    const costMult = Math.max(0.5, 1 - workshopDiscount);
    const levelMult = building.level; // cost scales with current level

    const woodCost = Math.ceil(LEVEL_UP_COST.wood * levelMult * costMult);
    const stoneCost = Math.ceil(LEVEL_UP_COST.stone * levelMult * costMult);
    const goldCost = Math.ceil(LEVEL_UP_COST.gold * levelMult * costMult);

    if (civ.resources.wood < woodCost || civ.resources.stone < stoneCost || civ.resources.gold < goldCost) return false;

    civ.resources.wood -= woodCost;
    civ.resources.stone -= stoneCost;
    civ.resources.gold -= goldCost;

    building.level++;
    // +30% health per level
    building.maxHealth = Math.round(100 * (1 + 0.3 * (building.level - 1)));
    building.health = building.maxHealth;

    EventLog.log('building', `${civ.name} upgraded ${building.buildingType} to level ${building.level}`, tick);
    return true;
  }

  private applyNewBuildingEffects(em: EntityManager, civManager: CivManager): void {
    for (const [, civ] of civManager.civilizations) {
      for (const id of civ.buildings) {
        const building = em.getComponent<BuildingComponent>(id, 'building');
        if (!building) continue;

        const level = building.level;
        // +20% effect per level beyond 1
        const effectMult = 1 + 0.2 * (level - 1);

        switch (building.buildingType) {
          case BuildingType.MARKET:
            // Generate gold: 0.05/tick * level
            civ.resources.gold += 0.05 * level;
            // Boost trade route income by 15% (applied additively per market)
            for (const route of civ.tradeRoutes) {
              if (route.active) {
                civ.resources.gold += route.income * 0.15 * effectMult;
              }
            }
            break;

          case BuildingType.ACADEMY:
            // Boost research speed by 10% per level
            civ.research.researchRate += 0.001 * level * effectMult;
            break;

          case BuildingType.GRANARY:
            // +20% food capacity effect: reduce food decay / add surplus
            civ.resources.food += 0.03 * level * effectMult;
            break;

          case BuildingType.WALL:
            // Damage reduction handled via getWallDamageReduction()
            break;

          case BuildingType.WORKSHOP:
            // Cost reduction handled via getWorkshopDiscount()
            break;
        }
      }
    }
  }

  /** Returns damage multiplier for buildings near walls (lower = more protection) */
  getWallDamageReduction(em: EntityManager, targetId: EntityId, civId: number, civManager: CivManager): number {
    const targetPos = em.getComponent<PositionComponent>(targetId, 'position');
    if (!targetPos) return 1.0;

    const civ = civManager.civilizations.get(civId);
    if (!civ) return 1.0;

    let reduction = 0;
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building');
      if (!b || b.buildingType !== BuildingType.WALL) continue;

      const pos = em.getComponent<PositionComponent>(id, 'position');
      if (!pos) continue;

      const dx = targetPos.x - pos.x;
      const dy = targetPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Walls protect buildings within 5 tiles
      if (dist <= 5) {
        // 30% reduction per wall level, diminishing with distance
        const distFactor = 1 - dist / 5;
        reduction += 0.3 * b.level * distFactor;
      }
    }

    // Cap at 80% reduction
    return Math.max(0.2, 1 - reduction);
  }

  /** Returns building cost discount from workshops (0-0.5 range) */
  private getWorkshopDiscount(em: EntityManager, civ: Civilization): number {
    let totalDiscount = 0;
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building');
      if (b && b.buildingType === BuildingType.WORKSHOP) {
        totalDiscount += 0.1 * b.level;
      }
    }
    return Math.min(0.5, totalDiscount);
  }

  /** Returns construction speed multiplier from workshops */
  getWorkshopSpeedBonus(em: EntityManager, civ: Civilization): number {
    let bonus = 1.0;
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building');
      if (b && b.buildingType === BuildingType.WORKSHOP) {
        bonus += 0.1 * b.level;
      }
    }
    return bonus;
  }

  /** Returns academy research speed multiplier */
  getAcademyResearchBonus(em: EntityManager, civ: Civilization): number {
    let bonus = 1.0;
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building');
      if (b && b.buildingType === BuildingType.ACADEMY) {
        const effectMult = 1 + 0.2 * (b.level - 1);
        bonus += 0.1 * b.level * effectMult;
      }
    }
    return bonus;
  }

  /** Returns granary food capacity multiplier */
  getGranaryFoodBonus(em: EntityManager, civ: Civilization): number {
    let bonus = 1.0;
    for (const id of civ.buildings) {
      const b = em.getComponent<BuildingComponent>(id, 'building');
      if (b && b.buildingType === BuildingType.GRANARY) {
        const effectMult = 1 + 0.2 * (b.level - 1);
        bonus += 0.2 * effectMult;
      }
    }
    return bonus;
  }

  /** Clean up tracking for removed buildings */
  removeBuilding(id: EntityId): void {
    this.lastCheck.delete(id);
  }
}

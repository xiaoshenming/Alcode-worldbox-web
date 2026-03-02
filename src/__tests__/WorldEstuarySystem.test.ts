import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldEstuarySystem } from '../systems/WorldEstuarySystem';
import { TileType } from '../utils/Constants';

describe('WorldEstuarySystem', () => {
  let system: WorldEstuarySystem;
  let mockWorld: any;
  let mockEntityManager: any;

  beforeEach(() => {
    mockWorld = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => TileType.GRASS),
      setTile: vi.fn()
    };
    mockEntityManager = {
      getEntitiesWithComponents: vi.fn(() => []),
      getComponent: vi.fn(() => null)
    };
    system = new WorldEstuarySystem();
  });

  describe('Basic Structure', () => {
    it('should initialize with empty estuaries array', () => {
      expect((system as any).estuaries).toEqual([]);
    });

    it('should initialize lastCheck to 0', () => {
      expect((system as any).lastCheck).toBe(0);
    });

    it('should initialize nextId to 1', () => {
      expect((system as any).nextId).toBe(1);
    });
  });

  describe('CHECK_INTERVAL Throttling', () => {
    it('should not check when tick < CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2599);
      expect((system as any).estuaries.length).toBe(0);
    });

    it('should check when tick === CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBeGreaterThan(0);
    });

    it('should check when tick > CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 5200);
      expect((system as any).estuaries.length).toBeGreaterThan(0);
    });

    it('should use >= comparison for interval check', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).lastCheck).toBe(2600);
    });

    it('should update lastCheck after interval passes', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).lastCheck).toBe(2600);
      system.update(0, mockWorld, mockEntityManager, 5200);
      expect((system as any).lastCheck).toBe(5200);
    });

    it('should not update lastCheck before interval', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2599);
      expect((system as any).lastCheck).toBe(0);
    });
  });

  describe('Spawn Logic - SHALLOW_WATER Terrain', () => {
    it('should spawn on SHALLOW_WATER terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBeGreaterThan(0);
    });

    it('should not spawn when random >= FORM_CHANCE', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.002);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(0);
    });

    it('should spawn when random < FORM_CHANCE on SHALLOW_WATER', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0014);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(1);
    });
  });

  describe('Spawn Logic - SAND Terrain', () => {
    it('should spawn on SAND terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SAND);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBeGreaterThan(0);
    });

    it('should not spawn on GRASS terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.GRASS);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(0);
    });

    it('should not spawn on MOUNTAIN terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(0);
    });

    it('should not spawn on DEEP_WATER terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.DEEP_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(0);
    });
  });

  describe('Estuary Field Validation', () => {
    it('should create estuary with valid x coordinate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.x).toBeGreaterThanOrEqual(10);
      expect(est.x).toBeLessThan(90);
    });

    it('should create estuary with valid y coordinate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.y).toBeGreaterThanOrEqual(10);
      expect(est.y).toBeLessThan(90);
    });

    it('should create estuary with tick field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.tick).toBe(2600);
    });

    it('should create estuary with width field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.width).toBeGreaterThan(0);
    });

    it('should create estuary with salinity field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.salinity).toBeGreaterThan(0);
    });

    it('should create estuary with tidalRange field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.tidalRange).toBeGreaterThan(0);
    });

    it('should create estuary with biodiversity field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.biodiversity).toBeGreaterThan(0);
    });

    it('should create estuary with sedimentFlow field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.sedimentFlow).toBeGreaterThan(0);
    });

    it('should create estuary with spectacle field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      const est = (system as any).estuaries[0];
      expect(est.spectacle).toBeGreaterThan(0);
    });

    it('should create estuary with unique id', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      system.update(0, mockWorld, mockEntityManager, 5200);
      const ests = (system as any).estuaries;
      if (ests.length >= 2) {
        expect(ests[0].id).not.toBe(ests[1].id);
      }
    });
  });

  describe('MAX_ESTUARIES Limit', () => {
    it('should not spawn when at MAX_ESTUARIES limit', () => {
      (system as any).estuaries = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1, x: i + 10, y: i + 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(15);
    });

    it('should allow spawn when below MAX_ESTUARIES', () => {
      (system as any).estuaries = Array.from({ length: 14 }, (_, i) => ({
        id: i + 1, x: i + 10, y: i + 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(15);
    });

    it('should never exceed MAX_ESTUARIES', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      for (let i = 0; i < 20; i++) {
        system.update(0, mockWorld, mockEntityManager, 2600 * (i + 1));
      }
      expect((system as any).estuaries.length).toBeLessThanOrEqual(15);
    });

    it('should respect MAX_ESTUARIES for SAND terrain too', () => {
      (system as any).estuaries = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1, x: i + 10, y: i + 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SAND);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries.length).toBe(15);
    });
  });

  describe('Cleanup Logic', () => {
    it('should remove estuaries older than cutoff (tick - 91000)', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 },
        { id: 2, x: 20, y: 20, tick: 10000, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 100000);
      expect((system as any).estuaries.length).toBe(1);
      expect((system as any).estuaries[0].tick).toBe(10000);
    });

    it('should keep estuaries with tick >= cutoff', () => {
      const tick = 100000;
      const cutoff = tick - 91000;
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: cutoff, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 },
        { id: 2, x: 20, y: 20, tick: cutoff + 1, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, tick);
      expect((system as any).estuaries.length).toBe(2);
    });

    it('should remove estuaries with tick < cutoff', () => {
      const tick = 100000;
      const cutoff = tick - 91000;
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: cutoff - 1, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, tick);
      expect((system as any).estuaries.length).toBe(0);
    });

    it('should remove all expired estuaries at once', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 },
        { id: 2, x: 20, y: 20, tick: 100, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 },
        { id: 3, x: 30, y: 30, tick: 200, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 100000);
      expect((system as any).estuaries.length).toBe(0);
    });

    it('should handle empty array during cleanup', () => {
      (system as any).estuaries = [];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      expect(() => system.update(0, mockWorld, mockEntityManager, 2600)).not.toThrow();
    });

    it('should handle negative cutoff values gracefully', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 50000); // cutoff = 50000 - 91000 = -41000
      expect((system as any).estuaries.length).toBe(1);
    });
  });

  describe('Field Updates', () => {
    it('should update salinity over time', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      const initialSalinity = (system as any).estuaries[0].salinity;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries[0].salinity).not.toBe(initialSalinity);
    });

    it('should update tidalRange over time', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      const initialTidalRange = (system as any).estuaries[0].tidalRange;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries[0].tidalRange).not.toBe(initialTidalRange);
    });

    it('should update biodiversity over time', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      const initialBiodiversity = (system as any).estuaries[0].biodiversity;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries[0].biodiversity).not.toBe(initialBiodiversity);
    });

    it('should update spectacle over time', () => {
      (system as any).estuaries = [
        { id: 1, x: 10, y: 10, tick: 0, width: 10, salinity: 20, tidalRange: 5, biodiversity: 40, sedimentFlow: 20, spectacle: 30 }
      ];
      const initialSpectacle = (system as any).estuaries[0].spectacle;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2600);
      expect((system as any).estuaries[0].spectacle).not.toBe(initialSpectacle);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tick = 0', () => {
      expect(() => system.update(0, mockWorld, mockEntityManager, 0)).not.toThrow();
    });

    it('should handle very large tick values', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      expect(() => system.update(0, mockWorld, mockEntityManager, 10000000)).not.toThrow();
    });

    it('should handle world with minimal dimensions', () => {
      mockWorld.width = 30;
      mockWorld.height = 30;
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      expect(() => system.update(0, mockWorld, mockEntityManager, 2600)).not.toThrow();
    });
  });
});

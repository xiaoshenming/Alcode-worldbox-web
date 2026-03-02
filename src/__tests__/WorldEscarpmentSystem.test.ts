import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldEscarpmentSystem } from '../systems/WorldEscarpmentSystem';
import { TileType } from '../utils/Constants';

describe('WorldEscarpmentSystem', () => {
  let system: WorldEscarpmentSystem;
  let mockWorld: any;
  let mockEntityManager: any;

  beforeEach(() => {
    mockWorld = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => TileType.SAND),
      setTile: vi.fn()
    };
    mockEntityManager = {
      getEntitiesWithComponents: vi.fn(() => []),
      getComponent: vi.fn(() => null)
    };
    system = new WorldEscarpmentSystem();
  });

  describe('Basic Structure', () => {
    it('should initialize with empty escarpments array', () => {
      expect((system as any).escarpments).toEqual([]);
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
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2699);
      expect((system as any).escarpments.length).toBe(0);
    });

    it('should check when tick === CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBeGreaterThan(0);
    });

    it('should check when tick > CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 5400);
      expect((system as any).escarpments.length).toBeGreaterThan(0);
    });

    it('should use >= comparison for interval check', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).lastCheck).toBe(2700);
    });

    it('should update lastCheck after interval passes', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).lastCheck).toBe(2700);
      system.update(0, mockWorld, mockEntityManager, 5400);
      expect((system as any).lastCheck).toBe(5400);
    });

    it('should not update lastCheck before interval', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2699);
      expect((system as any).lastCheck).toBe(0);
    });
  });

  describe('Spawn Logic - MOUNTAIN Terrain', () => {
    it('should spawn on MOUNTAIN terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBeGreaterThan(0);
    });

    it('should not spawn when random >= FORM_CHANCE', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.002);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBe(0);
    });

    it('should spawn when random < FORM_CHANCE on MOUNTAIN', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0015);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBe(1);
    });
  });

  describe('Spawn Logic - GRASS Terrain', () => {
    it('should spawn on GRASS terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.GRASS);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBeGreaterThan(0);
    });

    it('should not spawn on SAND terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SAND);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBe(0);
    });

    it('should not spawn on WATER terrain', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.SHALLOW_WATER);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBe(0);
    });
  });

  describe('Escarpment Field Validation', () => {
    it('should create escarpment with valid x coordinate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.x).toBeGreaterThanOrEqual(10);
      expect(esc.x).toBeLessThan(90);
    });

    it('should create escarpment with valid y coordinate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.y).toBeGreaterThanOrEqual(10);
      expect(esc.y).toBeLessThan(90);
    });

    it('should create escarpment with tick field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.tick).toBe(2700);
    });

    it('should create escarpment with length field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.length).toBeGreaterThan(0);
    });

    it('should create escarpment with height field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.height).toBeGreaterThan(0);
    });

    it('should create escarpment with steepness field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.steepness).toBeGreaterThan(0);
    });

    it('should create escarpment with erosionRate field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.erosionRate).toBeGreaterThan(0);
    });

    it('should create escarpment with rockfallRisk field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.rockfallRisk).toBeGreaterThan(0);
    });

    it('should create escarpment with vegetationCover field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      const esc = (system as any).escarpments[0];
      expect(esc.vegetationCover).toBeGreaterThan(0);
    });

    it('should create escarpment with unique id', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      system.update(0, mockWorld, mockEntityManager, 5400);
      const escs = (system as any).escarpments;
      if (escs.length >= 2) {
        expect(escs[0].id).not.toBe(escs[1].id);
      }
    });
  });

  describe('MAX_ESCARPMENTS Limit', () => {
    it('should not spawn when at MAX_ESCARPMENTS limit', () => {
      (system as any).escarpments = Array.from({ length: 14 }, (_, i) => ({
        id: i + 1, x: i + 10, y: i + 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBe(14);
    });

    it('should allow spawn when below MAX_ESCARPMENTS', () => {
      (system as any).escarpments = Array.from({ length: 13 }, (_, i) => ({
        id: i + 1, x: i + 10, y: i + 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20
      }));
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments.length).toBe(14);
    });

    it('should never exceed MAX_ESCARPMENTS', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      for (let i = 0; i < 20; i++) {
        system.update(0, mockWorld, mockEntityManager, 2700 * (i + 1));
      }
      expect((system as any).escarpments.length).toBeLessThanOrEqual(14);
    });
  });

  describe('Cleanup Logic', () => {
    it('should remove escarpments older than cutoff (tick - 95000)', () => {
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 },
        { id: 2, x: 20, y: 20, tick: 5000, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 100000);
      expect((system as any).escarpments.length).toBe(1);
      expect((system as any).escarpments[0].tick).toBe(5000);
    });

    it('should keep escarpments with tick >= cutoff', () => {
      const tick = 100000;
      const cutoff = tick - 95000;
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: cutoff, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 },
        { id: 2, x: 20, y: 20, tick: cutoff + 1, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, tick);
      expect((system as any).escarpments.length).toBe(2);
    });

    it('should remove escarpments with tick < cutoff', () => {
      const tick = 100000;
      const cutoff = tick - 95000;
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: cutoff - 1, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, tick);
      expect((system as any).escarpments.length).toBe(0);
    });

    it('should remove all expired escarpments at once', () => {
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 },
        { id: 2, x: 20, y: 20, tick: 100, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 },
        { id: 3, x: 30, y: 30, tick: 200, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 100000);
      expect((system as any).escarpments.length).toBe(0);
    });

    it('should handle empty array during cleanup', () => {
      (system as any).escarpments = [];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      expect(() => system.update(0, mockWorld, mockEntityManager, 2700)).not.toThrow();
    });
  });

  describe('Field Updates', () => {
    it('should update erosionRate over time', () => {
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      const initialRate = (system as any).escarpments[0].erosionRate;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments[0].erosionRate).not.toBe(initialRate);
    });

    it('should update height over time', () => {
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      const initialHeight = (system as any).escarpments[0].height;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments[0].height).not.toBe(initialHeight);
    });

    it('should update rockfallRisk over time', () => {
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      const initialRisk = (system as any).escarpments[0].rockfallRisk;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments[0].rockfallRisk).not.toBe(initialRisk);
    });

    it('should update vegetationCover over time', () => {
      (system as any).escarpments = [
        { id: 1, x: 10, y: 10, tick: 0, length: 10, height: 50, steepness: 60, erosionRate: 10, rockfallRisk: 20, vegetationCover: 20 }
      ];
      const initialCover = (system as any).escarpments[0].vegetationCover;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 2700);
      expect((system as any).escarpments[0].vegetationCover).toBeGreaterThan(initialCover);
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
      mockWorld.getTile = vi.fn(() => TileType.MOUNTAIN);
      expect(() => system.update(0, mockWorld, mockEntityManager, 2700)).not.toThrow();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldDustStormSystem } from '../systems/WorldDustStormSystem';

describe('WorldDustStormSystem', () => {
  let system: WorldDustStormSystem;
  let mockWorld: any;
  let mockEntityManager: any;

  beforeEach(() => {
    mockWorld = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 2),
      setTile: vi.fn()
    };
    mockEntityManager = {
      getEntitiesWithComponents: vi.fn(() => []),
      getComponent: vi.fn(() => null)
    };
    system = new WorldDustStormSystem();
  });

  describe('Basic Structure', () => {
    it('should initialize with empty storms array', () => {
      expect((system as any).storms).toEqual([]);
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
      system.update(0, mockWorld, mockEntityManager, 799);
      expect((system as any).storms.length).toBe(0);
    });

    it('should check when tick === CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.length).toBeGreaterThan(0);
    });

    it('should check when tick > CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 1600);
      expect((system as any).storms.length).toBeGreaterThan(0);
    });

    it('should use >= comparison for interval check', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const firstCount = (system as any).storms.length;
      system.update(0, mockWorld, mockEntityManager, 1600);
      expect((system as any).storms.length).toBeGreaterThanOrEqual(firstCount);
    });

    it('should update lastCheck after interval passes', () => {
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).lastCheck).toBe(800);
      system.update(0, mockWorld, mockEntityManager, 1600);
      expect((system as any).lastCheck).toBe(1600);
    });
  });

  describe('Spawn Logic', () => {
    it('should not spawn when random > STORM_CHANCE', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.length).toBe(0);
    });

    it('should spawn when random <= STORM_CHANCE', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.003);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.length).toBe(1);
    });

    it('should create storm with valid x coordinate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.x).toBeGreaterThanOrEqual(0);
      expect(storm.x).toBeLessThan(100);
    });

    it('should create storm with valid y coordinate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.y).toBeGreaterThanOrEqual(0);
      expect(storm.y).toBeLessThan(100);
    });

    it('should create storm with intensity field', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(['mild', 'moderate', 'severe', 'catastrophic']).toContain(storm.intensity);
    });

    it('should create storm with startTick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.startTick).toBe(800);
    });

    it('should create storm with duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.duration).toBeGreaterThan(0);
    });

    it('should create storm with radius', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.radius).toBeGreaterThan(0);
    });

    it('should create storm with direction', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.direction).toBeDefined();
    });

    it('should create storm with speed', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      const storm = (system as any).storms[0];
      expect(storm.speed).toBeGreaterThan(0);
    });

    it('should create storm with unique id', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      system.update(0, mockWorld, mockEntityManager, 1600);
      const storms = (system as any).storms;
      if (storms.length >= 2) {
        expect(storms[0].id).not.toBe(storms[1].id);
      }
    });
  });

  describe('MAX_STORMS Limit', () => {
    it('should not spawn when at MAX_STORMS limit', () => {
      (system as any).storms = [
        { id: 1, x: 10, y: 10, intensity: 'mild', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 0.5 },
        { id: 2, x: 20, y: 20, intensity: 'moderate', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 0.5 },
        { id: 3, x: 30, y: 30, intensity: 'severe', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 0.5 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.length).toBe(3);
    });

    it('should allow spawn when below MAX_STORMS', () => {
      (system as any).storms = [
        { id: 1, x: 10, y: 10, intensity: 'mild', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 0.5 },
        { id: 2, x: 20, y: 20, intensity: 'moderate', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 0.5 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.length).toBe(3);
    });

    it('should respect MAX_STORMS across multiple updates', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      for (let i = 0; i < 10; i++) {
        system.update(0, mockWorld, mockEntityManager, 800 * (i + 1));
      }
      expect((system as any).storms.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Expiry and Cleanup', () => {
    it('should remove expired storm when elapsed >= duration', () => {
      (system as any).storms = [
        { id: 1, x: 10, y: 10, intensity: 'mild', startTick: 0, duration: 1000, radius: 10, direction: 0, speed: 0.5 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 1000);
      expect((system as any).storms.length).toBe(0);
    });

    it('should keep storm when elapsed < duration', () => {
      (system as any).storms = [
        { id: 1, x: 10, y: 10, intensity: 'mild', startTick: 0, duration: 1000, radius: 10, direction: 0, speed: 0.5 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 999);
      expect((system as any).storms.length).toBe(1);
    });

    it('should remove multiple expired storms', () => {
      (system as any).storms = [
        { id: 1, x: 10, y: 10, intensity: 'mild', startTick: 0, duration: 500, radius: 10, direction: 0, speed: 0.5 },
        { id: 2, x: 20, y: 20, intensity: 'moderate', startTick: 0, duration: 500, radius: 10, direction: 0, speed: 0.5 },
        { id: 3, x: 30, y: 30, intensity: 'severe', startTick: 0, duration: 2000, radius: 10, direction: 0, speed: 0.5 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 1000);
      expect((system as any).storms.length).toBe(1);
      expect((system as any).storms[0].intensity).toBe('severe');
    });

    it('should cleanup on every update', () => {
      (system as any).storms = [
        { id: 1, x: 10, y: 10, intensity: 'mild', startTick: 0, duration: 100, radius: 10, direction: 0, speed: 0.5 }
      ];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 50);
      expect((system as any).storms.length).toBe(1);
      system.update(0, mockWorld, mockEntityManager, 850);
      expect((system as any).storms.length).toBe(0);
    });

    it('should handle empty storms array', () => {
      (system as any).storms = [];
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      expect(() => system.update(0, mockWorld, mockEntityManager, 800)).not.toThrow();
    });
  });

  describe('Intensity Distribution', () => {
    it('should create storms with mild intensity', () => {
      const randomValues = [0.001, 0.1];
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % 2]);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.some((s: any) => s.intensity === 'mild')).toBe(true);
    });

    it('should create storms with moderate intensity', () => {
      const randomValues = [0.001, 0.5];
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % 2]);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.some((s: any) => s.intensity === 'moderate')).toBe(true);
    });

    it('should create storms with severe intensity', () => {
      const randomValues = [0.001, 0.85];
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % 2]);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.some((s: any) => s.intensity === 'severe')).toBe(true);
    });

    it('should create storms with catastrophic intensity', () => {
      const randomValues = [0.001, 0.95];
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % 2]);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms.some((s: any) => s.intensity === 'catastrophic')).toBe(true);
    });
  });

  describe('Storm Movement', () => {
    it('should move storms based on direction and speed', () => {
      (system as any).storms = [
        { id: 1, x: 50, y: 50, intensity: 'mild', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 1 }
      ];
      const initialX = (system as any).storms[0].x;
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms[0].x).not.toBe(initialX);
    });

    it('should update storm direction randomly', () => {
      (system as any).storms = [
        { id: 1, x: 50, y: 50, intensity: 'mild', startTick: 0, duration: 10000, radius: 10, direction: 0, speed: 1 }
      ];
      const initialDir = (system as any).storms[0].direction;
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      system.update(0, mockWorld, mockEntityManager, 800);
      expect((system as any).storms[0].direction).not.toBe(initialDir);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tick = 0', () => {
      expect(() => system.update(0, mockWorld, mockEntityManager, 0)).not.toThrow();
    });

    it('should handle very large tick values', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      expect(() => system.update(0, mockWorld, mockEntityManager, 1000000)).not.toThrow();
    });

    it('should handle world with width = 0', () => {
      mockWorld.width = 0;
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      expect(() => system.update(0, mockWorld, mockEntityManager, 800)).not.toThrow();
    });

    it('should handle world with height = 0', () => {
      mockWorld.height = 0;
      vi.spyOn(Math, 'random').mockReturnValue(0.001);
      expect(() => system.update(0, mockWorld, mockEntityManager, 800)).not.toThrow();
    });
  });
});

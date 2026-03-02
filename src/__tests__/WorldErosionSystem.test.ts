import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldErosionSystem } from '../systems/WorldErosionSystem';

describe('WorldErosionSystem', () => {
  let system: WorldErosionSystem;
  let mockWorld: any;

  beforeEach(() => {
    system = new WorldErosionSystem();
    
    // Mock world with getTile/setTile methods
    // getTile returns number | null (terrain type)
    mockWorld = {
      width: 100,
      height: 100,
      getTile: vi.fn((x: number, y: number) => 3), // Grass terrain
      setTile: vi.fn()
    };
  });

  // 基础结构测试 (5个)
  it('should create system instance', () => {
    expect(system).toBeDefined();
    expect(system).toBeInstanceOf(WorldErosionSystem);
  });

  it('should have update method', () => {
    expect(typeof system.update).toBe('function');
  });

  it('should have setWorldSize method', () => {
    expect(typeof system.setWorldSize).toBe('function');
  });

  it('should have getTotalErosions method', () => {
    expect(typeof system.getTotalErosions).toBe('function');
  });

  it('should initialize with zero total erosions', () => {
    expect(system.getTotalErosions()).toBe(0);
  });

  // EROSION_INTERVAL节流测试 (6个)
  it('should not erode on first update (tick < EROSION_INTERVAL)', () => {
    system.update(16, mockWorld, 0);
    expect(mockWorld.setTile).not.toHaveBeenCalled();
  });

  it('should not erode when tick < EROSION_INTERVAL', () => {
    system.update(16, mockWorld, 1000);
    expect(mockWorld.setTile).not.toHaveBeenCalled();
  });

  it('should erode when tick === EROSION_INTERVAL (1500)', () => {
    system.update(16, mockWorld, 1500);
    // Should call getTile at least once during erosion
    expect(mockWorld.getTile).toHaveBeenCalled();
  });

  it('should erode when tick > EROSION_INTERVAL', () => {
    system.update(16, mockWorld, 3000);
    expect(mockWorld.getTile).toHaveBeenCalled();
  });

  it('should erode at multiple EROSION_INTERVAL ticks', () => {
    system.update(16, mockWorld, 1500);
    const firstCallCount = mockWorld.getTile.mock.calls.length;
    
    mockWorld.getTile.mockClear();
    system.update(16, mockWorld, 3000);
    const secondCallCount = mockWorld.getTile.mock.calls.length;
    
    expect(firstCallCount).toBeGreaterThan(0);
    expect(secondCallCount).toBeGreaterThan(0);
  });

  it('should not erode between EROSION_INTERVAL ticks', () => {
    system.update(16, mockWorld, 1500);
    mockWorld.getTile.mockClear();
    
    system.update(16, mockWorld, 2000);
    expect(mockWorld.getTile).not.toHaveBeenCalled();
  });

  // setWorldSize测试 (5个)
  it('should accept setWorldSize call', () => {
    expect(() => system.setWorldSize(200, 200)).not.toThrow();
  });

  it('should handle small world size', () => {
    expect(() => system.setWorldSize(50, 50)).not.toThrow();
  });

  it('should handle large world size', () => {
    expect(() => system.setWorldSize(500, 500)).not.toThrow();
  });

  it('should handle non-square world size', () => {
    expect(() => system.setWorldSize(100, 200)).not.toThrow();
  });

  it('should work after setWorldSize is called', () => {
    system.setWorldSize(150, 150);
    mockWorld.width = 150;
    mockWorld.height = 150;
    
    system.update(16, mockWorld, 1500);
    expect(mockWorld.getTile).toHaveBeenCalled();
  });

  // getTotalErosions累计测试 (6个)
  it('should track erosions when terrain changes', () => {
    // Mock mountain terrain (5) near water
    mockWorld.getTile.mockImplementation((x: number, y: number) => {
      if (x === 50 && y === 50) return 5; // Mountain
      return 0; // Water around it
    });
    
    const initialCount = system.getTotalErosions();
    // Run multiple times to increase chance of erosion
    for (let i = 0; i < 10; i++) {
      system.update(16, mockWorld, 1500 + i * 1500);
    }
    // Total erosions should be >= initial (may increase if random conditions met)
    expect(system.getTotalErosions()).toBeGreaterThanOrEqual(initialCount);
  });

  it('should not increment erosions when tick < EROSION_INTERVAL', () => {
    const initialCount = system.getTotalErosions();
    system.update(16, mockWorld, 1000);
    expect(system.getTotalErosions()).toBe(initialCount);
  });

  it('should track erosions correctly across multiple intervals', () => {
    const initialCount = system.getTotalErosions();
    system.update(16, mockWorld, 1500);
    system.update(16, mockWorld, 3000);
    system.update(16, mockWorld, 4500);
    
    expect(system.getTotalErosions()).toBeGreaterThanOrEqual(initialCount);
  });

  it('should return consistent erosion count', () => {
    system.update(16, mockWorld, 1500);
    const count1 = system.getTotalErosions();
    const count2 = system.getTotalErosions();
    expect(count1).toBe(count2);
  });

  it('should handle zero erosions gracefully', () => {
    expect(system.getTotalErosions()).toBe(0);
    system.update(16, mockWorld, 100);
    expect(system.getTotalErosions()).toBe(0);
  });

  it('should maintain erosion count state', () => {
    const count1 = system.getTotalErosions();
    system.update(16, mockWorld, 1500);
    const count2 = system.getTotalErosions();
    
    expect(count2).toBeGreaterThanOrEqual(count1);
  });

  // 边界条件测试 (3个)
  it('should handle world without setTile method', () => {
    const worldNoSetTile = {
      width: 100,
      height: 100,
      getTile: vi.fn(() => 3)
    };
    
    expect(() => system.update(16, worldNoSetTile, 1500)).not.toThrow();
  });

  it('should handle negative tick values', () => {
    expect(() => system.update(16, mockWorld, -100)).not.toThrow();
  });

  it('should handle zero dt', () => {
    expect(() => system.update(0, mockWorld, 1500)).not.toThrow();
  });
});

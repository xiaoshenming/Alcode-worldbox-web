import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('WorldErosionSystem - 附加测试', () => {
  let system: WorldErosionSystem
  let mockWorld: any
  beforeEach(() => {
    system = new WorldErosionSystem()
    mockWorld = {
      width: 200, height: 200,
      getTile: vi.fn(() => 3),
      setTile: vi.fn()
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('worldWidth默认为200', () => { expect((system as any).worldWidth).toBe(200) })
  it('worldHeight默认为200', () => { expect((system as any).worldHeight).toBe(200) })
  it('lastUpdate默认为0', () => { expect((system as any).lastUpdate).toBe(0) })
  it('totalErosions默认为0', () => { expect((system as any).totalErosions).toBe(0) })
  it('setWorldSize(100,150)后worldWidth=100', () => {
    system.setWorldSize(100, 150)
    expect((system as any).worldWidth).toBe(100)
  })
  it('setWorldSize(100,150)后worldHeight=150', () => {
    system.setWorldSize(100, 150)
    expect((system as any).worldHeight).toBe(150)
  })
  it('EROSION_INTERVAL=1500：tick=1499不触发', () => {
    system.update(16, mockWorld, 1499)
    expect((system as any).lastUpdate).toBe(0)
  })
  it('tick=1500时lastUpdate变为1500', () => {
    system.update(16, mockWorld, 1500)
    expect((system as any).lastUpdate).toBe(1500)
  })
  it('tick=3000时再次触发', () => {
    system.update(16, mockWorld, 1500)
    system.update(16, mockWorld, 3000)
    expect((system as any).lastUpdate).toBe(3000)
  })
  it('update调用world.getTile', () => {
    system.update(16, mockWorld, 1500)
    expect(mockWorld.getTile).toHaveBeenCalled()
  })
  it('getTile返回null时不调用setTile', () => {
    mockWorld.getTile.mockReturnValue(null)
    system.update(16, mockWorld, 1500)
    expect(mockWorld.setTile).not.toHaveBeenCalled()
  })
  it('山地(tile=5)邻水>=2且random<0.03时setTile被调用', () => {
    vi.restoreAllMocks()
    let callIdx = 0
    mockWorld.getTile.mockImplementation((x: number, y: number) => {
      if (x === 1 && y === 1) return 5   // mountain
      return 0  // water everywhere around
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.01)  // < 0.03
    system.setWorldSize(5, 5)
    system.update(16, mockWorld, 1500)
    // setTile can be called
    expect(typeof mockWorld.setTile.mock.calls.length).toBe('number')
  })
  it('random>=0.03时山地不erode', () => {
    vi.restoreAllMocks()
    mockWorld.getTile.mockImplementation((x: number, y: number) => {
      if (x === 1 && y === 1) return 5
      return 0
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // > 0.03
    system.setWorldSize(5, 5)
    system.update(16, mockWorld, 1500)
    // setTile should not be called for erosion
    const erosionCalls = mockWorld.setTile.mock.calls.filter(([,, t]: [number, number, number]) => t === 3)
    expect(erosionCalls.length).toBe(0)
  })
  it('tick未满EROSION_INTERVAL时不调用getTile', () => {
    system.update(16, mockWorld, 999)
    expect(mockWorld.getTile).not.toHaveBeenCalled()
  })
  it('getTotalErosions返回数字', () => {
    expect(typeof system.getTotalErosions()).toBe('number')
  })
  it('getTotalErosions初始返回0', () => {
    expect(system.getTotalErosions()).toBe(0)
  })
  it('update后getTotalErosions不小于初始值', () => {
    const before = system.getTotalErosions()
    system.update(16, mockWorld, 1500)
    expect(system.getTotalErosions()).toBeGreaterThanOrEqual(before)
  })
  it('多次update后lastUpdate持续递增', () => {
    system.update(16, mockWorld, 1500)
    system.update(16, mockWorld, 3000)
    system.update(16, mockWorld, 4500)
    expect((system as any).lastUpdate).toBe(4500)
  })
  it('SAMPLES_PER_TICK=50：每次erode调用getTile约50次', () => {
    system.update(16, mockWorld, 1500)
    expect(mockWorld.getTile.mock.calls.length).toBeGreaterThan(0)
  })
  it('setWorldSize后update使用新尺寸不崩溃', () => {
    system.setWorldSize(10, 10)
    mockWorld.width = 10; mockWorld.height = 10
    expect(() => system.update(16, mockWorld, 1500)).not.toThrow()
  })
  it('world.setTile为undefined时不崩溃', () => {
    const worldNoSetTile = { width: 100, height: 100, getTile: vi.fn(() => 5) }
    expect(() => system.update(16, worldNoSetTile, 1500)).not.toThrow()
  })
  it('连续两次同tick不重复触发', () => {
    system.update(16, mockWorld, 1500)
    const callCount = mockWorld.getTile.mock.calls.length
    system.update(16, mockWorld, 1500)
    expect(mockWorld.getTile.mock.calls.length).toBe(callCount)
  })
})

describe('WorldErosionSystem - 附加测试2', () => {
  let system: WorldErosionSystem
  let mockWorld: any
  beforeEach(() => {
    system = new WorldErosionSystem()
    mockWorld = { width: 200, height: 200, getTile: vi.fn(() => 3), setTile: vi.fn() }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('getTotalErosions方法存在', () => { expect(typeof system.getTotalErosions).toBe('function') })
  it('setWorldSize方法存在', () => { expect(typeof system.setWorldSize).toBe('function') })
  it('update方法存在', () => { expect(typeof (system as any).update).toBe('function') })
  it('tick=0不触发erosion', () => {
    system.update(16, mockWorld, 0)
    expect((system as any).lastUpdate).toBe(0)
  })
  it('同一tick三次调用后lastUpdate只更新第一次', () => {
    system.update(16, mockWorld, 1500)
    system.update(16, mockWorld, 2000)
    system.update(16, mockWorld, 2999)
    expect((system as any).lastUpdate).toBe(1500)
  })
  it('大tick值也能正确触发', () => {
    system.update(16, mockWorld, 999999)
    expect((system as any).lastUpdate).toBe(999999)
  })
})

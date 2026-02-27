import { describe, it, expect, beforeEach } from 'vitest'
import { ZoneManagementSystem } from '../systems/ZoneManagementSystem'

// ZoneManagementSystem 测试：
// - addZone(x,y,w,h,type,name)   → 添加区域，返回唯一 ID
// - getZoneAt(worldX, worldY)     → 查询坐标所在区域类型
// - getZone(id)                   → 按 ID 获取区域
// - removeZone(id)                → 删除区域
// - setDescription(id, desc)      → 设置区域描述
// - changeZoneType(id, newType)   → 修改区域类型
// ZoneManagementSystem 不依赖任何外部模块，可直接实例化。

function makeZMS(): ZoneManagementSystem {
  return new ZoneManagementSystem()
}

// ── addZone ───────────────────────────────────────────────────────────────────

describe('ZoneManagementSystem.addZone', () => {
  let zms: ZoneManagementSystem

  beforeEach(() => {
    zms = makeZMS()
  })

  it('返回递增的唯一 ID', () => {
    const id1 = zms.addZone(0, 0, 10, 10, 'forbidden', 'Zone A')
    const id2 = zms.addZone(20, 20, 10, 10, 'protected', 'Zone B')
    expect(id1).toBe(1)
    expect(id2).toBe(2)
  })

  it('添加后可用 getZone 查询', () => {
    const id = zms.addZone(5, 5, 20, 20, 'warzone', 'Test Zone')
    const zone = zms.getZone(id)
    expect(zone).toBeDefined()
    expect(zone!.x).toBe(5)
    expect(zone!.y).toBe(5)
    expect(zone!.w).toBe(20)
    expect(zone!.h).toBe(20)
    expect(zone!.type).toBe('warzone')
    expect(zone!.name).toBe('Test Zone')
  })

  it('非法类型自动回退为 forbidden', () => {
    const id = zms.addZone(0, 0, 10, 10, 'invalid_type', 'Test')
    const zone = zms.getZone(id)
    expect(zone!.type).toBe('forbidden')
  })

  it('支持四种合法类型', () => {
    const types = ['forbidden', 'protected', 'warzone', 'resource']
    types.forEach((type, i) => {
      const id = zms.addZone(i * 20, 0, 10, 10, type, `Zone${i}`)
      expect(zms.getZone(id)!.type).toBe(type)
    })
  })

  it('description 初始为空字符串', () => {
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    expect(zms.getZone(id)!.description).toBe('')
  })
})

// ── getZoneAt ─────────────────────────────────────────────────────────────────

describe('ZoneManagementSystem.getZoneAt', () => {
  let zms: ZoneManagementSystem

  beforeEach(() => {
    zms = makeZMS()
  })

  it('无区域时返回 null', () => {
    expect(zms.getZoneAt(5, 5)).toBeNull()
  })

  it('坐标在区域内返回正确类型', () => {
    zms.addZone(0, 0, 50, 50, 'protected', 'Forest')
    expect(zms.getZoneAt(25, 25)).toBe('protected')
  })

  it('坐标在区域边界上（含左上）返回正确类型', () => {
    zms.addZone(10, 10, 20, 20, 'warzone', 'Battle')
    expect(zms.getZoneAt(10, 10)).toBe('warzone')  // 左上角
  })

  it('坐标在区域右边界外返回 null', () => {
    zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    expect(zms.getZoneAt(10, 5)).toBeNull()  // x=10 不满足 x < 0+10
  })

  it('多区域时返回第一个命中的区域', () => {
    zms.addZone(0, 0, 50, 50, 'forbidden', 'A')
    zms.addZone(25, 25, 50, 50, 'protected', 'B')
    // (30,30) 在两个区域内，返回先添加的 forbidden
    const type = zms.getZoneAt(30, 30)
    expect(type).toBe('forbidden')
  })

  it('坐标不在任何区域内返回 null', () => {
    zms.addZone(100, 100, 20, 20, 'resource', 'Far')
    expect(zms.getZoneAt(5, 5)).toBeNull()
  })
})

// ── getZone ───────────────────────────────────────────────────────────────────

describe('ZoneManagementSystem.getZone', () => {
  it('不存在的 ID 返回 undefined', () => {
    const zms = makeZMS()
    expect(zms.getZone(999)).toBeUndefined()
  })

  it('返回的 Zone 包含 id 字段', () => {
    const zms = makeZMS()
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'Test')
    expect(zms.getZone(id)!.id).toBe(id)
  })
})

// ── removeZone ────────────────────────────────────────────────────────────────

describe('ZoneManagementSystem.removeZone', () => {
  let zms: ZoneManagementSystem

  beforeEach(() => {
    zms = makeZMS()
  })

  it('删除后 getZone 返回 undefined', () => {
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    zms.removeZone(id)
    expect(zms.getZone(id)).toBeUndefined()
  })

  it('删除后 getZoneAt 返回 null', () => {
    const id = zms.addZone(0, 0, 50, 50, 'warzone', 'War')
    zms.removeZone(id)
    expect(zms.getZoneAt(25, 25)).toBeNull()
  })

  it('删除不存在的 ID 不崩溃', () => {
    expect(() => zms.removeZone(999)).not.toThrow()
  })

  it('删除一个不影响其他区域', () => {
    const id1 = zms.addZone(0, 0, 10, 10, 'forbidden', 'A')
    const id2 = zms.addZone(50, 50, 10, 10, 'protected', 'B')
    zms.removeZone(id1)
    expect(zms.getZone(id1)).toBeUndefined()
    expect(zms.getZone(id2)).toBeDefined()
    expect(zms.getZoneAt(55, 55)).toBe('protected')
  })
})

// ── setDescription ────────────────────────────────────────────────────────────

describe('ZoneManagementSystem.setDescription', () => {
  it('设置描述后可读取', () => {
    const zms = makeZMS()
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    zms.setDescription(id, 'No entry allowed')
    expect(zms.getZone(id)!.description).toBe('No entry allowed')
  })

  it('对不存在的 ID 不崩溃', () => {
    const zms = makeZMS()
    expect(() => zms.setDescription(999, 'test')).not.toThrow()
  })

  it('可以多次覆盖描述', () => {
    const zms = makeZMS()
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    zms.setDescription(id, 'First desc')
    zms.setDescription(id, 'Second desc')
    expect(zms.getZone(id)!.description).toBe('Second desc')
  })
})

// ── changeZoneType ────────────────────────────────────────────────────────────

describe('ZoneManagementSystem.changeZoneType', () => {
  it('合法类型修改成功', () => {
    const zms = makeZMS()
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    zms.changeZoneType(id, 'resource')
    expect(zms.getZone(id)!.type).toBe('resource')
  })

  it('非法类型不修改', () => {
    const zms = makeZMS()
    const id = zms.addZone(0, 0, 10, 10, 'forbidden', 'X')
    zms.changeZoneType(id, 'invalid')
    expect(zms.getZone(id)!.type).toBe('forbidden')
  })

  it('对不存在的 ID 不崩溃', () => {
    const zms = makeZMS()
    expect(() => zms.changeZoneType(999, 'protected')).not.toThrow()
  })

  it('修改类型后 getZoneAt 返回新类型', () => {
    const zms = makeZMS()
    const id = zms.addZone(0, 0, 50, 50, 'warzone', 'Battle')
    zms.changeZoneType(id, 'protected')
    expect(zms.getZoneAt(25, 25)).toBe('protected')
  })
})

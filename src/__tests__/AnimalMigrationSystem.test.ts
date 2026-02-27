import { describe, it, expect, beforeEach } from 'vitest'
import { AnimalMigrationSystem } from '../systems/AnimalMigrationSystem'
import type { MigrationRoute } from '../systems/AnimalMigrationSystem'
import { Season } from '../systems/SeasonSystem'

// AnimalMigrationSystem 测试:
// - getActiveRoutes() → 返回只读路由数组内部引用
// update() 依赖 EntityManager + World，不在此测试。
// 通过 as any 注入 routes 字段进行测试。

function makeAMS(): AnimalMigrationSystem {
  return new AnimalMigrationSystem()
}

function makeRoute(species: string, progress = 0): MigrationRoute {
  return {
    species,
    fromX: 0, fromY: 0,
    toX: 100, toY: 100,
    season: Season.Spring,
    progress,
    entityIds: [1, 2, 3],
  }
}

describe('AnimalMigrationSystem.getActiveRoutes', () => {
  let ams: AnimalMigrationSystem

  beforeEach(() => { ams = makeAMS() })

  it('初始路由为空', () => {
    expect(ams.getActiveRoutes()).toHaveLength(0)
  })

  it('注入路由后可查询', () => {
    ;(ams as any).routes.push(makeRoute('wolf'))
    expect(ams.getActiveRoutes()).toHaveLength(1)
    expect(ams.getActiveRoutes()[0].species).toBe('wolf')
  })

  it('返回的是内部引用', () => {
    ;(ams as any).routes.push(makeRoute('deer'))
    expect(ams.getActiveRoutes()).toBe((ams as any).routes)
  })

  it('多个路由物种独立', () => {
    ;(ams as any).routes.push(makeRoute('wolf', 0))
    ;(ams as any).routes.push(makeRoute('bear', 0.5))
    ;(ams as any).routes.push(makeRoute('elk', 1))
    const routes = ams.getActiveRoutes()
    expect(routes).toHaveLength(3)
    expect(routes[0].species).toBe('wolf')
    expect(routes[1].species).toBe('bear')
    expect(routes[2].species).toBe('elk')
  })

  it('路由包含正确的 progress 值', () => {
    ;(ams as any).routes.push(makeRoute('deer', 0.7))
    expect(ams.getActiveRoutes()[0].progress).toBe(0.7)
  })

  it('路由包含正确的 entityIds', () => {
    const r = makeRoute('fox')
    r.entityIds = [10, 20, 30, 40]
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].entityIds).toHaveLength(4)
    expect(ams.getActiveRoutes()[0].entityIds[0]).toBe(10)
  })

  it('路由包含季节信息', () => {
    const r = makeRoute('salmon')
    r.season = Season.Autumn
    ;(ams as any).routes.push(r)
    expect(ams.getActiveRoutes()[0].season).toBe(Season.Autumn)
  })

  it('路由包含正确的坐标', () => {
    const r = makeRoute('goose')
    r.fromX = 50; r.fromY = 80
    r.toX = 150; r.toY = 20
    ;(ams as any).routes.push(r)
    const route = ams.getActiveRoutes()[0]
    expect(route.fromX).toBe(50)
    expect(route.fromY).toBe(80)
    expect(route.toX).toBe(150)
    expect(route.toY).toBe(20)
  })
})

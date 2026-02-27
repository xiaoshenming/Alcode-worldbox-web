import { describe, it, expect, beforeEach } from 'vitest'
import { TerraformingSystem } from '../systems/TerraformingSystem'
import { TileType } from '../utils/Constants'
function makeSys() { return new TerraformingSystem() }
describe('TerraformingSystem', () => {
  let sys: TerraformingSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveEffects初始为空', () => { expect(sys.getActiveEffects()).toHaveLength(0) })
  it('注入后getActiveEffects返回数据', () => {
    ;(sys as any).effects.push({ id: 1, type: 'raise', x: 0, y: 0, radius: 3, duration: 10, tick: 0 })
    expect(sys.getActiveEffects()).toHaveLength(1)
  })
  it('addEffect 后 getActiveEffects 增加', () => {
    sys.addEffect(5, 5, TileType.GRASS, TileType.FOREST, 'grow')
    expect(sys.getActiveEffects()).toHaveLength(1)
  })
  it('同位置 addEffect 不重复添加', () => {
    sys.addEffect(5, 5, TileType.GRASS, TileType.FOREST, 'grow')
    sys.addEffect(5, 5, TileType.GRASS, TileType.MOUNTAIN, 'erode')
    expect(sys.getActiveEffects()).toHaveLength(1)
  })
})

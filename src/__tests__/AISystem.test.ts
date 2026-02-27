import { describe, it, expect } from 'vitest'
// AISystem 需要多个依赖（EntityManager/World/ParticleSystem/CreatureFactory/SpatialHashSystem），验证模块可导入
describe('AISystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/AISystem')
    expect(mod.AISystem).toBeDefined()
  })
})

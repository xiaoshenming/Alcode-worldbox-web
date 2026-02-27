import { describe, it, expect } from 'vitest'
// CombatSystem 需要多个依赖，验证模块可导入
describe('CombatSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/CombatSystem')
    expect(mod.CombatSystem).toBeDefined()
  })
})

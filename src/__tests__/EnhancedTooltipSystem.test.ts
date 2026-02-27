import { describe, it, expect } from 'vitest'
// EnhancedTooltipSystem 依赖 DOM (document.createElement)，在 node 环境下跳过实例化测试
describe('EnhancedTooltipSystem', () => {
  it('模块可以导入', async () => {
    // 仅验证模块可以被导入，不实例化（需要 DOM）
    const mod = await import('../systems/EnhancedTooltipSystem')
    expect(mod.EnhancedTooltipSystem).toBeDefined()
  })
})

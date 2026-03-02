import { describe, it, expect, vi } from 'vitest'
import { DiplomaticEntenteSystem } from '../systems/DiplomaticEntenteSystem'

describe('debug', () => {
  it('duration test', () => {
    const sys = new DiplomaticEntenteSystem()
    const t = { id: 1, civIdA: 1, civIdB: 2, level: 'cordial' as const, mutualTrust: 40, cooperationDepth: 30, sharedInterests: 35, informalBonds: 20, duration: 0, tick: 0 }
    ;(sys as any).treaties.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    console.log('before lastCheck:', (sys as any).lastCheck)
    console.log('before duration:', (sys as any).treaties[0].duration)
    sys.update(1, {} as any, {} as any, 2350)
    console.log('after lastCheck:', (sys as any).lastCheck)
    console.log('after duration:', (sys as any).treaties[0]?.duration)
    console.log('treaties length:', (sys as any).treaties.length)
    vi.restoreAllMocks()
  })
})

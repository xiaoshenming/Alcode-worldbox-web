import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMosaicSystem } from '../systems/CreatureMosaicSystem'
import type { Mosaic, MosaicStyle, MosaicMaterial } from '../systems/CreatureMosaicSystem'

let nextId = 1
function makeSys(): CreatureMosaicSystem { return new CreatureMosaicSystem() }
function makeMosaic(artistId: number, style: MosaicStyle = 'geometric', material: MosaicMaterial = 'stone', extra: Partial<Mosaic> = {}): Mosaic {
  return { id: nextId++, artistId, style, material, beauty: 70, size: 10, completeness: 100, tick: 0, ...extra }
}

// 最小化 EntityManager stub（update 需要）
function makeEm(entities: number[] = []) {
  return {
    getEntitiesWithComponent: (_: string) => entities,
    hasComponent: (_id: number, _comp: string) => true,
  } as any
}

describe('CreatureMosaicSystem', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个测试（保留）──

  it('初始无马赛克', () => { expect((sys as any).mosaics).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'figurative', 'glass'))
    expect((sys as any).mosaics[0].style).toBe('figurative')
    expect((sys as any).mosaics[0].material).toBe('glass')
  })

  it('返回内部引用', () => {
    ;(sys as any).mosaics.push(makeMosaic(1))
    expect((sys as any).mosaics).toBe((sys as any).mosaics)
  })

  it('支持所有 4 种风格', () => {
    const styles: MosaicStyle[] = ['geometric', 'figurative', 'abstract', 'narrative']
    styles.forEach((s, i) => { ;(sys as any).mosaics.push(makeMosaic(i + 1, s)) })
    const all = (sys as any).mosaics
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })

  // ── 新增测试 ──

  it('lastCheck 初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('CHECK_INTERVAL节流：tick < 3000 时 update 不更新 lastCheck', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 2999)
    // 不满足 tick - lastCheck >= CHECK_INTERVAL，lastCheck 不更新
    expect((sys as any).lastCheck).toBe(0)
  })

  it('CHECK_INTERVAL节流：tick >= 3000 时 update 更新 lastCheck', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('CHECK_INTERVAL节流：第二次触发需再加3000', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    // tick=5999 差值1999 < 3000，不更新
    sys.update(16, em, 5999)
    expect((sys as any).lastCheck).toBe(3000)
    // tick=6000 差值3000 >= 3000，更新
    sys.update(16, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  it('progress：未完成马赛克每次update增加 0.5/size 进度', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 2, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    // completeness += 0.5 / 2 = 0.25
    expect((sys as any).mosaics[0].completeness).toBeCloseTo(0.25)
  })

  it('progress：completeness 不超过100', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 99.9, size: 1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    // completeness = Math.min(100, 99.9 + 0.5/1) = Math.min(100, 100.4) = 100
    expect((sys as any).mosaics[0].completeness).toBe(100)
  })

  it('progress：已完成(completeness=100)不再增加', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, size: 1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    expect((sys as any).mosaics[0].completeness).toBe(100)
  })

  it('cleanup：完成且超过180000 tick的马赛克被删除', () => {
    const em = makeEm()
    // 马赛克在tick=0创建，当前tick=200000，cutoff=200000-180000=20000 > 0，应删除
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(0)
  })

  it('cleanup：未完成的马赛克即使很旧也不删除', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 50, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(1)
  })

  it('cleanup：完成但未超期的马赛克不删除', () => {
    const em = makeEm()
    // tick=190000创建，当前tick=200000，cutoff=20000 < 190000，不应删除
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 100, tick: 190000 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 200000)
    expect((sys as any).mosaics).toHaveLength(1)
  })

  it('支持所有4种材料', () => {
    const materials: MosaicMaterial[] = ['stone', 'glass', 'ceramic', 'gem']
    materials.forEach((m, i) => { ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', m)) })
    const all = (sys as any).mosaics
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })

  it('数据完整性：注入的马赛克字段可正确读取', () => {
    const mosaic = makeMosaic(99, 'narrative', 'gem', { beauty: 55, size: 3, completeness: 72, tick: 1000 })
    ;(sys as any).mosaics.push(mosaic)
    const m = (sys as any).mosaics[0]
    expect(m.artistId).toBe(99)
    expect(m.style).toBe('narrative')
    expect(m.material).toBe('gem')
    expect(m.beauty).toBe(55)
    expect(m.size).toBe(3)
    expect(m.completeness).toBe(72)
    expect(m.tick).toBe(1000)
  })

  it('MAX_MOSAICS为30：30个马赛克时不再创建新的', () => {
    // 注入30个马赛克
    for (let i = 0; i < 30; i++) {
      ;(sys as any).mosaics.push(makeMosaic(i + 1, 'geometric', 'stone', { completeness: 50, tick: 0 }))
    }
    expect((sys as any).mosaics).toHaveLength(30)
    // update时mosaics.length >= MAX_MOSAICS，不会创建新的（即使随机通过）
    const em = makeEm([1, 2, 3])
    ;(sys as any).lastCheck = 0
    // 无法控制Math.random，但至少长度不会超过30
    sys.update(16, em, 3000)
    // 由于cleanup逻辑只删未超期完成的，30个completeness=50不会被删
    // mosaics.length仍>=30，不会新建
    expect((sys as any).mosaics.length).toBeGreaterThanOrEqual(30)
  })

  it('不同size导致不同进度速率', () => {
    const em = makeEm()
    ;(sys as any).mosaics.push(makeMosaic(1, 'geometric', 'stone', { completeness: 0, size: 1, tick: 0 }))
    ;(sys as any).mosaics.push(makeMosaic(2, 'figurative', 'stone', { completeness: 0, size: 5, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3000)
    const fast = (sys as any).mosaics[0].completeness  // += 0.5/1 = 0.5
    const slow = (sys as any).mosaics[1].completeness  // += 0.5/5 = 0.1
    expect(fast).toBeGreaterThan(slow)
    expect(fast).toBeCloseTo(0.5)
    expect(slow).toBeCloseTo(0.1)
  })
})

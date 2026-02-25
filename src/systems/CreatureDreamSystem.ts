/**
 * CreatureDreamSystem - 生物做梦系统 (v2.01)
 *
 * 生物在睡眠时会产生梦境，梦境内容基于其经历和状态。
 * 醒来后梦境效果影响行为和情绪（心情、警觉、感知、社交、勇气）。
 * 通过 markSleeping / markAwake 控制生物睡眠状态，
 * 也可在 update 中传入 EntityManager 自动检测（AI idle + 低生命值视为休息）。
 */

import { EntityManager } from '../ecs/Entity'

/** 梦境类型 */
const enum DreamType {
  /** 和平梦 — 增加心情 */
  Peaceful = 0,
  /** 噩梦 — 降低心情但增加警觉 */
  Nightmare = 1,
  /** 预言梦 — 临时感知加成 */
  Prophetic = 2,
  /** 回忆梦 — 强化社交倾向 */
  Memory = 3,
  /** 冒险梦 — 增加勇气 */
  Adventure = 4,
}

/** 梦境效果键 */
type DreamEffectKey = 'mood' | 'alertness' | 'perception' | 'sociability' | 'courage'

/** 梦境效果：醒来后应用的 buff/debuff */
interface DreamEffect {
  key: DreamEffectKey
  /** 效果强度，正值为 buff，负值为 debuff */
  value: number
  /** 效果剩余持续 tick 数 */
  remaining: number
}

/** 单次梦境状态 */
interface DreamState {
  dreamType: DreamType
  /** 梦境强度 0-1 */
  intensity: number
  /** 梦境已持续 tick 数 */
  elapsed: number
  /** 梦境总持续 tick 数 */
  duration: number
  /** 醒来后应用的效果 */
  effects: DreamEffect[]
}

/** 梦境历史记录 */
interface DreamRecord {
  dreamType: DreamType
  intensity: number
  /** 梦境结束时的 tick */
  endTick: number
}

/** 每种梦境类型的权重和效果配置 */
interface DreamConfig {
  weight: number
  effectKey: DreamEffectKey
  effectValue: number
  /** 效果持续 tick 数 */
  effectDuration: number
  /** 额外效果（如噩梦同时降低心情） */
  secondaryKey?: DreamEffectKey
  secondaryValue?: number
}

const DREAM_CONFIGS: Record<number, DreamConfig> = {
  [DreamType.Peaceful]:  { weight: 35, effectKey: 'mood',        effectValue:  0.3,  effectDuration: 600 },
  [DreamType.Nightmare]: { weight: 15, effectKey: 'alertness',   effectValue:  0.4,  effectDuration: 400, secondaryKey: 'mood', secondaryValue: -0.2 },
  [DreamType.Prophetic]: { weight: 10, effectKey: 'perception',  effectValue:  0.5,  effectDuration: 300 },
  [DreamType.Memory]:    { weight: 25, effectKey: 'sociability', effectValue:  0.3,  effectDuration: 500 },
  [DreamType.Adventure]: { weight: 15, effectKey: 'courage',     effectValue:  0.35, effectDuration: 450 },
}

/** 梦境最短/最长持续 tick */
const MIN_DREAM_DURATION = 60
const MAX_DREAM_DURATION = 200
/** 最大历史记录数 */
const MAX_DREAM_HISTORY = 8
/** 效果衰减后的最小阈值 */
const EFFECT_EPSILON = 0.01
/** 自动检测睡眠的生命值阈值 */
const SLEEP_HEALTH_THRESHOLD = 20

/** 梦境类型名称（用于调试/UI） */
const DREAM_TYPE_NAMES: Record<number, string> = {
  [DreamType.Peaceful]:  '和平',
  [DreamType.Nightmare]: '噩梦',
  [DreamType.Prophetic]: '预言',
  [DreamType.Memory]:    '回忆',
  [DreamType.Adventure]: '冒险',
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** 基于权重的随机选择 */
function weightedRandom(configs: Record<number, DreamConfig>): DreamType {
  let total = 0
  const keys = Object.keys(configs)
  for (let i = 0; i < keys.length; i++) {
    total += configs[Number(keys[i])].weight
  }
  let roll = Math.random() * total
  for (let i = 0; i < keys.length; i++) {
    const k = Number(keys[i])
    roll -= configs[k].weight
    if (roll <= 0) return k as DreamType
  }
  return DreamType.Peaceful
}

/** 生物做梦数据容器 */
interface CreatureDreamData {
  /** 当前是否在睡眠 */
  sleeping: boolean
  /** 当前梦境（null 表示无梦/深度睡眠） */
  current: DreamState | null
  /** 醒来后的活跃效果 */
  activeEffects: DreamEffect[]
  /** 历史梦境记录 */
  history: DreamRecord[]
}

/**
 * 生物做梦系统
 *
 * 管理生物的睡眠梦境生成、梦境演进和醒来后的效果应用。
 * 组件只存数据，系统只存逻辑，遵循 ECS 纪律。
 *
 * @example
 * ```ts
 * const dreamSys = new CreatureDreamSystem();
 * dreamSys.markSleeping(entityId);
 * // 游戏循环中
 * dreamSys.update(dt, entityManager);
 * const state = dreamSys.getDreamState(entityId);
 * ```
 */
export class CreatureDreamSystem {
  private data = new Map<number, CreatureDreamData>()
  private tickCounter = 0

  /* ── 公共 API ── */

  /** 标记生物进入睡眠 */
  markSleeping(entityId: number): void {
    const d = this.ensureData(entityId)
    d.sleeping = true
  }

  /** 标记生物醒来，结算当前梦境效果 */
  markAwake(entityId: number): void {
    const d = this.data.get(entityId)
    if (!d || !d.sleeping) return
    d.sleeping = false
    this.finishDream(d, entityId)
  }

  /** 获取生物当前梦境状态，未睡眠或无梦时返回 null */
  getDreamState(entityId: number): Readonly<DreamState> | null {
    return this.data.get(entityId)?.current ?? null
  }

  /** 获取生物最近的梦境历史记录 */
  getRecentDreams(entityId: number): readonly DreamRecord[] {
    return this.data.get(entityId)?.history ?? []
  }

  /** 获取生物当前活跃的梦境效果 */
  getActiveEffects(entityId: number): readonly DreamEffect[] {
    return this.data.get(entityId)?.activeEffects ?? []
  }

  /** 查询某个效果的当前值（无效果返回 0） */
  getEffectValue(entityId: number, key: DreamEffectKey): number {
    const d = this.data.get(entityId)
    if (!d) return 0
    for (let i = 0; i < d.activeEffects.length; i++) {
      if (d.activeEffects[i].key === key) return d.activeEffects[i].value
    }
    return 0
  }

  /** 获取梦境类型的中文名称 */
  getDreamTypeName(dreamType: DreamType): string {
    return DREAM_TYPE_NAMES[dreamType] ?? '未知'
  }

  /** 清除已死亡实体的数据 */
  removeEntity(entityId: number): void {
    this.data.delete(entityId)
  }

  /* ── 更新 ── */

  /**
   * 每 tick 更新梦境系统
   *
   * @param dt - delta tick（通常为 1）
   * @param entityManager - 实体管理器，用于自动检测睡眠状态（可选）
   */
  update(dt: number, entityManager?: EntityManager): void {
    this.tickCounter += dt

    // 自动检测睡眠（AI idle + 低生命值）
    if (entityManager) {
      this.autoDetectSleep(entityManager)
    }

    // 更新所有生物的梦境
    this.data.forEach((d, entityId) => {
      // 睡眠中：推进或生成梦境
      if (d.sleeping) {
        if (d.current) {
          d.current.elapsed += dt
          // 梦境强度随时间先升后降（抛物线）
          const progress = d.current.elapsed / d.current.duration
          d.current.intensity = clamp(4 * progress * (1 - progress), 0, 1)

          if (d.current.elapsed >= d.current.duration) {
            this.finishDream(d, entityId)
            // 有概率连续做梦
            if (Math.random() < 0.3) {
              this.startDream(d)
            }
          }
        } else {
          // 没有梦境，概率开始做梦
          if (Math.random() < 0.02 * dt) {
            this.startDream(d)
          }
        }
      }

      // 衰减活跃效果
      for (let i = d.activeEffects.length - 1; i >= 0; i--) {
        const eff = d.activeEffects[i]
        eff.remaining -= dt
        if (eff.remaining <= 0) {
          d.activeEffects[i] = d.activeEffects[d.activeEffects.length - 1]
          d.activeEffects.pop()
        }
      }

      // 清理无数据的实体
      if (!d.sleeping && d.activeEffects.length === 0 && d.history.length === 0 && !d.current) {
        this.data.delete(entityId)
      }
    })
  }

  /* ── 内部 ── */

  private ensureData(entityId: number): CreatureDreamData {
    let d = this.data.get(entityId)
    if (!d) {
      d = { sleeping: false, current: null, activeEffects: [], history: [] }
      this.data.set(entityId, d)
    }
    return d
  }

  private startDream(d: CreatureDreamData): void {
    const dreamType = weightedRandom(DREAM_CONFIGS)
    const config = DREAM_CONFIGS[dreamType]
    const duration = MIN_DREAM_DURATION + Math.floor(Math.random() * (MAX_DREAM_DURATION - MIN_DREAM_DURATION))

    const effects: DreamEffect[] = [
      { key: config.effectKey, value: config.effectValue, remaining: config.effectDuration },
    ]
    if (config.secondaryKey !== undefined && config.secondaryValue !== undefined) {
      effects.push({ key: config.secondaryKey, value: config.secondaryValue, remaining: config.effectDuration })
    }

    d.current = {
      dreamType,
      intensity: 0,
      elapsed: 0,
      duration,
      effects,
    }
  }

  private finishDream(d: CreatureDreamData, _entityId: number): void {
    if (!d.current) return

    const dream = d.current
    // 效果强度受梦境实际强度调制
    const peakIntensity = clamp(dream.intensity + 0.2, 0, 1)
    for (let i = 0; i < dream.effects.length; i++) {
      const eff = dream.effects[i]
      const scaled: DreamEffect = {
        key: eff.key,
        value: eff.value * peakIntensity,
        remaining: eff.remaining,
      }
      if (Math.abs(scaled.value) > EFFECT_EPSILON) {
        d.activeEffects.push(scaled)
      }
    }

    // 记录历史
    d.history.push({
      dreamType: dream.dreamType,
      intensity: peakIntensity,
      endTick: this.tickCounter,
    })
    if (d.history.length > MAX_DREAM_HISTORY) {
      d.history.shift()
    }

    d.current = null
  }

  private autoDetectSleep(em: EntityManager): void {
    const aiEntities = em.getEntitiesWithComponent('ai')
    for (let i = 0; i < aiEntities.length; i++) {
      const id = aiEntities[i]
      const ai = em.getComponent<{ type: string; state: string }>(id, 'ai')
      const needs = em.getComponent<{ type: string; health: number }>(id, 'needs')
      if (!ai || !needs) continue

      const isSleeping = ai.state === 'idle' && needs.health < SLEEP_HEALTH_THRESHOLD
      const d = this.data.get(id)

      if (isSleeping && (!d || !d.sleeping)) {
        this.markSleeping(id)
      } else if (!isSleeping && d?.sleeping) {
        this.markAwake(id)
      }
    }
  }
}

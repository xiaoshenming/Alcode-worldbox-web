import { EntityManager } from '../ecs/Entity'

/**
 * Prune entries from a Map whose keys are entity IDs that no longer
 * have the specified component (i.e. the entity has died / been removed).
 *
 * Extracted from 96 system implementations that all contained:
 *   if (tick % 3600 === 0 && map.size > 0) {
 *     for (const id of map.keys()) {
 *       if (!em.hasComponent(id, 'creature')) map.delete(id)
 *     }
 *   }
 *
 * @param map       - The entity-keyed Map to prune
 * @param em        - EntityManager instance
 * @param component - Component type to check (e.g. 'creature')
 * @param tick      - Current simulation tick
 * @param interval  - How often to run the prune (default: 3600)
 */
export function pruneDeadEntities<T>(
  map: Map<number, T>,
  em: EntityManager,
  component: string,
  tick: number,
  interval = 3600,
): void {
  if (tick % interval !== 0 || map.size === 0) return
  for (const id of map.keys()) {
    if (!em.hasComponent(id, component)) map.delete(id)
  }
}

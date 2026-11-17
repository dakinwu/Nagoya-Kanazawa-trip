import type { StorePlace } from "./store-data";

/** Group projected visible points into fixed-size screen cells in one pass. */
export function clusterStores(stores: StorePlace[], project: (store: StorePlace) => { x: number; y: number }, cellSize = 64) {
  const groups = new Map<string, StorePlace[]>();
  for (const store of stores) {
    const point = project(store);
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const group = groups.get(key);
    if (group) group.push(store);
    else groups.set(key, [store]);
  }
  return [...groups.values()];
}

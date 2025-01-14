import { existsSync, mkdirSync } from "fs"
import { readdir } from "fs/promises"
import { resolve } from "path"

/**
 * Ensures a path exists by creating its parent directories and then itself
 * @param {String} dir Path to a folder that may or may not exist
 */
export function ensurePathExists(dir: string) {
  const normalized = dir.replace(/\\/g, '/')
  const parts = normalized.split('/')
  let builder = ''
  for (let i = 0; i < parts.length; i++) {
    const dirPart = parts[i]
    builder += dirPart + '/'
    if (!existsSync(builder)) {
      mkdirSync(builder)
    }
  }
}

export async function getFiles(dir: string) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files: any[] = await Promise.all(dirents.map((dirent: any) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

export function deduplicateAddFields<T>(to: T[], from: T[], keys: (keyof (T))[]) {
  for (const obj of from) {
    const existing = to.find(o => matcher(o, obj, keys))
    if (existing) continue
    to.push(obj)
  }
}

export function upsertFields<T>(to: T[], from: T[], keys: (keyof (T))[], spliceIndexFn?: () => number) {
  for (const obj of from) {
    const existingIndex = to.findIndex(o => matcher(o, obj, keys))
    if (existingIndex === -1) {
      if (spliceIndexFn){
        const chosenIndex = spliceIndexFn()
        to.splice(chosenIndex, 0, obj)
      } else {
        to.push(obj)
      }
      continue
    }
    to.splice(existingIndex, 1, obj)
  }
}

export function findMissingItems<T>(superlist: T[], list: T[], keys: (keyof (T))[]) {
  const missing = []
  for (const obj of list) {
    const existing = superlist.find(o => matcher(o, obj, keys))
    if (existing) continue
    missing.push(obj)
  }
  return missing
}

export function matcher<T>(item1: T, item2: T, keys: (keyof (T))[]) {
  for (const key of keys) {
    if (item1[key] !== item2[key]) {
      return false
    }
  }
  return true
}
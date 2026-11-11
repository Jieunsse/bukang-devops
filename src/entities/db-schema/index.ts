import data from './data/schema.json'
import type { DbSchema } from './model/types'

export const dbSchema = data as DbSchema
export { groupByService, type DbTableGroup } from './lib/group'
export type { DbColumn, DbIndex, DbSchema, DbTable } from './model/types'

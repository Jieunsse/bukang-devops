import data from './data/schema.json'
import type { DbSchema } from './model/types'

export const dbSchema = data as DbSchema
export { ERD_ROW_HEIGHT, ERD_TABLE_WIDTH, layoutErd, type ErdLayout } from './lib/erd'
export { groupByService, type DbTableGroup } from './lib/group'
export type { DbColumn, DbForeignKey, DbIndex, DbSchema, DbTable } from './model/types'

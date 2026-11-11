/** scripts/dump-db-schema.mjs가 쓰는 schema.json의 모양 */
export type DbColumn = {
  name: string
  type: string
  nullable: boolean
  /** PRI 기본 키, UNI 유일 키, MUL 인덱스 첫 컬럼, 빈 문자열은 키 아님 */
  key: string
  default: string | null
  extra: string
  comment: string
}

export type DbIndex = { name: string; unique: boolean; columns: string[] }

export type DbTable = { name: string; comment: string; columns: DbColumn[]; indexes: DbIndex[] }

export type DbSchema = { database: string; dumpedAt: string; tables: DbTable[] }

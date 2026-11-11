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

/** 이 테이블의 column이 refTable.refColumn을 가리키는 외래 키 */
export type DbForeignKey = { name: string; column: string; refTable: string; refColumn: string }

export type DbTable = {
  name: string
  comment: string
  columns: DbColumn[]
  indexes: DbIndex[]
  foreignKeys: DbForeignKey[]
}

export type DbSchema = { database: string; dumpedAt: string; tables: DbTable[] }

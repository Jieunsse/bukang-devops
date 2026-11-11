import { dbSchema, groupByService } from '@/entities/db-schema'
import { DbSchemaView } from '@/widgets/db-schema'

// 스키마 JSON을 서버에서만 읽어, 브라우저 번들에 통째로 넣지 않는다.
export default function DbPage() {
  return (
    <DbSchemaView
      database={dbSchema.database}
      dumpedAt={dbSchema.dumpedAt}
      groups={groupByService(dbSchema.tables)}
    />
  )
}

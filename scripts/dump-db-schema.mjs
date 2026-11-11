// 운영 서버 MySQL에서 테이블 구조만 읽어 src/entities/db-schema/data/schema.json에 쓴다.
// 데이터 행은 읽지 않고 information_schema만 조회한다. 비밀번호는 서버 컨테이너의 환경변수를 그대로 쓴다.
// 사용법: node scripts/dump-db-schema.mjs [ssh 별칭, 기본 team05]
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const host = process.argv[2] ?? 'team05'
const DB = 'bukang-db'

/** mysql -B 결과(탭 구분, 첫 줄 머리)를 객체 배열로 바꾼다. NULL은 null로 둔다. */
function query(sql) {
  const remote = `docker exec ${DB} sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -B -e "$0"' ${JSON.stringify(sql)}`
  const out = execFileSync('ssh', ['-o', 'ConnectTimeout=10', host, remote], { encoding: 'utf8' })
  const [head, ...rows] = out.trimEnd().split('\n')
  const keys = head.split('\t')
  // 한 번에 바꿔야 원래 글자 「\n」(백슬래시+n)이 줄바꿈으로 바뀌지 않는다.
  const unescape = (v) =>
    v === 'NULL' ? null : v.replace(/\\(.)/g, (_, ch) => ({ t: '\t', n: '\n', 0: '\0' })[ch] ?? ch)
  return rows.map((r) => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], unescape(v)])))
}

const where = `table_schema='${DB}'`
const tables = query(
  `SELECT table_name AS name, table_comment AS comment FROM information_schema.tables WHERE ${where} ORDER BY table_name`,
)
const columns = query(
  `SELECT table_name AS t, column_name AS name, column_type AS type, is_nullable AS nullable, column_key AS colKey, column_default AS dflt, extra AS extra, column_comment AS comment FROM information_schema.columns WHERE ${where} ORDER BY table_name, ordinal_position`,
)
const indexes = query(
  `SELECT table_name AS t, index_name AS name, non_unique AS nonUnique, column_name AS col FROM information_schema.statistics WHERE ${where} ORDER BY table_name, index_name, seq_in_index`,
)

const schema = {
  database: DB,
  dumpedAt: new Date().toISOString(),
  tables: tables.map((t) => {
    const idx = new Map()
    for (const i of indexes.filter((i) => i.t === t.name)) {
      const cur = idx.get(i.name) ?? { name: i.name, unique: i.nonUnique === '0', columns: [] }
      cur.columns.push(i.col)
      idx.set(i.name, cur)
    }
    return {
      name: t.name,
      comment: t.comment || '',
      columns: columns
        .filter((c) => c.t === t.name)
        .map((c) => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable === 'YES',
          key: c.colKey || '',
          default: c.dflt,
          extra: c.extra || '',
          comment: c.comment || '',
        })),
      indexes: [...idx.values()],
    }
  }),
}

if (schema.tables.length === 0)
  throw new Error('테이블을 하나도 읽지 못했어요. DB 이름이나 접속을 확인해 주세요.')
writeFileSync(
  new URL('../src/entities/db-schema/data/schema.json', import.meta.url),
  JSON.stringify(schema, null, 2) + '\n',
)
console.log(`테이블 ${schema.tables.length}개를 저장했어요.`)

// glossary.ts의 PANELS에 없는 패널의 이름·도움말, 묶음 설명, 범례(시리즈) 이름 번역.

type Detail = { name: string; help: string }

export const DETAIL_PANELS: Record<string, Detail> = {
  // 서버(Node Exporter)
  CPU: {
    name: 'CPU 상태별 시간',
    help: 'CPU 시간을 System·User·Iowait·Steal 등 상태별로 나눈 비율이에요.',
  },
  'Network Saturation': {
    name: '네트워크 포화도',
    help: '장치 최대 속도 대비 사용 비율이에요. 100%에 가까우면 대역폭이 모자라요.',
  },
  'Disk Throughput': {
    name: '디스크 처리량',
    help: '디스크 장치별로 초당 읽고 쓴 데이터 양이에요.',
  },
  'Filesystem Space Available': {
    name: '디스크 남은 공간',
    help: '위치별 남은 공간이에요. 0에 가까워지면 쓰기가 실패해요.',
  },
  'Filesystem Used': {
    name: '디스크 사용량',
    help: '위치별로 쓰고 있는 공간이에요. 크기에 가까워지면 정리해요.',
  },
  'Disk I/O Utilization': {
    name: '디스크 I/O 사용률',
    help: '디스크가 I/O를 처리한 시간 비율이에요. 100%에 가까우면 병목이에요.',
  },
  'Pressure Stall Information': {
    name: '자원 대기 빈도',
    help: '작업이 CPU·메모리·I/O를 기다린 시간 비율이에요. Full이 0보다 크면 확인해요.',
  },
  'Memory Committed': {
    name: '메모리 약속량',
    help: '프로세스에 약속한 메모리예요. 한도를 넘으면 OOM Killer가 작동할 수 있어요.',
  },
  'Memory Writeback and Dirty': {
    name: '디스크 쓰기 대기 메모리',
    help: '디스크에 아직 쓰지 않은 메모리예요. 계속 늘면 디스크 쓰기가 밀린 거예요.',
  },
  'Memory Anonymous': {
    name: '익명 메모리',
    help: '파일과 연결되지 않은 메모리예요. 프로그램이 직접 쓰는 heap·stack이 여기에 들어가요.',
  },
  'Memory Shared and Mapped': {
    name: '공유·매핑 메모리',
    help: '파일을 메모리에 올린 양과 프로세스가 함께 쓰는 메모리예요.',
  },
  'Memory LRU Active / Inactive (%)': {
    name: '최근 쓴 메모리 비율',
    help: '최근 쓴 메모리(Active)와 오래 안 쓴 메모리(Inactive) 비율이에요. 모자라면 Inactive부터 회수해요.',
  },
  'Memory LRU Active / Inactive Detail': {
    name: '최근 쓴 메모리 상세',
    help: 'Active·Inactive 메모리를 파일 기반과 익명으로 나눈 양이에요.',
  },
  'Memory Slab': {
    name: '커널 slab 메모리',
    help: '커널이 자기 객체를 담는 메모리예요. 회수 못 하는 쪽이 계속 늘면 확인해요.',
  },
  'Memory Vmalloc': {
    name: 'Vmalloc 영역',
    help: '커널이 가상 주소로 잡은 영역의 전체·사용량·가장 큰 빈 덩어리예요.',
  },
  'Memory Kernel / CPU': {
    name: '커널 스택·CPU별 메모리',
    help: '스레드별 커널 스택과 CPU별로 잡은 메모리예요.',
  },
  'Memory DirectMap': {
    name: 'DirectMap 메모리',
    help: '커널이 1G·2M·4K 페이지 크기별로 직접 연결한 메모리 양이에요.',
  },
  'Memory Unevictable and MLocked': {
    name: '고정된 메모리',
    help: '스왑으로 내보낼 수 없게 RAM에 고정된 메모리예요.',
  },
  'Memory HugePages': {
    name: 'HugePages 메모리',
    help: '큰 페이지로 미리 잡은 메모리의 전체·사용·예약 양이에요.',
  },
  'Memory Zswap': {
    name: 'Zswap 압축 메모리',
    help: '스왑할 페이지를 RAM 안에서 압축해 둔 크기와 압축 전 크기예요.',
  },
  'Memory Pages In / Out': {
    name: '페이지 입출력',
    help: '블록 장치에서 읽어 오고 내보낸 페이지의 초당 양이에요.',
  },
  'Memory Pages Swap In / Out': {
    name: '스왑 입출력',
    help: '스왑에서 불러오고 내보낸 페이지의 초당 양이에요. 계속 0이 아니면 메모리가 모자란 거예요.',
  },
  'Memory Page Faults': {
    name: '페이지 폴트',
    help: '필요한 페이지가 메모리에 없던 초당 횟수예요. major가 늘면 디스크를 읽느라 느려져요.',
  },
  'OOM Killer': {
    name: 'OOM Killer 작동',
    help: '메모리 부족으로 프로세스가 강제 종료된 횟수예요. 0이어야 좋아요.',
  },
  'System Load': {
    name: '시스템 부하 추이',
    help: '1·5·15분 평균 부하와 CPU 코어 수예요. 부하가 코어 수를 넘으면 작업이 밀려요.',
  },
  'Processes Status': {
    name: '프로세스 상태',
    help: '실행 대기 중인 프로세스와 I/O로 막힌 프로세스 수예요. 막힌 수가 늘면 디스크를 확인해요.',
  },
  'Processes Detailed States': {
    name: '상태별 프로세스 수',
    help: '프로세스를 실행·대기·좀비 등 상태별로 센 값이에요. 좀비가 쌓이면 확인해요.',
  },
  'Processes Forks': {
    name: '프로세스 생성 속도',
    help: '새 프로세스가 초당 몇 개 만들어지는지예요. 갑자기 늘면 확인해요.',
  },
  'PIDs Number and Limit': {
    name: 'PID 수와 한도',
    help: '실행 중인 프로세스 ID 수와 최대치예요. 한도에 닿으면 새 프로세스를 못 만들어요.',
  },
  'Threads Number and Limit': {
    name: '스레드 수와 한도',
    help: '서버 전체 스레드 수와 최대치예요. 한도에 닿으면 새 스레드를 못 만들어요.',
  },
  'File Descriptor': {
    name: '열린 파일 수와 한도',
    help: '서버 전체가 연 파일 수와 최대치예요. 한도에 닿으면 새 연결을 못 받아요.',
  },
  'Context Switches / Interrupts': {
    name: '작업 전환·인터럽트',
    help: '초당 작업 전환 횟수와 하드웨어 인터럽트 횟수예요. 갑자기 늘면 CPU 부담이 커져요.',
  },
  'CPU Saturation per Core': {
    name: '코어별 CPU 포화도',
    help: '코어마다 실행 중인 작업과 대기 중인 작업이에요. 대기가 길면 CPU가 모자라요.',
  },
  'CPU Frequency Scaling': {
    name: 'CPU 클럭 변화',
    help: '코어별 현재 클럭과 최소·최대 클럭이에요.',
  },
  'CPU Schedule Timeslices': {
    name: 'CPU 스케줄 횟수',
    help: 'CPU별로 초당 실행된 스케줄링 타임슬라이스 횟수예요.',
  },
  'IRQ Detail': {
    name: 'IRQ 상세',
    help: '하드웨어 인터럽트를 종류와 장치별로 나눈 초당 횟수예요.',
  },
  Entropy: {
    name: '엔트로피',
    help: '난수를 만들 때 쓰는 무작위성 양이에요. 0에 가까우면 암호 관련 작업이 느려져요.',
  },
  'Hardware Temperature Monitor': {
    name: '하드웨어 온도',
    help: '센서별 온도와 경고 기준이에요. 기준에 가까우면 냉각을 확인해요.',
  },
  'Cooling Device Utilization': {
    name: '냉각 장치 사용률',
    help: '팬 같은 냉각 장치가 얼마나 세게 돌고 있는지예요.',
  },
  'Hardware Fan Speed': {
    name: '팬 속도',
    help: '팬의 현재 RPM이에요. 최소 RPM 아래면 팬을 확인해요.',
  },
  'CPU Throttling': {
    name: 'CPU 열 제한',
    help: '열 때문에 CPU 속도를 낮춘 횟수예요. 0이어야 좋아요.',
  },
  'Time Synchronized Drift': {
    name: '시계 오차',
    help: '시스템 시계의 예상·최대 오차예요. 커지면 시간 동기화를 확인해요.',
  },
  'Time PLL Adjust': {
    name: '시간 보정 상수',
    help: 'NTP가 시계를 맞출 때 쓰는 PLL 시간 상수예요.',
  },
  'Time Synchronized Status': {
    name: '시간 동기화 상태',
    help: '시계가 기준 서버와 맞춰졌는지(1이면 정상)와 보정 값이에요.',
  },
  'ECC Memory Errors': {
    name: 'ECC 메모리 오류',
    help: '메모리가 스스로 고친 오류와 못 고친 오류 수예요. 못 고친 오류는 0이어야 해요.',
  },
  'Power Supply Status': {
    name: '전원 공급 상태',
    help: '전원 장치가 켜져 있는지, 연결돼 있는지예요.',
  },
  'Systemd Units State': {
    name: 'systemd 유닛 상태',
    help: 'systemd 유닛을 상태별로 센 값이에요. Failed가 0이어야 좋아요.',
  },
  'Systemd Sockets Current': {
    name: 'systemd 소켓 연결 수',
    help: 'systemd 소켓별로 지금 열려 있는 연결 수예요.',
  },
  'Systemd Sockets Accepted': {
    name: 'systemd 소켓 수락',
    help: 'systemd 소켓이 초당 받아들인 연결 수예요.',
  },
  'Systemd Sockets Refused': {
    name: 'systemd 소켓 거부',
    help: 'systemd 소켓이 초당 거부한 연결 수예요. 0이어야 좋아요.',
  },
  'Disk Read/Write IOps': {
    name: '장치별 읽기·쓰기 횟수',
    help: '디스크 장치별로 초당 끝낸 읽기·쓰기 횟수예요.',
  },
  'Disk Read/Write Data': {
    name: '장치별 읽기·쓰기 양',
    help: '디스크 장치별로 초당 읽고 쓴 바이트 수예요.',
  },
  'Disk Average Wait Time': {
    name: '디스크 평균 대기 시간',
    help: '요청이 끝나기까지 걸린 평균 시간이에요. 길어지면 디스크가 느린 거예요.',
  },
  'Time Spent Doing I/Os': {
    name: 'I/O 처리 시간 비율',
    help: '디스크가 I/O를 처리한 시간 비율이에요. 100%에 가까우면 병목이에요.',
  },
  'Average Queue Size': {
    name: '평균 I/O 대기열',
    help: '처리를 기다리는 I/O 요청의 평균 개수예요. 계속 높으면 디스크가 병목이에요.',
  },
  'Instantaneous Queue Size': {
    name: '현재 I/O 진행 수',
    help: '지금 처리 중인 I/O 요청 개수예요.',
  },
  'Disk R/W Merged': {
    name: '병합된 읽기·쓰기',
    help: '디스크가 하나로 합쳐 처리한 읽기·쓰기 요청의 초당 수예요.',
  },
  'Disk Ops Discards / Flush': {
    name: 'TRIM·flush 횟수',
    help: '미사용 영역 정리(TRIM)와 쓰기 캐시 비우기(flush)의 초당 횟수예요.',
  },
  'Disk Sectors Discarded Successfully': {
    name: 'TRIM 처리 섹터',
    help: 'TRIM으로 정리한 디스크 섹터의 초당 수예요.',
  },
  'File Nodes Free': {
    name: '남은 inode 수',
    help: '위치별 남은 inode 수예요. 0에 가까우면 디스크가 남아도 새 파일을 못 만들어요.',
  },
  'Filesystem in ReadOnly / Error': {
    name: '읽기 전용·오류 상태',
    help: '1이면 읽기 전용이거나 장치 오류예요. 0이어야 좋아요.',
  },
  'File Nodes Size': { name: '전체 inode 수', help: '위치별로 쓸 수 있는 inode의 전체 수예요.' },
  'Network Traffic by Packets': {
    name: '패킷 수',
    help: '네트워크 장치별로 초당 받고 보낸 패킷 수예요.',
  },
  'Network Traffic Errors': {
    name: '패킷 오류',
    help: '장치별로 초당 생긴 패킷 오류 수예요. 0이어야 좋아요.',
  },
  'Network Traffic Drop': {
    name: '버려진 패킷',
    help: '장치별로 초당 버려진 패킷 수예요. 늘면 네트워크가 막힌 거예요.',
  },
  'Network Traffic NoHandler': {
    name: '처리기 없는 패킷',
    help: '받았지만 처리할 프로토콜이 없어 버린 패킷 수예요. 0이어야 좋아요.',
  },
  'Network Traffic Frame': {
    name: '프레임 오류',
    help: '받은 패킷의 프레임 오류 수예요. 케이블이나 장치 문제일 수 있어요.',
  },
  'Network Traffic Fifo': {
    name: 'FIFO 버퍼 넘침',
    help: '장치 버퍼가 넘쳐 놓친 패킷 수예요. 0이어야 좋아요.',
  },
  'Network Traffic Collision': {
    name: '패킷 충돌',
    help: '보낼 때 충돌이 난 초당 횟수예요. 0이어야 좋아요.',
  },
  'Network Traffic Carrier Errors': {
    name: '캐리어 오류',
    help: '보낼 때 신호가 끊긴 횟수예요. 케이블이나 장치를 확인해요.',
  },
  'Network Traffic Compressed': {
    name: '압축 패킷',
    help: '압축해서 받고 보낸 패킷의 초당 수예요.',
  },
  'Network Traffic Multicast': {
    name: '멀티캐스트 패킷',
    help: '장치별로 받은 멀티캐스트 패킷의 초당 수예요.',
  },
  'ARP Entries': {
    name: 'ARP 항목 수',
    help: '장치별 ARP 테이블 항목 수예요. 갑자기 늘면 확인해요.',
  },
  'NF Conntrack': {
    name: '연결 추적 수',
    help: '방화벽이 추적 중인 연결 수와 한도예요. 한도에 닿으면 새 연결이 버려져요.',
  },
  'Network Link Flaps': {
    name: '링크 끊김 횟수',
    help: '네트워크 연결이 끊겼다 붙은 횟수예요. 0이어야 좋아요.',
  },
  Speed: { name: '네트워크 속도', help: '장치가 보고한 최대 속도예요.' },
  MTU: { name: 'MTU', help: '장치가 한 번에 보낼 수 있는 패킷의 최대 크기(바이트)예요.' },
  'Sockstat TCP': {
    name: 'TCP socket 수',
    help: 'TCP socket을 할당·사용·고아·TIME_WAIT 상태별로 센 값이에요. 고아가 늘면 확인해요.',
  },
  'Sockstat UDP': { name: 'UDP socket 수', help: '사용 중인 UDP·UDPLite socket 수예요.' },
  'Sockstat Used': { name: '전체 socket 수', help: '서버 전체에서 사용 중인 socket 수예요.' },
  'Sockstat FRAG / RAW': { name: 'FRAG·RAW socket 수', help: '사용 중인 FRAG·RAW socket 수예요.' },
  'Sockstat Memory Size': {
    name: 'socket 메모리',
    help: '커널이 TCP·UDP·단편화에 쓰는 메모리예요. 계속 늘면 확인해요.',
  },
  'Sockstat Average Socket Memory': {
    name: 'socket당 평균 메모리',
    help: 'socket 하나가 쓰는 평균 메모리예요.',
  },
  'TCP/UDP Kernel Buffer Memory Pages': {
    name: 'socket 버퍼 페이지',
    help: '커널이 TCP·UDP socket에 쓰는 메모리를 페이지 수로 보여 줘요.',
  },
  'Softnet Packets': {
    name: '패킷 처리·버림',
    help: 'CPU별로 처리한 패킷과 버린 패킷이에요. 버림이 0보다 크면 확인해요.',
  },
  'Softnet Out of Quota': {
    name: '패킷 처리 한도 초과',
    help: '한 번에 처리할 양을 넘겨 다 처리하지 못한 횟수예요. 늘면 CPU가 모자란 거예요.',
  },
  'Softnet RPS': {
    name: 'RPS 깨움',
    help: '수신 패킷 분산(RPS) 때문에 CPU가 깨어난 횟수와 버린 패킷이에요.',
  },
  'Netstat IP In / Out Octets': {
    name: 'IP 주고받은 양',
    help: 'IP 계층에서 초당 받고 보낸 바이트 수예요.',
  },
  'TCP In / Out': { name: 'TCP 주고받은 양', help: '초당 받고 보낸 TCP 세그먼트 수예요.' },
  'UDP In / Out': { name: 'UDP 주고받은 양', help: '초당 받고 보낸 UDP 데이터그램 수예요.' },
  'ICMP In / Out': { name: 'ICMP 주고받은 양', help: '초당 받고 보낸 ICMP 메시지 수예요.' },
  'TCP Errors': {
    name: 'TCP 오류',
    help: '재전송·listen 넘침 같은 TCP 문제의 초당 횟수예요. 늘면 네트워크나 서버가 밀린 거예요.',
  },
  'UDP Errors': {
    name: 'UDP 오류',
    help: 'UDP 데이터그램 전달 오류의 초당 횟수예요. 늘면 버퍼가 모자란 거예요.',
  },
  'ICMP Errors': { name: 'ICMP 오류', help: '받은 ICMP 메시지 중 프로토콜 오류가 있던 수예요.' },
  'TCP SynCookie': {
    name: 'SYN cookie',
    help: 'SYN cookie를 보내거나 확인한 횟수예요. 갑자기 늘면 SYN 폭주일 수 있어요.',
  },
  'TCP Connections': { name: 'TCP 연결 수', help: '지금 맺어져 있는 TCP 연결 수예요.' },
  'UDP Queue': {
    name: 'UDP 대기 데이터',
    help: 'UDP 송수신 대기열에 쌓인 메모리예요. 계속 높으면 처리가 밀린 거예요.',
  },
  'TCP Direct Transition': {
    name: 'TCP 연결 시작 수',
    help: '초당 연결을 시작한 수(Active)와 받은 수(Passive)예요.',
  },
  'TCP Stat Persistent': {
    name: 'TCP 상태별 수(유지)',
    help: 'Established·TIME_WAIT 등 오래 머무는 상태의 TCP socket 수예요. CLOSE_WAIT이 쌓이면 확인해요.',
  },
  'TCP Stat Transient': {
    name: 'TCP 상태별 수(과도)',
    help: 'SYN_SENT 등 잠깐 거치는 상태의 TCP socket 수예요. 오래 남으면 확인해요.',
  },
  'TCP Socket Queue': {
    name: 'TCP 대기 데이터',
    help: 'TCP socket 대기열에 쌓인 바이트예요. RX가 높으면 앱이 늦게 읽고 있는 거예요.',
  },
  'Node Exporter Scrape Time': {
    name: '수집 걸린 시간',
    help: '수집기가 항목별로 지표를 모으는 데 걸린 시간이에요. 길어지면 확인해요.',
  },
  'Exporter Process CPU Usage': {
    name: '수집기 CPU 사용률',
    help: '수집기 프로세스가 쓰는 CPU 비율이에요.',
  },
  'Exporter Processes Memory': {
    name: '수집기 메모리',
    help: '수집기 프로세스가 쓰는 메모리예요.',
  },
  'Exporter File Descriptor Usage': {
    name: '수집기 열린 파일 수',
    help: '수집기가 연 파일 수와 최대치예요.',
  },
  'Node Exporter Scrape': {
    name: '수집 성공 여부',
    help: '항목별로 수집에 성공했는지예요. 1이면 성공, 0이면 실패예요.',
  },
  // JVM
  'GC Pressure': {
    name: 'GC 부담',
    help: '최근 시간 중 GC에 쓴 CPU 시간 비율이에요. 높을수록 응답이 느려져요.',
  },
  'Classes loaded': { name: '로딩된 클래스 수', help: '지금 JVM에 올라와 있는 클래스 수예요.' },
  'Class delta': {
    name: '클래스 수 변화',
    help: '1분 동안 늘거나 줄어든 클래스 수예요. 계속 늘면 클래스 누수를 확인해요.',
  },
  // MySQL
  'MySQL Thread Cache': {
    name: 'thread cache',
    help: '재사용하려고 남겨 둔 thread와 새로 만든 thread예요. 새로 만든 수가 늘면 cache가 모자란 거예요.',
  },
  'MySQL Internal Memory Overview': {
    name: 'MySQL 메모리 사용',
    help: 'MySQL이 buffer pool·로그 버퍼 등에 쓰는 메모리를 항목별로 보여 줘요.',
  },
  'Top Command Counters': {
    name: '명령별 실행 수',
    help: 'SELECT·INSERT 같은 명령이 초당 몇 번 실행됐는지예요.',
  },
  'MySQL Handlers': {
    name: '내부 핸들러 호출',
    help: '저장 엔진이 읽기·쓰기를 처리한 초당 횟수예요. read_rnd_next가 높으면 전체 스캔이 많은 거예요.',
  },
  'MySQL Transaction Handlers': {
    name: '트랜잭션 핸들러',
    help: 'commit·rollback 같은 트랜잭션 처리 횟수예요. rollback이 늘면 확인해요.',
  },
  'Process States': { name: '프로세스 상태', help: '쿼리 처리 단계별로 걸린 thread 수예요.' },
  'Top Process States Hourly': {
    name: '시간별 프로세스 상태',
    help: '쿼리 처리 단계를 한 시간 단위로 모은 값이에요. 한 단계에 몰리면 확인해요.',
  },
  'MySQL Query Cache Memory': {
    name: 'query cache 메모리',
    help: 'query cache의 전체 크기와 남은 메모리예요.',
  },
  'MySQL Query Cache Activity': {
    name: 'query cache 활동',
    help: 'query cache 적중·삽입·정리 횟수예요. 적중이 낮으면 cache 효과가 적은 거예요.',
  },
  'MySQL File Openings': {
    name: '파일 열기 횟수',
    help: 'MySQL이 파일을 연 초당 횟수예요. 계속 높으면 확인해요.',
  },
  'MySQL Open Files': {
    name: '열린 파일 수',
    help: '열린 파일 수와 한도예요. 한도에 닿으면 새 파일을 열지 못해요.',
  },
  'MySQL Table Open Cache Status': {
    name: '테이블 열기 cache',
    help: 'cache 적중과 실패 횟수예요. 실패나 overflow가 늘면 cache 크기를 늘려요.',
  },
  'MySQL Open Tables': {
    name: '열린 테이블 수',
    help: '열려 있는 테이블 수와 cache 크기예요. cache에 가까워지면 크기를 늘려요.',
  },
  'MySQL Table Definition Cache': {
    name: '테이블 정의 cache',
    help: 'cache된 테이블 정의 수와 크기예요. 크기에 닿으면 정의를 다시 읽어 느려져요.',
  },
  // Elasticsearch
  'Open file descriptors per cluster': {
    name: '열린 파일 수',
    help: '클러스터가 열어 둔 파일 수예요. 한도에 닿으면 새 연결을 못 받아요.',
  },
  'Initializing shards': {
    name: '생성 중인 샤드',
    help: '새로 만드는 중인 샤드 수예요. 오래 0보다 크면 확인해요.',
  },
  'Relocating shards': {
    name: '이동 중인 샤드',
    help: '노드 사이를 옮기는 중인 샤드 수예요. 오래 0보다 크면 확인해요.',
  },
  'Delayed shards': {
    name: '배정이 미뤄진 샤드',
    help: '노드 이탈 뒤 재배정을 일부러 늦춘 샤드 수예요. 오래 남으면 확인해요.',
  },
  'GC count': {
    name: 'GC 횟수',
    help: '노드별 GC가 일어난 횟수예요. 갑자기 늘면 메모리가 모자란 거예요.',
  },
  'GC time': { name: 'GC 시간', help: '노드별 GC에 쓴 시간이에요. 길수록 검색이 느려져요.' },
  'Total translog operations': {
    name: 'translog 작업 수',
    help: '아직 디스크에 확정하지 않은 translog 작업 수예요. 계속 늘면 flush가 밀린 거예요.',
  },
  'Total translog size in bytes': {
    name: 'translog 크기',
    help: '노드별 translog 크기예요. 계속 커지면 flush가 밀린 거예요.',
  },
  'Estimated size in bytes of breaker': {
    name: '차단기 메모리 사용',
    help: '메모리 차단기별 사용량과 한도예요. 한도에 가까우면 요청이 거부돼요.',
  },
  'Load average': {
    name: '노드 부하',
    help: '노드의 1·5·15분 평균 부하예요. 코어 수를 넘으면 작업이 밀려요.',
  },
  'CPU usage': {
    name: '노드 CPU 사용률',
    help: '노드별 CPU 사용률이에요. 높은 상태가 이어지면 노드를 늘려요.',
  },
  'JVM memory usage': {
    name: 'JVM 메모리 사용',
    help: '노드별 JVM 사용량과 최대치예요. 최대에 붙어 있으면 메모리가 모자란 거예요.',
  },
  'JVM memory committed': {
    name: 'JVM 메모리 확보',
    help: 'JVM이 운영체제에서 확보한 메모리와 최대치예요.',
  },
  'Disk usage': {
    name: '디스크 사용량',
    help: '노드별 디스크 경로의 사용량이에요. 가득 차면 색인이 막혀요.',
  },
  'Network usage': { name: '네트워크 사용량', help: '노드별로 보내고 받은 바이트 수예요.' },
  'Documents count on node': {
    name: '노드별 문서 수',
    help: '노드가 가진 문서 수예요. 한 노드로 쏠리면 확인해요.',
  },
  'Documents indexed rate': { name: '문서 색인 속도', help: '노드가 초당 색인한 문서 수예요.' },
  'Documents deleted rate': { name: '문서 삭제 속도', help: '노드에서 초당 삭제된 문서 수예요.' },
  'Documents merged rate': {
    name: '문서 병합 속도',
    help: 'segment 병합으로 초당 합쳐진 문서 수예요.',
  },
  'Documents merged bytes': {
    name: '병합된 데이터 양',
    help: 'segment 병합으로 초당 처리한 바이트 수예요.',
  },
  'Query time': {
    name: '질의 시간',
    help: '노드가 질의에 쓴 시간이에요. 길어지면 검색이 느려져요.',
  },
  'Indexing time': {
    name: '색인 시간',
    help: '노드가 색인에 쓴 시간이에요. 길어지면 색인이 느려져요.',
  },
  'Merging time': {
    name: '병합 시간',
    help: 'segment 병합에 쓴 시간이에요. 길면 디스크 I/O가 바빠요.',
  },
  'Throttle time for index store': {
    name: '색인 저장 지연 시간',
    help: '디스크 쓰기가 밀려 색인을 늦춘 시간이에요. 0이어야 좋아요.',
  },
  'Total Operations  rate': { name: '작업 횟수', help: '색인·질의·병합 등 작업의 초당 횟수예요.' },
  'Total Operations time': { name: '작업 시간', help: '색인·질의·병합 등 작업에 쓴 시간이에요.' },
  'Thread Pool operations rejected': {
    name: '거부된 작업',
    help: 'thread pool이 가득 차 거부한 작업 수예요. 0이어야 좋아요.',
  },
  'Thread Pool operations queued': {
    name: '대기 중인 작업(pool)',
    help: 'thread pool 대기열에 쌓인 작업 수예요. 계속 늘면 처리가 밀린 거예요.',
  },
  'Thread Pool threads active': {
    name: '일하는 thread 수',
    help: '작업을 처리 중인 thread 수예요. 최대에 붙어 있으면 모자란 거예요.',
  },
  'Thread Pool operations completed': {
    name: '처리한 작업 수',
    help: 'thread pool이 끝낸 작업의 초당 수예요.',
  },
  'Field data memory size': {
    name: 'field data 메모리',
    help: '정렬·집계용 field data가 쓰는 메모리예요. 계속 늘면 확인해요.',
  },
  'Field data evictions': {
    name: 'field data 제거 수',
    help: '메모리가 모자라 field data를 지운 횟수예요. 늘면 메모리가 모자란 거예요.',
  },
  'Query cache size': { name: 'query cache 크기', help: '질의 결과 cache가 쓰는 메모리예요.' },
  'Query cache evictions': {
    name: 'query cache 제거 수',
    help: '가득 차서 query cache를 지운 횟수예요. 늘면 cache가 모자란 거예요.',
  },
  'Evictions from filter cache': {
    name: 'filter cache 제거 수',
    help: '가득 차서 filter cache를 지운 횟수예요. 늘면 cache가 모자란 거예요.',
  },
  'Count of index segments': {
    name: 'segment 수',
    help: '노드별 segment 수예요. 계속 늘면 병합이 밀린 거예요.',
  },
  'Current memory size of segments in bytes': {
    name: 'segment 메모리',
    help: 'segment가 메모리에 올려 둔 크기예요.',
  },
  'Count of documents with only primary shards': {
    name: '인덱스별 문서 수',
    help: '주 샤드만 센 인덱스별 문서 수예요.',
  },
  'Total size of stored index data in bytes with only primary shards on all nodes': {
    name: '인덱스 크기(주 샤드)',
    help: '주 샤드만 더한 인덱스별 저장 크기예요.',
  },
  'Total size of stored index data in bytes with all shards on all nodes': {
    name: '인덱스 크기(전체)',
    help: '복제 샤드까지 더한 인덱스별 저장 크기예요.',
  },
  'Doc values with only primary shards on all nodes in bytes': {
    name: 'doc values(주 샤드)',
    help: '주 샤드만 더한 doc values 크기예요.',
  },
  'Doc values with all shards on all nodes in bytes': {
    name: 'doc values(전체)',
    help: '복제 샤드까지 더한 doc values 크기예요.',
  },
  'Size of fields with only primary shards on all nodes in bytes': {
    name: '필드 크기(주 샤드)',
    help: '주 샤드만 더한 필드 데이터 크기예요.',
  },
  'Size of fields with all shards on all nodes in bytes': {
    name: '필드 크기(전체)',
    help: '복제 샤드까지 더한 필드 데이터 크기예요.',
  },
  // k6
  'Transfer Rate': {
    name: '데이터 전송량',
    help: '부하 테스트 중 초당 보내고 받은 데이터 양이에요.',
  },
  Iterations: {
    name: '반복 실행 수',
    help: '가상 사용자가 시나리오를 끝낸 횟수와 건너뛴 횟수예요. 건너뛴 수가 0보다 크면 부하를 못 따라간 거예요.',
  },
  'HTTP Latency Timings': {
    name: '응답 시간 구간',
    help: '요청 시간을 연결·TLS·전송·대기·수신 단계로 나눠요. 대기가 길면 서버 처리가 느린 거예요.',
  },
  'HTTP Latency Stats': {
    name: '응답 시간 통계',
    help: '전체·성공·실패 요청의 응답 시간이에요. 실패가 더 길면 확인해요.',
  },
  'HTTP Request Rate': {
    name: '초당 요청 수(성공·실패)',
    help: '초당 요청 수를 전체·성공·실패로 나눈 값이에요. 실패가 0이어야 좋아요.',
  },
  'Requests by URL': {
    name: '주소별 요청',
    help: '주소별 요청 수와 응답 시간이에요. 느린 주소를 찾을 때 봐요.',
  },
  'Checks list': { name: '검사 목록', help: '테스트 시나리오의 검사 항목별 성공·실패 횟수예요.' },
  'Checks Success Rate (aggregate individual checks)': {
    name: '검사 성공률',
    help: '모든 검사 중 통과한 비율이에요. 100%여야 좋아요.',
  },
}

const OVERVIEW = '숫자 몇 개로 지금 상태를 한눈에 볼 때 먼저 봐요.'

export const SECTION_NAMES: Record<string, string> = {
  'Command, Handlers, Processes': '명령·핸들러·프로세스',
  'Query Cache': 'query cache',
  'Files and Tables': '파일·테이블',
  'Table Openings': '테이블 열기',
  'MySQL Table Definition Cache': '테이블 정의 cache',
  'JVM Garbage Collection': 'JVM GC',
  Translog: 'translog',
  Breakers: '메모리 차단기',
  'CPU and Memory': 'CPU·메모리',
  'Disk and Network': '디스크·네트워크',
  Documents: '문서',
  Times: '처리 시간',
  'Total Operations stats': '작업 통계',
  'Thread Pool': 'thread pool',
  Caches: 'cache',
  Segments: 'segment',
  'Indices: Count of documents and Total size': '인덱스 문서 수·크기',
  'Indices: Doc values': '인덱스 doc values',
  'Indices: Fields': '인덱스 필드 크기',
  HTTP: 'HTTP',
}

export const SECTION_HELP: Record<string, string> = {
  'Quick CPU / Mem / Disk': `CPU·메모리·디스크 상태예요. ${OVERVIEW}`,
  'Basic CPU / Mem / Net / Disk':
    'CPU·메모리·네트워크·디스크 추이예요. 서버가 느려졌을 때 가장 먼저 봐요.',
  'CPU / Memory / Net / Disk':
    '기본 지표를 더 자세히 나눈 그래프예요. 기본 지표에서 이상을 찾은 뒤 원인을 좁힐 때 봐요.',
  'Memory Details':
    '커널이 메모리를 어디에 쓰는지 나눠 보여 줘요. 메모리가 모자라거나 이유 없이 줄 때 봐요.',
  Processes: '프로세스·스레드·파일 수와 시스템 부하예요. 부하가 높거나 한도에 닿았을 때 봐요.',
  'CPU & Scheduler': '코어별 CPU 대기, 작업 전환, 인터럽트예요. CPU가 바쁜데 원인을 모를 때 봐요.',
  'Hardware & Time':
    '온도·팬·전원·시계 동기화 상태예요. 하드웨어 이상이나 시간 어긋남이 의심될 때 봐요.',
  Systemd: 'systemd 유닛 상태와 소켓 연결이에요. 서비스가 죽었거나 안 뜰 때 봐요.',
  Storage: '디스크 속도·대기·inode·파일시스템 상태예요. 디스크가 느리거나 쓰기가 실패할 때 봐요.',
  'Network Traffic': '장치별 패킷 수와 오류·버림이에요. 네트워크가 느리거나 끊길 때 봐요.',
  'Network Sockstat': 'socket 개수와 socket 메모리예요. 연결이 많거나 socket이 쌓일 때 봐요.',
  'Network Netstat': 'TCP·UDP·ICMP 통계와 오류예요. 재전송이나 연결 실패가 의심될 때 봐요.',
  'Node Exporter': '지표 수집기 자체의 상태예요. 지표가 비거나 끊겨 보일 때 봐요.',
  'Quick Facts': `JVM 서비스의 기본 상태예요. ${OVERVIEW}`,
  'I/O Overview': '요청 수·오류·응답 시간·처리 스레드예요. 서비스가 느리거나 오류가 날 때 봐요.',
  'JVM Memory': 'heap과 힙 밖 메모리 사용량이에요. 메모리가 모자라거나 OOM이 의심될 때 봐요.',
  'JVM Misc': 'CPU·스레드·로그·열린 파일이에요. 서비스가 이유 없이 느릴 때 봐요.',
  'JVM Memory Pools (Heap)': 'heap 안의 영역별 사용량이에요. GC가 잦을 때 어느 영역이 차는지 봐요.',
  'JVM Memory Pools (Non-Heap)': 'heap 밖 영역별 사용량이에요. 클래스 정보 영역이 계속 늘 때 봐요.',
  'Garbage Collection': 'GC 횟수·멈춤 시간·메모리 할당량이에요. 응답이 주기적으로 멈칫할 때 봐요.',
  Classloading: '로딩된 클래스 수와 변화예요. 클래스 누수가 의심될 때 봐요.',
  'Buffer Pools': '버퍼 수와 용량이에요. 직접 메모리 사용이 의심될 때 봐요.',
  Connections: '연결 수와 최대 연결 수예요. 접속이 거부되거나 연결이 쌓일 때 봐요.',
  'Table Locks': '테이블 락 대기 횟수예요. 쿼리가 락에 걸려 멈출 때 봐요.',
  'Temporary Objects': '임시 테이블과 파일 생성 수예요. 디스크 임시 테이블이 늘 때 봐요.',
  Sorts: '정렬한 행 수와 정렬 방식이에요. 정렬 때문에 쿼리가 느릴 때 봐요.',
  Aborted: '비정상으로 끊긴 연결 수예요. 접속이 자꾸 끊길 때 봐요.',
  Network: 'MySQL이 주고받은 데이터 양이에요. 네트워크 사용량이 급할 때 봐요.',
  Memory: 'MySQL이 항목별로 쓰는 메모리예요. 메모리가 모자랄 때 봐요.',
  'Command, Handlers, Processes':
    '명령별 실행 수와 내부 처리 횟수예요. 어떤 쿼리가 몰리는지 볼 때 봐요.',
  'Query Cache': 'query cache의 크기와 적중 횟수예요. cache 효과를 확인할 때 봐요.',
  'Files and Tables': '열린 파일과 테이블 수예요. 파일 한도나 cache 크기를 조정할 때 봐요.',
  'Table Openings': '테이블 열기 cache의 적중과 실패예요. 실패가 늘 때 봐요.',
  'MySQL Table Definition Cache': '테이블 정의 cache 사용량이에요. 정의를 자주 다시 읽을 때 봐요.',
  KPI: `Elasticsearch 클러스터의 핵심 상태예요. ${OVERVIEW}`,
  Shards: '샤드가 어떤 상태인지 센 값이에요. 검색이 빠지거나 클러스터 상태가 노랑·빨강일 때 봐요.',
  'JVM Garbage Collection': '노드별 GC 횟수와 시간이에요. 검색이 느리거나 노드가 멈칫할 때 봐요.',
  Translog: 'translog 작업 수와 크기예요. 디스크 확정이 밀리는지 볼 때 봐요.',
  Breakers: '메모리 차단기 사용량과 한도예요. 요청이 메모리 때문에 거부될 때 봐요.',
  'CPU and Memory': '노드의 부하·CPU·JVM 메모리예요. 노드가 느릴 때 봐요.',
  'Disk and Network':
    '노드의 디스크 사용량과 네트워크 양이에요. 디스크가 차거나 전송이 몰릴 때 봐요.',
  Documents: '노드의 문서 수와 색인·삭제·병합 속도예요. 색인이 느려질 때 봐요.',
  Times: '질의·색인·병합에 쓴 시간이에요. 어떤 작업이 느린지 찾을 때 봐요.',
  'Total Operations stats':
    '색인·질의·병합 등의 작업 횟수와 시간이에요. 어떤 작업이 몰리는지 볼 때 봐요.',
  'Thread Pool': '작업별 thread pool의 대기·거부·처리 수예요. 요청이 거부되거나 밀릴 때 봐요.',
  Caches: 'field data·query·filter cache의 크기와 제거 수예요. 메모리가 모자랄 때 봐요.',
  Segments: 'segment 수와 메모리예요. 검색이 느려지거나 메모리가 늘 때 봐요.',
  'Indices: Count of documents and Total size':
    '인덱스별 문서 수와 저장 크기예요. 디스크 계획을 세울 때 봐요.',
  'Indices: Doc values': '인덱스별 doc values 크기예요. 정렬·집계가 메모리를 많이 쓸 때 봐요.',
  'Indices: Fields': '인덱스별 필드 데이터 크기예요. 필드가 너무 커졌는지 볼 때 봐요.',
  'Performance Overview': `부하 테스트의 전체 흐름이에요. ${OVERVIEW}`,
  HTTP: 'HTTP 요청의 응답 시간과 요청 수예요. 어느 구간이나 주소가 느린지 찾을 때 봐요.',
  Checks: '시나리오 검사 항목의 성공률이에요. 테스트가 실패했는지 확인할 때 봐요.',
}

// 렌더된 범례 이름 번역. 사전에 없으면 원문 그대로 둔다.
const SERIES: Record<string, string> = {
  Mem: '메모리',
  Irq: 'IRQ',
  'Busy System': 'System(커널)',
  'Busy User': 'User',
  'Busy Iowait': 'Iowait',
  'Busy IRQs': 'IRQ',
  'Busy Other': '기타',
  Idle: '유휴',
  Total: '전체',
  Used: '사용',
  'Cache + Buffer': 'cache + buffer',
  Free: '여유',
  'Swap used': '스왑 사용',
  'CPU Core Count': 'CPU 코어 수',
  'Load 1m': '1분 부하',
  'Load 5m': '5분 부하',
  'Load 15m': '15분 부하',
  'Blocked (I/O Wait)': '막힘(I/O 대기)',
  'Runnable (Ready for CPU)': '실행 대기',
  'Hung Tasks Detected (D state > timeout)': '멈춘 작업',
  'Process Forks per second': '초당 프로세스 생성',
  'Number of PIDs': 'PID 수',
  'PIDs limit': 'PID 한도',
  'Allocated threads': '사용 중 스레드',
  'Threads limit': '스레드 한도',
  'Max open files': '최대 열 수 있는 파일',
  'Open files': '열린 파일',
  'Context switches': '작업 전환',
  Interrupts: '인터럽트',
  Max: '최대',
  Min: '최소',
  'Entropy available': '남은 엔트로피',
  'Entropy pool max': '엔트로피 최대',
  'Estimated error': '예상 오차',
  'Offset local vs reference': '기준 시계와 차이',
  'Maximum error': '최대 오차',
  'PLL Time Constant': 'PLL 시간 상수',
  'Sync status (1 = ok)': '동기화(1이면 정상)',
  'Frequency Adjustment': '주파수 보정',
  'Tick Interval': 'tick 간격',
  'TAI Offset': 'TAI 차이',
  Activating: '시작 중',
  Active: '활성',
  Deactivating: '종료 중',
  Failed: '실패',
  Inactive: '비활성',
  'NF conntrack entries': '추적 중인 연결',
  'NF conntrack limit': '추적 한도',
  'IPv4 Allocated Sockets': 'IPv4 할당 socket',
  'IPv4 In-Use Sockets': 'IPv4 사용 중 socket',
  'IPv4 Orphaned Sockets': 'IPv4 고아 socket',
  'IPv4 TIME_WAIT Sockets': 'IPv4 TIME_WAIT socket',
  'IPv6 In-Use Sockets': 'IPv6 사용 중 socket',
  'Total sockets': '전체 socket',
  Fragmentation: '단편화',
  'Listen Overflows': 'listen 큐 넘침',
  'Listen Drops': 'listen 버림',
  'SYN Retransmits': 'SYN 재전송',
  'Segment Retransmits': '세그먼트 재전송',
  'Receive Errors': '수신 오류',
  'RST Sent': 'RST 보냄',
  'Receive Queue Drops': '수신 큐 버림',
  'Out-of-order Queued': '순서 어긋난 패킷',
  'TCP Timeouts': 'TCP 시간 초과',
  'SYN Cookies Failed': 'SYN cookie 실패',
  'SYN Cookies Validated': 'SYN cookie 확인',
  'SYN Cookies Sent': 'SYN cookie 보냄',
  'Current Connections': '현재 연결',
  'Active Opens': '연결 시작',
  'Passive Opens': '연결 받음',
  'RX Queued (waiting to be read)': '받은 데이터(읽기 대기)',
  'TX Queued (waiting to be sent)': '보낼 데이터(전송 대기)',
  'Process CPU Usage': '프로세스 CPU 사용률',
  'Virtual Memory': '가상 메모리',
  'Virtual Memory Limit': '가상 메모리 한도',
  'Resident Memory (RSS)': '실제 메모리(RSS)',
  'Maximum open file descriptors': '최대 열 수 있는 파일',
  'Open file descriptors': '열린 파일',
  textfile: 'textfile',
  // JVM
  'HTTP - 5xx': 'HTTP 5xx',
  'HTTP - AVG': 'HTTP 평균',
  'HTTP - MAX': 'HTTP 최대',
  'TOMCAT - BSY': 'Tomcat 처리 중',
  'TOMCAT - CUR': 'Tomcat 현재',
  'TOMCAT - MAX': 'Tomcat 최대',
  'JETTY - BSY': 'Jetty 처리 중',
  'JETTY - CUR': 'Jetty 현재',
  'JETTY - MAX': 'Jetty 최대',
  used: '사용',
  committed: '확보',
  commited: '확보',
  max: '최대',
  vss: '가상 메모리',
  rss: 'RSS',
  swap: '스왑',
  total: '전체',
  system: '서버 전체',
  process: '이 서비스',
  'process-15m': '이 서비스(15분)',
  'system-1m': '서버 전체(1분)',
  cpus: 'CPU 수',
  live: '전체',
  daemon: '데몬',
  peak: '최고',
  open: '열림',
  allocated: '할당',
  promoted: '승격',
  loaded: '로딩',
  'delta-1m': '1분 증감',
  capacity: '용량',
  buffers: '버퍼 수',
  'CPU time spent on GC': 'GC에 쓴 CPU 시간',
  // MySQL
  'Max Used Connections': '최대 사용 연결',
  'Max Connections': '최대 연결',
  'Peak Threads Connected': '연결 thread 최고',
  'Peak Threads Running': '실행 thread 최고',
  'Avg Threads Running': '실행 thread 평균',
  'Thread Cache Size': 'thread cache 크기',
  'Threads Cached': 'cache된 thread',
  'Threads Created': '새로 만든 thread',
  'Created Tmp Tables': '임시 테이블 생성',
  'Created Tmp Disk Tables': '디스크 임시 테이블 생성',
  'Created Tmp Files': '임시 파일 생성',
  'Select Full Join': 'Full Join SELECT',
  'Select Full Range Join': 'Full Range Join SELECT',
  'Select Range': 'Range SELECT',
  'Select Range Check': 'Range Check SELECT',
  'Select Scan': 'Scan SELECT',
  'Sort Rows': '정렬한 행',
  'Sort Range': '범위 정렬',
  'Sort Merge Passes': '병합 정렬 횟수',
  'Sort Scan': '스캔 정렬',
  'Slow Queries': '느린 쿼리',
  'Aborted Connects (attempts)': '접속 실패(시도)',
  'Aborted Clients (timeout)': '끊긴 클라이언트(시간 초과)',
  'Table Locks Immediate': '락 즉시 획득',
  'Table Locks Waited': '락 대기',
  Inbound: '받음',
  Outbound: '보냄',
  'InnoDB Buffer Pool Data': 'buffer pool 데이터',
  'InnoDB Log Buffer Size': '로그 버퍼 크기',
  'InnoDB Additional Memory Pool Size': '추가 메모리 풀 크기',
  'InnoDB Dictionary Size': '딕셔너리 크기',
  'Key Buffer Size': 'key buffer 크기',
  'Query Cache Size': 'query cache 크기',
  'Adaptive Hash Index Size': 'adaptive hash index 크기',
  'TokuDB Cache Size': 'TokuDB cache 크기',
  'Free Memory': '여유 메모리',
  Hits: '적중',
  Inserts: '삽입',
  'Not Cached': 'cache 안 됨',
  Prunes: '정리',
  'Queries in Cache': 'cache된 질의',
  Openings: '열기',
  'Open Files': '열린 파일',
  'Open Files Limit': '파일 한도',
  'InnoDB Open Files': 'InnoDB 열린 파일',
  Misses: '실패',
  'Misses due to Overflows': 'overflow로 인한 실패',
  'Table Open Cache Hit Ratio': 'cache 적중률',
  'Open Tables': '열린 테이블',
  'Table Open Cache': 'cache 크기',
  'Open Table Definitions': '열린 테이블 정의',
  'Table Definitions Cache Size': '정의 cache 크기',
  'Opened Table Definitions': '연 테이블 정의',
  // k6
  vus: '가상 사용자',
  http_req_s: '초당 요청',
  http_req_failed: '실패 요청',
  http_req_s_errors: '초당 실패 요청',
  http_req_s_success: '초당 성공 요청',
  data_sent: '보낸 데이터',
  data_received: '받은 데이터',
  dropped_iterations: '건너뛴 반복',
  min: '최소',
  k6_checks_rate: '검사 성공률',
}

// "이름 - 설명" 꼴의 긴 이름은 이름 부분만 보고 뜻을 붙인다.
const LONG: Record<string, string> = {
  System: 'System(커널 모드 실행)',
  User: 'User(일반 프로그램 실행)',
  Nice: 'Nice(낮은 우선순위 실행)',
  Iowait: 'Iowait(I/O 완료 대기)',
  Irq: 'IRQ(인터럽트 처리)',
  Softirq: 'Softirq(소프트 인터럽트 처리)',
  Steal: 'Steal(가상화로 빼앗긴 시간)',
  Idle: 'Idle(대기)',
  Guest: 'Guest(가상 CPU 실행)',
  Apps: 'Apps(프로그램 사용)',
  PageTables: 'PageTables(주소 변환 테이블)',
  SwapCache: 'SwapCache(스왑에서 읽은 페이지)',
  Slab: 'Slab(커널 cache)',
  Cache: 'Cache(파일 내용 cache)',
  Buffers: 'Buffers(블록 장치 cache)',
  Unused: 'Unused(비어 있음)',
  Swap: 'Swap(스왑 사용)',
  'Hardware Corrupted': 'Hardware Corrupted(손상된 RAM)',
  Committed_AS: 'Committed_AS(약속한 메모리)',
  CommitLimit: 'CommitLimit(약속 한도)',
  Writeback: 'Writeback(디스크로 쓰는 중)',
  WritebackTmp: 'WritebackTmp(FUSE 임시 쓰기)',
  Dirty: 'Dirty(쓰기 대기)',
  'NFS Unstable': 'NFS Unstable(NFS 저장 대기)',
  AnonHugePages: 'AnonHugePages(익명 HugePages)',
  AnonPages: 'AnonPages(익명 메모리)',
  Mapped: 'Mapped(파일 매핑)',
  Shmem: 'Shmem(공유 메모리)',
  ShmemHugePages: 'ShmemHugePages(공유 HugePages)',
  'PMD Mapped': 'PMD Mapped(공유 THP)',
  Inactive: 'Inactive(오래 안 씀)',
  Active: 'Active(최근 씀)',
  Inactive_file: 'Inactive_file(파일 기반, 오래 안 씀)',
  Inactive_anon: 'Inactive_anon(익명, 오래 안 씀)',
  Active_file: 'Active_file(파일 기반, 최근 씀)',
  Active_anon: 'Active_anon(익명, 최근 씀)',
  SUnreclaim: 'SUnreclaim(회수 불가 slab)',
  SReclaimable: 'SReclaimable(회수 가능 slab)',
  'Vmalloc Free Chunk': 'Vmalloc Free Chunk(가장 큰 빈 덩어리)',
  'Vmalloc Total': 'Vmalloc Total(전체)',
  'Vmalloc Used': 'Vmalloc Used(사용)',
  KernelStack: 'KernelStack(커널 스택)',
  PerCPU: 'PerCPU(CPU별)',
  'DirectMap 1G': 'DirectMap 1G',
  'DirectMap 2M': 'DirectMap 2M',
  'DirectMap 4K': 'DirectMap 4K',
  Unevictable: 'Unevictable(회수 불가)',
  Mlocked: 'Mlocked(앱이 고정)',
  'HugePages Used': 'HugePages Used(사용)',
  'HugePages Reserved': 'HugePages Reserved(예약)',
  'HugePages Surplus': 'HugePages Surplus(추가)',
  'HugePages Total': 'HugePages Total(전체)',
  Zswap: 'Zswap(압축 크기)',
  Zswapped: 'Zswapped(압축 전 크기)',
  Pagesin: 'Pagesin(읽어 옴)',
  Pagesout: 'Pagesout(내보냄)',
  Pswpin: 'Pswpin(스왑에서 읽음)',
  Pswpout: 'Pswpout(스왑으로 내보냄)',
  Pgfault: 'Pgfault(전체)',
  Pgmajfault: 'Pgmajfault(major)',
  Pgminfault: 'Pgminfault(minor)',
  CPU: 'CPU',
  Memory: '메모리',
  'I/O': 'I/O',
  IRQ: 'IRQ',
}

const STALL: Record<string, string> = { Some: '일부 멈춤', Full: '전체 멈춤' }

// 단어 단위 번역. 장치·경로 이름은 그대로 둔다.
const TOKENS: [RegExp, string][] = [
  [/\bRx in\b/gi, '받음'],
  [/\bTx out\b/g, '보냄'],
  [/\bRead\b/g, '읽기'],
  [/\bWrite\b/g, '쓰기'],
  [/\bNo Listener\b/g, '수신자 없음'],
  [/\bBuffer\b/g, '버퍼'],
  [/\bErrors\b/g, '오류'],
  [/\bQueue\b/g, '대기열'],
  [/\bFree\b/g, '여유'],
  [/\bSize\b/g, '크기'],
  [/\bProcessed\b/g, '처리'],
  [/\bDropped\b/g, '버림'],
  [/\bRunning\b/g, '실행'],
  [/\bWaiting 대기열\b/g, '대기열'],
  [/\bTimes Squeezed\b/g, '처리 못 한 횟수'],
  [/\bRPS Wakeups\b/g, 'RPS 깨움'],
  [/\bUncorrectable\b/g, '수정 불가'],
  [/\bCorrectable\b/g, '수정 가능'],
  [/\bonline\b/g, '켜짐'],
  [/\bpresent\b/g, '연결됨'],
  [/\bDiscards completed\b/g, 'discard 완료'],
  [/\bDiscards merged\b/g, 'discard 병합'],
  [/\bReadOnly\b/g, '읽기 전용'],
  [/\bDevice error\b/g, '장치 오류'],
  [/\bLink flaps\b/g, '링크 끊김'],
  [/\bDown state\b/g, '다운 상태'],
  [/\bIn-Use Sockets\b/g, '사용 중 socket'],
  [/\bGeneral IO\b/g, '일반 I/O'],
]

// 「이름: 작업」 꼴(Elasticsearch)의 작업 부분
const OPS: Record<string, string> = {
  indexing: '색인',
  query: '질의',
  fetch: '가져오기',
  merges: '병합',
  refresh: 'refresh',
  flush: 'flush',
  get_exists: '조회(있음)',
  get_missing: '조회(없음)',
  get: '조회',
  indexing_delete: '색인 삭제',
  get_time: '조회 시간',
  sent: '보냄',
  received: '받음',
}

export function seriesLabel(name: string): string {
  const trimmed = name.trim()
  const exact = SERIES[trimmed]
  if (exact) {
    return exact
  }
  const [key = '', rest] = trimmed.split(/ [-–] (.+)/)
  const stall = rest && STALL[rest]
  if (stall) {
    return `${LONG[key] ?? key} ${stall}`
  }
  if (rest !== undefined && LONG[key]) {
    return LONG[key]
  }
  const op = /^(.+): (\w+)$/.exec(trimmed)
  const opName = op?.[2] ? OPS[op[2]] : undefined
  if (op && opName) {
    return `${op[1]} ${opName}`
  }
  let out = trimmed
  for (const [re, ko] of TOKENS) {
    out = out.replace(re, ko)
  }
  return out === trimmed ? name : out.replace(/ - (?=[가-힣])/g, ' ')
}

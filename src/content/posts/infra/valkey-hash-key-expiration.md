## Hash 안의 필드에 TTL 을 걸 수 없었다

Redis, Valkey 를 쓰다 보면 한 번쯤 이런 상황을 만난다.  

피처 플래그처럼 여러 값을 하나의 Hash 에 묶어 관리하는데, 각 필드마다 만료 시간이 달라야 할 때.  

```
user:flags -> {
    "new_ui_experiment"  -> true   // 몇 분 뒤 자동 종료
    "dark_mode_rollout"  -> true   // 몇 주간 유지
    "beta_feature"       -> true   // 며칠 뒤 종료
}
```

기존에는 선택지가 두 가지뿐이었다.  

하나의 Hash 로 묶으면 필드별 TTL 을 설정할 수 없다.  
각 필드를 개별 Key 로 분리하면 키가 폭발적으로 늘어 메모리 효율이 떨어진다.  

둘 다 마음에 들지 않는다.  
결국 Lua Script 로 우회 로직을 짜거나 유연성을 포기해야 했다.  

Valkey 9.0 에서 Hash 필드 단위 TTL 을 지원하는 명령어들이 추가됐다.  

---

## 어떻게 만료시키나: Active Expiration

Valkey 는 **Active Expiration** 방식을 택했다.  

Lazy Expiration 은 클라이언트가 해당 키에 접근할 때만 만료 여부를 검사한다.  
별도 작업 없이 요청이 들어올 때만 유효성을 검사하므로 구현이 단순하고 평소 실행 비용이 없다.  
단, 아무도 접근하지 않는 키는 TTL 이 지나도 메모리에 계속 남는다.  

Active Expiration 은 백그라운드 Cron Job 이 주기적으로 만료된 키를 탐색해 삭제한다.  
기본적으로 초당 10회 실행되며 일정 시간 내에서만 동작해 시스템 부하를 제한한다.  
아무도 접근하지 않아도 주기적으로 정리된다.  

Valkey 는 `HGET`, `HSET`, `HDEL` 같은 연산마다 만료 체크 로직을 추가하면 성능 저하 위험이 있다고 판단해 Lazy Expiration 을 채택하지 않았다.  
대신 Active Expiration 으로 메모리를 관리하되, TTL 만료 시점과 실제 삭제 시점 사이에 약간의 지연이 생길 수 있다는 점은 감수한다.  

---

## 공통 옵션

만료 설정 명령어(`HEXPIRE`, `HPEXPIRE`, `HEXPIREAT`, `HPEXPIREAT`)에 선택적으로 붙이는 옵션들이다.  

| 옵션 | 동작 |
|---|---|
| `NX` | 해당 필드에 기존 만료가 없을 때만 설정 |
| `XX` | 해당 필드에 기존 만료가 있을 때만 설정 |
| `GT` | 새 만료 시간이 현재보다 클 때만 설정 |
| `LT` | 새 만료 시간이 현재보다 작을 때만 설정 |

---

## 공통 반환 코드

만료 설정·조회 명령어가 반환하는 정수값이다.  

| 반환값 | 의미 |
|---|---|
| `-2` | 필드 또는 키가 존재하지 않음 |
| `-1` | 필드는 존재하지만 TTL 없음 (영구) |
| `0` | NX / XX / GT / LT 조건 불충족 |
| `1` | 성공 |
| `2` | `0` 입력으로 즉시 만료 처리됨 |

---

## HEXPIRE / HPEXPIRE: 상대 시간으로 만료 설정

```
HEXPIRE  key seconds      [NX|XX|GT|LT] FIELDS numfields field [field ...]
HPEXPIRE key milliseconds [NX|XX|GT|LT] FIELDS numfields field [field ...]
```

현재 시각으로부터 얼마 뒤에 만료할지 상대 시간으로 지정한다.  
`HEXPIRE` 는 초 단위, `HPEXPIRE` 는 밀리초 단위다.  
`0` 을 입력하면 즉시 만료된다.  

```bash
> HSET myhash f1 v1 f2 v2 f3 v3
> HEXPIRE myhash 10 FIELDS 2 f2 f3
1) (integer) 1
2) (integer) 1
> HTTL myhash FIELDS 3 f1 f2 f3
1) (integer) -1   # TTL 없음
2) (integer) 8    # 8초 남음
3) (integer) 8
```

`FIELDS` 는 필드 목록이 이어진다는 구분자 키워드다.  
항상 `numfields` 앞에 위치하며 생략할 수 없다.  
`numfields` 는 뒤에 나올 필드 이름의 개수를 미리 알려주는 값이다.  

---

## HEXPIREAT / HPEXPIREAT: 절대 시각으로 만료 설정

```
HEXPIREAT  key unix-time-seconds      [NX|XX|GT|LT] FIELDS numfields field [field ...]
HPEXPIREAT key unix-time-milliseconds [NX|XX|GT|LT] FIELDS numfields field [field ...]
```

`HEXPIRE` 와 동일하지만 상대 시간이 아닌 Unix 타임스탬프로 만료 시각을 지정한다.  
`HEXPIREAT` 는 초 단위, `HPEXPIREAT` 는 밀리초 단위 타임스탬프다.  
과거 시각을 입력하면 즉시 삭제된다.  

```bash
> HSET myhash f1 v1 f2 v2 f3 v3
> HEXPIREAT myhash 1754846600 FIELDS 2 f2 f3
1) (integer) 1
2) (integer) 1
> HEXPIRETIME myhash FIELDS 3 f1 f2 f3
1) (integer) -1
2) (integer) 1754846600
3) (integer) 1754846600
```

특정 날짜·시각에 정확히 만료시켜야 할 때 유용하다.  
상대 시간으로 계산하면 오차가 생길 수 있는 케이스에서는 절대 시각이 더 안전하다.  

---

## HTTL / HPTTL: 남은 TTL 조회

```
HTTL  key FIELDS numfields field [field ...]
HPTTL key FIELDS numfields field [field ...]
```

각 필드의 남은 TTL 을 반환한다.  
`HTTL` 은 초 단위, `HPTTL` 은 밀리초 단위다.  

```bash
> HSET myhash f1 v1 f2 v2 f3 v3
> HEXPIRE myhash 10 FIELDS 2 f2 f3
> HTTL myhash FIELDS 4 f1 f2 f3 non-exist
1) (integer) -1   # TTL 없음 (영구)
2) (integer) 8    # 8초 남음
3) (integer) 8
4) (integer) -2   # 필드 없음
```

존재하지 않는 필드는 `-2`, TTL 이 없는 필드는 `-1` 을 반환한다.  

---

## HEXPIRETIME / HPEXPIRETIME: 만료 시각 조회

```
HEXPIRETIME  key FIELDS numfields field [field ...]
HPEXPIRETIME key FIELDS numfields field [field ...]
```

각 필드의 만료 시각을 Unix 타임스탬프로 반환한다.  
`HEXPIRETIME` 은 초 단위, `HPEXPIRETIME` 은 밀리초 단위다.  

```bash
> HSET myhash f1 v1 f2 v2 f3 v3
> HEXPIREAT myhash 1754846600 FIELDS 2 f2 f3
> HEXPIRETIME myhash FIELDS 3 f1 f2 f3
1) (integer) -1
2) (integer) 1754846600
3) (integer) 1754846600
```

`HTTL` 이 "몇 초 남았나"를 알려준다면, `HEXPIRETIME` 은 "언제 만료되나"를 알려준다.  
만료 시각을 외부 시스템과 비교하거나 스케줄링에 활용할 때 유용하다.  

---

## HPERSIST: TTL 을 제거해 영구 보존

```
HPERSIST key FIELDS numfields field [field ...]
```

필드에 설정된 만료를 제거해 영구적으로 보존한다.  
Key 수준의 `PERSIST` 명령어와 같은 역할을 필드 단위로 수행한다.  

```bash
> HSET myhash f1 v1 f2 v2
> HEXPIRE myhash 100 FIELDS 2 f1 f2
> HPERSIST myhash FIELDS 1 f1
1) (integer) 1
> HTTL myhash FIELDS 2 f1 f2
1) (integer) -1   # 만료 제거됨
2) (integer) 97   # 여전히 TTL 있음
```

반환값은 세 가지다.  
`1` 은 성공, `-1` 은 이미 TTL 이 없는 필드, `-2` 는 필드 또는 키가 없는 경우다.  

---

## 명령어 한눈에 보기

모두 Valkey **9.0.0** 에서 추가됐으며, 복잡도는 O(N) (N = 지정된 필드 수) 다.  

| 명령어 | 단위 | 용도 |
|---|---|---|
| `HEXPIRE` | 초 | 상대 시간으로 만료 설정 |
| `HPEXPIRE` | 밀리초 | 상대 시간으로 만료 설정 |
| `HEXPIREAT` | 초 (Unix) | 절대 시각으로 만료 설정 |
| `HPEXPIREAT` | 밀리초 (Unix) | 절대 시각으로 만료 설정 |
| `HTTL` | 초 | 남은 TTL 조회 |
| `HPTTL` | 밀리초 | 남은 TTL 조회 |
| `HEXPIRETIME` | 초 (Unix) | 만료 시각 조회 |
| `HPEXPIRETIME` | 밀리초 (Unix) | 만료 시각 조회 |
| `HPERSIST` | — | TTL 제거 (영구 보존) |

Lazy Expiration 이 아닌 Active Expiration 을 택했다는 점은 기억해둘 필요가 있다.  
TTL 이 정확히 만료된 시점에 즉각 삭제되기를 기대하면 안 된다.  
백그라운드 Cron 이 다음 주기에 도달하기 전까지 해당 필드는 메모리에 남아 있다.  

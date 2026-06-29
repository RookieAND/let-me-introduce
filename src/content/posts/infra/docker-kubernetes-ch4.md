## 4. 도커 컴포즈

## 4.1 도커 컴포즈를 사용하는 이유

여러 컨테이너가 묶여 하나의 애플리케이션을 이루는 상황을 생각해보자.
`docker run`을 여러 번 치면 되긴 하는데, 컨테이너마다 옵션을 일일이 지정하고 실행 순서도 맞춰야 한다.
테스트할 때마다 이 과정을 반복하다 보면 금방 지친다.

Docker Compose는 이 번거로움을 YAML 파일 하나로 해결한다.
각 컨테이너에 적용할 설정을 파일에 정의해두면, Compose가 순서대로 읽어 컨테이너를 생성해준다.

단순히 실행 순서만 관리하는 게 아니다. 한 파일 안에서 이런 것들을 함께 정의할 수 있다.

- 컨테이너 간 의존성, 네트워크, 볼륨
- 서비스 수 조절 및 서비스 디스커버리 (자동으로 이루어진다)

---

## 4.2 도커 컴포즈 설치

도커를 설치했다면 Compose는 기본으로 포함된다.
`docker compose version`으로 확인하면 된다.

---

## 4.3 도커 컴포즈 사용

### 4.3.1 도커 컴포즈 기본 사용법

#### 4.3.1.1 docker-compose.yml 작성과 활용

Docker Compose는 `docker-compose.yml` 파일을 읽어 도커 엔진에 컨테이너 생성을 요청한다.
현재 디렉토리에 파일이 있다면 `docker compose up -d`만 치면 된다.

아래는 웹 서버와 MySQL을 함께 띄우는 기본적인 예시다.

```yaml
services:
  web:
    image: alicek106/composetest:web
    ports:
      - "80:80"
    links:
      - mysql:db
    command: apachectl -DFOREGROUND

  mysql:
    image: alicek106/composetest:mysql
    command: mysqld
```

`services` 아래에 서비스 이름을 나열하고, 각 서비스 안에 컨테이너 옵션을 정의하는 구조다.
실행 후 `docker compose ps`로 컨테이너 상태를 확인할 수 있다.

#### 4.3.1.2 도커 컴포즈의 프로젝트, 서비스, 컨테이너

Docker Compose는 컨테이너를 **프로젝트 → 서비스 → 컨테이너** 단위로 구분한다.
생성된 컨테이너의 이름은 `[프로젝트 이름]-[서비스 이름]-[번호]` 형식이다.

하나의 프로젝트에 여러 서비스가 있고, 하나의 서비스에 여러 컨테이너가 붙을 수도 있다.
`docker compose scale` 명령어로 특정 서비스의 컨테이너 수를 늘리는 것도 가능하다.

```bash
docker compose scale mysql=2
```

프로젝트 이름은 기본적으로 현재 디렉토리 이름을 따른다.
`/home/ubuntu`에서 실행하면 프로젝트 이름이 `ubuntu`가 되는 식이다.
`-p` 옵션으로 이름을 직접 지정할 수 있고, 이름이 다른 여러 프로젝트를 동시에 제어하는 것도 가능하다.

생성된 프로젝트는 `docker compose down`으로 정지 및 일괄 삭제한다.

---

### 4.3.2 도커 컴포즈 활용

#### 4.3.2.1 YAML 파일 작성

`docker-compose.yml`은 크게 세 영역으로 나뉜다: 서비스 정의, 네트워크 정의, 볼륨 정의.

##### [1] 서비스 정의

Docker Compose로 생성할 컨테이너 옵션을 정의하는 핵심 영역이다.
자주 쓰이는 옵션들을 하나씩 살펴보자.

1. **`image`**: 컨테이너를 생성할 때 사용할 이미지를 지정한다.
   - `[레지스트리]/[이미지]:[태그]` 형식이며, 태그를 생략하면 `latest`가 적용된다.
   - 이미지가 로컬에 없으면 레지스트리에서 자동으로 받아온다.
   - `build`와 함께 쓰면 빌드 결과물에 이름을 붙이는 용도로 활용할 수 있다.

2. **`links`**: 다른 서비스에 별칭으로 접근할 수 있게 해준다.
   - `[SERVICE:ALIAS]` 형식을 쓰면 서비스 이름 대신 별칭으로도 접근이 가능하다.
   - Docker Compose는 같은 네트워크 안의 서비스끼리는 서비스 이름만으로 통신이 가능하기 때문에, 별칭이 필요한 경우가 아니라면 `links` 없이도 충분하다.
   ```yaml
   links:
     - mysql:db   # mysql 서비스를 db라는 이름으로도 접근
   ```

3. **`environment`**: 컨테이너 내부에서 사용할 환경 변수를 지정한다.
   - `docker run --env` 옵션과 동일하며, 딕셔너리와 배열 형태 모두 지원한다.
   - 값 없이 키만 쓰면 호스트의 동명 환경 변수를 그대로 주입한다. CI 환경의 시크릿을 그대로 컨테이너에 넘길 때 유용하다.
   ```yaml
   environment:
     NODE_ENV: production
     SECRET_KEY:          # 값 생략 시 호스트 환경 변수에서 주입

   # 배열 형태로도 동일하게 동작한다
   environment:
     - NODE_ENV=production
     - SECRET_KEY
   ```

4. **`env_file`**: 환경 변수를 파일에서 읽어온다.
   - `KEY=VALUE` 형식이며, `#` 주석과 빈 줄은 무시된다.
   - 여러 파일을 지정하면 순서대로 읽히며, 뒤에 오는 파일이 앞의 값을 덮어쓴다. `environment`가 가장 마지막에 적용된다.

5. **`command`**: 컨테이너 실행 시 수행할 명령어를 설정한다.
   - Dockerfile의 `CMD`를 덮어쓰지만, `ENTRYPOINT`는 건드리지 않는다.
   - 즉, `ENTRYPOINT`가 정의된 이미지에서 `command`를 쓰면 해당 값이 ENTRYPOINT의 인자로 전달된다.
   ```yaml
   command: node app.js

   # 공백이나 특수문자가 포함된 인자가 있을 때는 배열 형태가 안전하다
   command: ["sh", "-c", "node app.js && echo done"]
   ```

6. **`depends_on`**: 서비스 간 시작 순서와 의존 관계를 정의한다.
   - `condition` 없이 쓰면 의존 서비스가 시작된 뒤 현재 서비스를 생성한다.
   - `condition: service_healthy`를 쓰면 의존 서비스의 `healthcheck`가 통과된 뒤에 시작한다. DB처럼 초기화 시간이 필요한 서비스에 적합하다.
   - `condition: service_completed_successfully`는 의존 서비스가 정상 종료(exit 0)된 후 시작한다. DB 마이그레이션 같은 일회성 작업을 앞세울 때 쓴다.
   - 의존성 없이 단독으로 생성하려면 `docker compose up --no-deps [서비스명]`을 쓴다.
   ```yaml
   depends_on:
     db-migrate:
       condition: service_completed_successfully
     mysql:
       condition: service_healthy
     redis:
       condition: service_started   # 기본값
   ```

7. **`ports`**: 호스트와 컨테이너 포트를 연결한다. (`host:container` 순)
   - YAML은 `xx:yy` 형식을 60진법 숫자로 파싱할 수 있어 반드시 **따옴표로 감싸야** 한다.
   - 호스트 포트를 생략하면 랜덤 포트가 배정된다. 같은 서비스를 `scale`로 여러 개 띄울 때는 이 방식이 필수다.

8. **`volumes`**: 컨테이너에 마운트할 볼륨을 지정한다.
   - `[호스트 경로]:[컨테이너 경로]` 형식은 바인드 마운트다. 호스트 파일을 직접 읽고 쓰므로 개발 환경에서 코드 변경을 실시간으로 반영할 때 주로 쓴다.
   - `[볼륨명]:[컨테이너 경로]` 형식은 named volume이다. Docker가 수명을 관리하므로 `docker compose down`으로 컨테이너가 삭제돼도 데이터가 남는다. 최상위 `volumes`에 선언이 필요하다.
   - 끝에 `:ro`를 붙이면 읽기 전용으로 마운트된다.
   ```yaml
   volumes:
     - ./src:/app/src             # 바인드 마운트 — 소스 코드 핫 리로드
     - db-data:/var/lib/mysql     # named volume — DB 데이터 보존
     - /etc/secrets:/run/secrets:ro   # 읽기 전용 마운트
   ```

9. **`build`**: Dockerfile을 빌드해 서비스 이미지로 사용한다.
   - `context`는 빌드 컨텍스트 경로, `dockerfile`은 파일명을 지정한다. 파일명이 `Dockerfile`이라면 생략 가능하다.
   - `args`는 `ARG` 빌드 인수를 전달한다. 이미지에는 포함되지 않아 시크릿 노출 없이 빌드 시에만 쓸 값을 넘길 수 있다.
   - `target`으로 멀티 스테이지 빌드의 특정 스테이지까지만 빌드할 수 있다. 개발/프로덕션 이미지를 하나의 Dockerfile로 관리할 때 유용하다.
   ```yaml
   build:
     context: .
     dockerfile: Dockerfile.prod
     target: production          # 멀티 스테이지 빌드 시 스테이지 지정
     args:
       NODE_VERSION: 20
   ```

10. **`restart`**: 컨테이너 종료 시 재시작 정책을 설정한다.
    - `no`: 재시작하지 않는다 (기본값)
    - `always`: 항상 재시작한다. Docker 데몬이 재시작될 때도 포함된다.
    - `on-failure[:횟수]`: 비정상 종료(exit code != 0) 시에만 재시작한다. `on-failure:3`처럼 최대 횟수를 제한할 수 있다.
    - `unless-stopped`: `docker stop`으로 수동 정지한 경우는 데몬 재시작 후에도 시작하지 않는다. `always`와의 차이가 여기서 난다.

11. **`healthcheck`**: 컨테이너 내 애플리케이션 상태를 주기적으로 검사한다.
    - `CMD`는 exec 방식, `CMD-SHELL`은 shell 방식이다. 파이프나 리다이렉션이 필요하면 `CMD-SHELL`을 쓴다.
    - `start_period`는 컨테이너 시작 직후 초기화 시간을 유예한다. 이 시간 동안 실패해도 재시도 횟수에 포함되지 않는다.
    - `disable: true`로 Dockerfile에 정의된 `HEALTHCHECK`를 비활성화할 수 있다.
    - `depends_on`의 `condition: service_healthy`와 연동하면 앱이 실제로 준비된 뒤에 다음 서비스가 뜨도록 제어할 수 있다.
    ```yaml
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]
      interval: 30s        # 검사 주기
      timeout: 10s         # 응답 대기 시간
      retries: 3           # 연속 실패 횟수 초과 시 unhealthy
      start_period: 40s    # 첫 검사 유예 시간
    ```

12. **`extends`**: 다른 YAML 파일이나 현재 파일 내 다른 서비스의 속성을 상속받는다.
    - 서비스 레벨 설정만 상속된다. 최상위 `networks`, `volumes`는 상속되지 않는다.
    - 공통 설정을 `base.yml`에 모아두고 개발/프로덕션 파일에서 상속하는 방식으로 중복을 줄일 수 있다.
    ```yaml
    # base.yml
    services:
      base:
        restart: unless-stopped
        logging:
          driver: json-file

    # docker-compose.prod.yml
    services:
      web:
        extends:
          file: base.yml
          service: base
        image: myapp:latest
    ```

그런데 여기서 짚고 넘어갈 점이 있다.

`links`와 `depends_on` 모두 기본적으로 **실행 순서**만 보장할 뿐, 컨테이너 내 앱이 실제로 준비됐는지는 확인하지 않는다.
DB 컨테이너가 먼저 떴더라도 초기화 중이라면 서버 컨테이너가 비정상 동작할 수 있다.
`healthcheck`를 정의하고 `depends_on`에 `condition: service_healthy`를 걸면 이 문제를 Compose 안에서 해결할 수 있다.

아래는 주요 옵션들을 종합한 예시다.

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    depends_on:
      mysql:
        condition: service_healthy
    command: ["node", "app.js"]
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: appdb
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db-data:
```

##### [2] 네트워크 정의

`networks` 항목 아래에 서비스 간 통신에 사용할 네트워크를 정의한다.
Docker Compose는 기본적으로 Bridge 타입의 네트워크를 생성한다.

1. **`driver`**: 네트워크 타입을 변경한다.
   - 기본값은 bridge이며, 드라이버 옵션은 `driver_opts`로 전달한다.

2. **`ipam`** (IP Address Manager): IP 주소 관리를 위한 옵션이다.
   - `driver` 항목에 IPAM을 지원하는 드라이버 이름을 입력하고, subnet이나 IP 범위를 설정할 수 있다.

3. **`external`**: `true`로 설정하면 프로젝트 생성 시마다 네트워크를 새로 만들지 않고 기존 네트워크를 재사용한다.
   - `driver`, `driver_opts`, `ipam`과는 함께 사용할 수 없다.

```yaml
networks:
  frontend:
    driver: bridge

  backend:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16

  # 이미 생성된 네트워크를 재사용하는 경우
  shared-net:
    external: true
```

##### [3] 볼륨 정의

`volumes` 항목에서 데이터를 영속적으로 저장할 볼륨을 정의한다.

- **`driver`**: 볼륨 생성 시 사용될 드라이버를 지정한다.
  - 미설정 시 `local`이 기본값이며, 드라이버 옵션은 `driver_opts`로 전달한다.

- **`external`**: `true`로 설정하면 프로젝트 생성 시마다 볼륨을 새로 만들지 않고 기존 볼륨을 재사용한다.

```yaml
volumes:
  db-data:
    driver: local

  # 이미 생성된 볼륨을 재사용하는 경우
  shared-storage:
    external: true
```

##### [4] YAML 파일 검증

`docker compose config` 명령어로 파일의 오타나 포맷 오류를 체크할 수 있다.
특정 경로의 파일을 검증하려면 `-f` 옵션으로 경로를 직접 지정한다.

```bash
docker compose config
docker compose -f ./path/to/docker-compose.yml config
```

---

#### 4.3.2.2 도커 컴포즈 네트워크

YAML 파일에 네트워크 항목을 따로 정의하지 않으면, Docker Compose는 프로젝트마다 Bridge 타입의 네트워크를 자동으로 하나 만든다.  
이름은 `[프로젝트 이름]_default` 형식이며, `docker compose up`으로 생성되고 `docker compose down`으로 삭제된다.

```bash
# myapp 디렉토리에서 실행했다면 네트워크 이름은 myapp_default
docker network ls
# NETWORK ID     NAME            DRIVER    SCOPE
# abc123def456   myapp_default   bridge    local
```

이 네트워크 안에서는 서비스 이름 자체가 호스트 이름이 된다.  
Compose가 컨테이너를 생성할 때 `--net-alias`를 서비스 이름으로 자동 설정하기 때문이다.  
덕분에 web 컨테이너에서 `mysql`이라는 이름으로 DB에 접근하면, Docker 내부 DNS가 해당 컨테이너 IP로 알아서 변환해준다.

`docker compose scale`로 같은 서비스의 컨테이너를 여러 개 띄운 경우에도 서비스 이름 하나로 접근할 수 있다.  
동일한 `--net-alias`를 가진 컨테이너가 여럿이면 요청이 라운드 로빈 방식으로 분산된다.  
명시적으로 로드밸런서를 구성하지 않아도 스케일 아웃이 자연스럽게 되는 이유가 여기에 있다.

#### 4.3.2.3 도커 스웜 모드와 함께 사용하기

`docker-compose.yml` 파일은 Docker Swarm에서도 그대로 활용할 수 있다.  
Swarm에서는 이 YAML 파일로 생성된 컨테이너 묶음을 **Stack**이라고 부른다.  
Docker Compose의 Service가 Docker Swarm의 Service로 그대로 이어진다고 생각하면 편하다.  
차이점이 있다면 Swarm에서는 서비스들이 단일 호스트가 아닌 클러스터 전체에 분산 배포된다는 것이다.

Stack은 `docker-compose`가 아닌 `docker stack` 명령어로 제어한다.  
Swarm 클러스터 위에서 동작하기 때문에 별도의 명령어 체계를 사용한다.

```bash
# YAML 파일로 Stack 배포
docker stack deploy -c docker-compose.yml mystack

# 생성된 Stack 목록 확인
docker stack ls

# Stack 내 서비스 목록 확인
docker service ls

# Stack 제거
docker stack rm mystack
```

그런데 한 가지 짚고 넘어갈 게 있다.

`links`와 `depends_on`은 Swarm Stack에서 사용할 수 없다.  
Swarm은 컨테이너를 여러 호스트에 분산 배치하는데, 이 두 옵션은 컨테이너가 같은 호스트에 있어야만 동작하는 구조이기 때문이다.  
서비스 간 통신은 Overlay 네트워크를 통해 이루어지며, Stack의 네트워크도 자동으로 Overlay 타입으로 설정된다.
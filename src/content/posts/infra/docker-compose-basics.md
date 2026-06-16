> 데브말싸미 사이드 프로젝트에서 NestJS + Redis + Nginx를 한 번에 띄워야 했다. docker run을 개별로 실행하다가 docker-compose로 넘어온 과정에서 정리한 내용이다.

---

## Docker Compose란?

> Docker Compose is a tool for defining and running multi-container applications.

한 마디로, **다수의 컨테이너를 정의하고 실행시키기 위한 툴**이다.

---

## 왜 Docker Compose를 쓰는가

### 여러 컨테이너를 일괄 실행·관리할 수 있다

Redis, Nginx, NestJS 컨테이너를 일일이 `docker run`으로 실행하면 명령어가 이렇게 길어진다.

```bash
docker run -p 3000:3000 \
  --name frontend \
  --env-file ./.env.production \
  -d my-frontend:latest

docker run -d \
  --name redis \
  -p 6379:6379 \
  --restart always \
  --volume $(pwd)/redis/data:/data \
  redis:alpine

docker run -d \
  --name nginx \
  -p 80:80 -p 443:443 \
  --restart on-failure \
  --add-host host.docker.internal:host-gateway \
  nginx:latest
```

Docker Compose를 사용하면 명령어 한 줄로 끝난다.

```bash
docker-compose -f ./docker-compose.yml up -d
```

### 컨테이너 간 연결을 편하게 설정할 수 있다

Docker의 `--link` 옵션으로 컨테이너끼리 연결할 수 있지만, 여러 대의 컨테이너가 제각기 다른 컨테이너와 연결해야 하는 경우 관리가 어렵다. Docker Compose는 기본적으로 하나의 브리지 네트워크를 생성하고 파일에 정의된 모든 컨테이너를 해당 네트워크에 연결한다.

### 변경되지 않은 서비스는 기존 컨테이너를 재사용한다

Docker Compose는 컨테이너 생성에 쓰인 구성을 캐싱한다. 이미지에 변경사항이 생긴 경우에만 `--build` 플래그로 재빌드한다.

### 하나의 환경 변수 파일을 여러 서비스에 적용할 수 있다

운영 환경에 따라 다른 환경 변수를 세팅하고 상황에 맞게 적용해 동적으로 컨테이너를 구성할 수 있다.

---

## Compose 파일 작성 예시

```yaml
name: dev-malssami
services:
  backend:
    image: rookieanddocker/devminjeong-eum-backend:latest
    container_name: backend
    env_file:
      - .env.production
    ports:
      - "${SERVER_PORT}:${SERVER_PORT}"
    labels:
      - "name=backend"
    restart: on-failure

  redis:
    image: redis:alpine
    container_name: redis
    ports:
      - "${REDIS_PORT}:${REDIS_PORT}"
    volumes:
      - ./redis/data:/data
      - ./redis/conf/redis.conf:/usr/local/conf/redis.conf
    command: redis-server /usr/local/conf/redis.conf
    restart: always

  nginx:
    build:
      context: ./docker/nginx
      dockerfile: Dockerfile
    container_name: nginx
    ports:
      - 80:80
      - 443:443
    depends_on:
      - backend
    volumes:
      - ./docker/nginx/config/nginx.conf:/etc/nginx/nginx.conf
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: on-failure
```

### name (Top-Level)

해당 Compose의 Project name을 정의한다. 동일한 파일이라도 name이 다르면 서로 다른 실행 환경을 가진다.

프로젝트 이름 결정 우선순위:
- `docker-compose up`의 `-p` 플래그
- `COMPOSE_PROJECT_NAME` 환경 변수
- Compose 파일 내 최상위 `name` 섹션
- 현재 디렉토리 이름

---

## 서비스 간 의존 관계 — depends_on

`depends_on`은 컨테이너 시작 순서를 제어한다.

```yaml
services:
  backend:
    image: my-backend:latest
    depends_on:
      - redis
      - db

  redis:
    image: redis:alpine

  db:
    image: postgres:14
```

단, `depends_on`은 **컨테이너가 시작되었는지**만 확인한다. DB가 실제로 준비됐는지(healthy 상태)는 보장하지 않는다. 서비스가 완전히 준비된 후에 의존 컨테이너를 시작하려면 `healthcheck`와 함께 써야 한다.

```yaml
services:
  backend:
    depends_on:
      db:
        condition: service_healthy  # db가 healthy 상태일 때만 시작

  db:
    image: postgres:14
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

---

## 네트워크 설정

Docker Compose는 기본적으로 모든 서비스를 **하나의 브리지 네트워크**에 연결한다. 같은 Compose 파일 내 서비스끼리는 서비스 이름으로 바로 통신할 수 있다.

```yaml
# backend 서비스에서 redis 서비스에 연결할 때
const client = createClient({ url: 'redis://redis:6379' });
```

서비스 격리가 필요하면 명시적으로 네트워크를 정의한다.

```yaml
services:
  backend:
    networks:
      - app-network
      - db-network

  db:
    networks:
      - db-network

networks:
  app-network:
  db-network:
```

---

## 주요 명령어

- `docker-compose up -d`: 컨테이너를 백그라운드에서 실행
- `docker-compose up --build`: 이미지를 강제로 재빌드하고 실행
- `docker-compose down`: 컨테이너를 중지하고 제거
- `docker-compose ps`: 현재 실행 중인 컨테이너 목록 확인
- `docker-compose stop`: 컨테이너를 중지 (제거하지 않음)
- `docker-compose logs -f [service]`: 특정 서비스의 로그 실시간 확인

up 시 적용한 플래그는 down 시에도 동일하게 적용해야 한다.

```bash
# up 시
docker-compose -f docker-compose.yml --env-file ./env.production up -d

# down 시 — 동일한 플래그 사용
docker-compose -f docker-compose.yml --env-file ./env.production down
```

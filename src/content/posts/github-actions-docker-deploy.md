## 배포 과정에서 실수한 것들

GitHub Actions로 Docker 배포 파이프라인을 처음 구축하면서 몇 가지 삽질을 했다. 같은 실수를 반복하지 않기 위한 오답노트다.

---

## 실수 1: scp-action의 source 경로

`appleboy/scp-action@v0.1.7`을 통해 GitHub Actions에서 `docker-compose.yml`을 EC2로 복사하려 했으나 실패했다.

```yaml
# ❌ 에러 발생
- name: Copy Docker Compose Configuration to AWS EC2
  uses: appleboy/scp-action@v0.1.7
  with:
    source: "docker-compose.yml"  # ERROR: source must be directory
    target: "/home/${{ secrets.EC2_SSH_USER }}/app"
```

`source` 옵션에는 반드시 Directory 형식으로 경로를 지정해야 한다. 현재 경로를 의미하는 `./`를 앞에 붙여야 한다.

```yaml
# ✅ 해결
- name: Copy Docker Compose Configuration
  uses: appleboy/scp-action@v0.1.7
  with:
    source: "./docker-compose.yml"
    target: "/home/${{ secrets.EC2_SSH_USER }}/app"
```

---

## 실수 2: Job마다 checkout을 해야 한다

GitHub Actions에서 각 Job은 매번 새로운 가상 환경에서 실행된다. 이전 Job에서 생성된 코드나 Context를 활용할 수 없다.

> Each job runs in a fresh version of the virtual environment, so you'd need to checkout for each job.

Step들은 같은 실행 환경을 공유하므로 Step 간에는 공유가 가능하다. 하지만 **Job 간의 공유는 불가능**하다. Job이 여럿이라면 각각에서 `actions/checkout`을 실행해야 한다.

```yaml
jobs:
  build:
    steps:
      - uses: actions/checkout@v4  # ✅ Job마다 checkout 필요
      - name: Build Docker image
        ...

  deploy:
    needs: build
    steps:
      - uses: actions/checkout@v4  # ✅ 이 Job에서도 별도로 checkout
      - name: Deploy to EC2
        ...
```

---

## 실수 3: .env 파일이 숨김 처리됨

GitHub Actions에서 `.env.production` 파일을 생성해 복사했으나, EC2에서 `ls`로는 보이지 않았다. `ls -la`로 확인하니 파일은 있었다.

원인은 Linux에서 파일명 앞에 `.`을 붙이면 자동으로 숨김 파일로 처리되기 때문이다. `.env.production`이라는 이름 자체가 숨김 파일이었던 것이다.

해결 방법: `.`을 제거한 이름으로 복사하고, EC2에서 Docker Compose 실행 시 `--env-file` 옵션으로 파일을 지정했다.

```yaml
- name: Create env file
  run: |
    echo "${{ secrets.ENV_PRODUCTION }}" > env.production  # . 없이 생성

- name: Copy env file to EC2
  uses: appleboy/scp-action@v0.1.7
  with:
    source: "./env.production"
    target: "/home/${{ secrets.EC2_SSH_USER }}/app"
```

---

## 실수 4: Nginx Config 파일도 같이 복사해야 한다

Docker Compose 실행 시 `unable to prepare context: path "./docker/nginx" not found` 에러가 발생했다. Compose 실행에 필요한 Nginx Config 파일도 EC2에 있어야 하는데 복사하지 않은 것이다.

```yaml
- name: Copy Configuration Files
  uses: appleboy/scp-action@v0.1.7
  with:
    source: "./docker-compose.yml,./env.production,./docker"
    target: "/home/${{ secrets.EC2_SSH_USER }}/app"
```

---

## 실수 5: Nginx 502 에러

Nginx Container에서 502를 반환하는 오류가 발생했다. 두 가지 원인이 있었다.

**Nginx 기본 설정 파일 잔존.** Nginx 세팅 시 자동 생성되는 `default.conf`가 잔존하여 설정을 덮어쓰는 문제가 발생했다. Dockerfile에서 `default.conf`를 삭제하는 로직을 추가해 해결했다.

**`host.docker.internal` Linux 미지원.** `host.docker.internal`은 Docker 컨테이너에서 호스트 시스템에 접근할 수 있도록 해주는 DNS 이름이지만, Docker Desktop for Mac/Windows에서만 제공된다. **Linux에서는 사용이 불가능하다.**

Linux에서는 `extra_hosts` 옵션을 사용해 수동으로 등록해야 한다.

```yaml
# docker-compose.yml
nginx:
  image: nginx:latest
  extra_hosts:
    - "host.docker.internal:host-gateway"  # Linux에서 host 접근 허용
```

Nginx 설정에서도 `localhost` 대신 `host.docker.internal`을 사용한다.

```nginx
location / {
  proxy_pass http://host.docker.internal:8080;
  proxy_set_header X-Real_IP $remote_addr;
}
```

---

## 실수 6: docker-compose down이 먹히지 않음

`up` 명령어 실행 시 적용한 플래그를 기준으로 `down`도 똑같이 적용해야 한다.

```bash
# up
docker-compose -f ./docker-compose.yml --env-file ./env.production up -d

# down — 동일한 플래그 사용
docker-compose -f ./docker-compose.yml --env-file ./env.production down
```

플래그가 다르면 Compose가 다른 프로젝트로 인식해 컨테이너를 찾지 못한다.

## 2. 도커 엔진

### 2.1 도커 이미지와 컨테이너

#### 2.1.1 도커 이미지

- 도커 이미지는 컨테이너를 생성할 때 필요한 요소이며, 가상 머신 생성 시 사용하는 ISO 파일과 비슷한 개념을 가집니다.
- 이미지는 여러 계층으로 된 바이너리 파일로 존재하며 컨테이너 생성 및 실행 과정에서 Read-Only로 쓰입니다.

##### 도커 이미지 이름 구성

형식: `[저장소명]/[이미지명]:[태그]`

- `저장소`: 이미지가 저장된 장소를 의미합니다. 저장소 이름이 명시되지 않은 경우에는 Docker Hub에 위치한 공식 이미지임을 의미합니다.
- `이미지명`: 해당 이미지가 어떤 역할을 하는지 나타냅니다. (ubuntu, redis, mysql 등) 이는 생략할 수 없으므로 반드시 기입해야 합니다.
- `태그`: 이미지의 버전 관리 혹은 Revision 관리에 사용됩니다. 태그를 생략할 경우 도커 엔진은 이미지의 태그를 latest로 인식합니다.

#### 2.1.2 도커 컨테이너

- 도커 이미지를 기반으로 컨테이너 생성 시 이미지의 목적에 맞는 파일이 들어있는 파일 시스템과 격리된 시스템 자원 및 네트워크를 사용할 수 있는 독립된 공간을 의미합니다.
- 컨테이너는 이미지를 Read Only로만 사용하며 이미지에서 변경된 사항은 별도의 "컨테이너 계층"에서 사용하므로 컨테이너 내 변경 사항이 원래 이미지에 영향을 주지 않습니다.
- 각각의 컨테이너는 각자 독립된 파일 시스템을 제공받고 호스트와 분리되어 특정 컨테이너의 변경 사항이 다른 컨테이너 및 호스트에 영향을 주지 않습니다.

##### VM ISO 파일과 도커 이미지의 유사점

- VM ISO는 OS 설치 파일과 필수 구성 요소를 묶어둔 패키지 파일입니다.
- 도커 이미지 또한 특정 앱을 실행하기 위해 필요한 파일 시스템 스냅샷을 묶어둔 패키지입니다.
- 둘 다 실행에 필요한 데이터를 패키징해서 다른 곳에 활용할 수 있는 형태로 만들어진 바이너리 파일이라는 점에서 같습니다.

### 2.2 도커 컨테이너 다루기

#### 2.2.1 컨테이너 생성

##### 기본 사용법

`docker run [option] [image]` - 이미지를 기반으로 컨테이너를 생성할 수 있습니다.

##### 주요 옵션

- `-i`: 표준 입력(STDIN)을 열어두는 옵션으로, 컨테이너가 실행 중일 때 터미널 입력을 받을 수 있도록 합니다.
- `-t`: 가상 터미널(TTY)을 할당하여 출력이 터미널 형태로 표기되어 색상, 줄바꿈, Prompt 등이 동작합니다.

##### 예시

- `docker run`으로 컨테이너 생성 및 실행하면 컨테이너 내부로 진입할 수 있습니다.
- 기본 사용자는 `root` 이며 호스트 이름은 무작위 16진수 이름입니다.

```shell
docker run -it ubuntu:24.04
```

##### 컨테이너 종료 방법

1. 완전 종료: 컨테이너 내부에서 호스트 OS로 돌아가려면 터미널에서 `exit`를 입력하거나 Ctrl + D를 입력
   - 위 방법은 컨테이너를 이탈하는 동시에 컨테이너를 정지시킵니다.
2. 일시 이탈: 컨테이너를 정지시키지 않고 빠져나오려면 Ctrl + P, Q를 입력
   - 컨테이너의 Shell에서만 빠져나옵니다.

##### 관련 명령어

- `docker images`: 도커 엔진에 존재하는 이미지의 목록을 출력합니다.
- `docker create`: 컨테이너를 생성만 할 뿐 내부로 진입하지 않습니다. 명령어 실행 시 무작위의 16진수 해시값을 출력하는데 이는 컨테이너의 고유 ID 값입니다.
- `docker inspect`: 컨테이너의 ID를 확인할 수 있습니다.
- `docker start`: 컨테이너를 시작할 수 있습니다.
- `docker attach`: 컨테이너의 내부로 들어갈 수 있습니다.

##### docker run vs docker create

- `run`: 이미지가 없다면 pull을 하고, 컨테이너를 생성하고, 이를 시작한 후에 `-it` 옵션이 있다면 내부로 진입합니다.
- `create`: 이미지를 pull한 이후 컨테이너를 생성하는 것에서 끝납니다.

##### 참고사항

- 컨테이너를 대상으로 하는 명령어는 컨테이너의 이름 대신 ID를 사용할 수 있습니다.
- 16진수 해시 값이 너무 길기에 앞의 2~3글자만 입력해도 됩니다.

#### 2.2.2 컨테이너 목록 확인

##### 기본 사용법

`docker ps` - 현재 도커 엔진 내 컨테이너의 목록을 열람할 수 있습니다.

##### 주요 옵션

1. 기본
- `-a`: 정지된 컨테이너 포함 모든 컨테이너 표시
- `-l`, `--latest` : 가장 최근에 생성된 컨테이너만 표시
- `-n`, `--last` : 최근 생성된 n개의 컨테이너 표시

2. 포맷팅 옵션
- `--format`: Go 템플릿을 사용한 출력 형식 지정
- `--no-trunc` : 출력 내용을 잘리지 않게 전체 표시
- `-q`, `--quiet` : 컨테이너 ID만 표시

3. 세부 필터링 옵션
- `--filter` : 조건에 따른 필터링 기능 지원
  - `--filter "status=running"` : 실행 중인 컨테이너만
  - `--filter "name=web"` : 이름에 'web'이 포함된 컨테이너
  - `--filter "ancestor=nginx"` : nginx 이미지 기반 컨테이너
  - `--filter "expose=80"`: 80번 포트를 노출하는 컨테이너

##### 예시

```shell
## 실행 중인 컨테이너 목록
docker ps

## 모든 컨테이너 목록 (정지된 컨테이너 포함)
docker ps -a

## 출력 형식 사용자 정의
docker ps --format "table {{.ID}}\t{{.Status}}\t{{.Image}}"
```

##### 출력 정보 설명

- `CONTAINER ID`: 컨테이너에게 자동으로 할당되는 고유 ID입니다. ID의 일부분만 출력되며 전체를 알기 위해서는 `docker inspect` 명령어를 사용합니다.
- `IMAGE`: 컨테이너 생성 시 쓰인 이미지의 이름입니다.
- `COMMAND`: 컨테이너가 시작될 때 실행될 명령입니다. 기본적으로 이미지에 내장되며 이를 Override하고 싶다면 `docker run`이나 `docker create` 명령어의 맨 끝에 덮어쓸 명령어를 입력합니다.
- `CREATED`: 컨테이너 생성 이후 경과된 시간을 나타냅니다.
- `STATUS`: 컨테이너의 상태를 나타냅니다.
- `PORTS`: 컨테이너가 개방한 포트와 호스트와 연결된 포트를 나열합니다.
- `NAMES`: 컨테이너의 고유 이름입니다. `--name` 옵션으로 지정 가능하며 미지정 시 무작위의 형용사 + 명사 조합으로 임의의 이름을 생성합니다. `docker rename` 명령어로 이름 변경이 가능합니다.

#### 2.2.3 컨테이너 삭제

##### 기본 사용법

`docker rm [컨테이너명/ID]` - 더 이상 사용하지 않는 컨테이너를 삭제할 수 있습니다.

##### 주요 옵션

- `-f`: 실행 중인 컨테이너 강제 삭제
- `-v`: 컨테이너와 연결된 익명 볼륨도 함께 삭제

##### 예시

```shell
## 컨테이너 정지 후 삭제
docker stop my-container
docker rm my-container

## 실행 중인 컨테이너 강제 삭제
docker rm -f my-container

## 정지된 모든 컨테이너 삭제
docker container prune

## 모든 컨테이너 정지 후 삭제
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
```

> [!CAUTION]
> 한번 삭제한 컨테이너는 복구가 불가능합니다. 삭제 전 필요한 데이터를 볼륨이나 `docker cp`로 백업하고, 실행 중인 컨테이너는 반드시 먼저 `docker stop`으로 정지시킨 뒤 삭제하세요.

#### 2.2.4 컨테이너를 외부에 노출

##### 컨테이너 가상 IP 할당

- 컨테이너는 VM과 마찬가지로 가상 IP 주소를 호스트로부터 할당받습니다.
- 도커는 컨테이너에게 기본적으로 `172.17.0.X` 형식의 IP를 순차적으로 할당합니다.

##### 컨테이너의 네트워크 환경

Docker 컨테이너가 실행되면 다음과 같은 네트워크 환경이 구성됩니다.
하지만 해당 인터페이스는 호스트 내부에서만 통신이 가능하며 외부와의 통신은 불가능한 상태입니다.

- eth0 인터페이스: Docker의 내부 NAT 네트워크에서 할당받은 172.17.0.X 대역의 사설 IP
- lo 인터페이스: 컨테이너 내부의 로컬호스트 인터페이스 (127.0.0.1)

##### 컨테이너에서 기본적으로 외부 접근이 불가능한 이유

컨테이너는 기본적으로 Docker의 NAT(Network Address Translation) 네트워크 뒤에 위치합니다.
이로 인해 다음과 같은 제약이 발생합니다.

1. 사설 IP 주소 사용
    - 컨테이너는 172.17.0.X 대역의 사설 IP를 사용
    - 외부에서는 이 사설 IP에 직접 접근할 수 없음
2. NAT의 단방향 특성
    - 내부 → 외부: 컨테이너에서 외부로 요청을 보낼 때는 NAT가 Host의 공인 IP로 변환하여 전송 가능
    - 외부 → 내부: 외부에서 들어오는 요청은 어느 컨테이너(내부 IP)로 전달해야 할지 **NAT가 판단할 수 없음**

##### 포트 포워딩

따라서 외부에서 컨테이너에 접근하려면 포트 포워딩(Port Forwarding) 설정이 필요합니다.
호스트의 8080 포트를 컨테이너의 80 포트로 연결하도록 하면 NAT 테이블에 호스트의 8080 포트로 들어오는 요청을 특정 컨테이너의 80 포트로 전달하는 규칙이 생성됩니다.

`docker run -p [호스트 포트]:[컨테이너 포트] [이미지]`

- `-p`: 포트 바인딩 설정
- 형식: `[호스트의 포트]:[컨테이너의 포트]`

```shell
## 웹 서버 컨테이너를 호스트 8080 포트로 노출
docker run -d -p 8080:80 nginx

## 호스트 포트를 자동 할당
docker run -d -p 80 nginx

## 바인딩된 포트 확인
docker port [컨테이너명]
```

#### 2.2.5 컨테이너 애플리케이션 구축

##### 컨테이너 구성 원칙

- 컨테이너 하나에 여러 개의 애플리케이션을 설치할 수 있으나, 각 목적별로 컨테이너를 구분하는 것이 이미지 관리 및 독립성 유지 측면에서 바람직합니다.
- 한 컨테이너에 프로세스 하나만 실행하는 것이 도커의 기본 철학이기도 합니다.

> [!TIP]
> 컨테이너당 하나의 프로세스만 실행하면 로그 추적, 재시작 정책, 스케일링을 컨테이너 단위로 독립적으로 관리할 수 있어 운영이 훨씬 간결해집니다.

##### docker run 실행 시 주요 옵션

- `-d`: Detached 모드로 컨테이너를 백그라운드에서 실행합니다.
- `-e`: 컨테이너 내부의 환경 변수를 설정합니다.
- `--link`: 컨테이너 간 연결을 위한 별칭을 설정합니다. (현재 Deprecated, Docker Bridge 권장)

> [!WARNING]
> `--link` 옵션은 Deprecated 상태입니다. 컨테이너 간 통신에는 사용자 정의 브릿지 네트워크(`docker network create`)를 활용하세요. 사용자 정의 브릿지는 컨테이너 이름 기반 DNS 해석을 자동으로 지원합니다.

##### 예시

```shell
## Detached 모드로 웹 서버 실행
docker run -d --name my-web nginx

## 환경 변수 설정
docker run -e "DB_PASSWORD=secret" -e "DB_HOST=localhost" my-app

## 컨테이너 연결 (Deprecated)
docker run --link mysql:db my-app

## 실행 중인 컨테이너에서 명령어 실행
docker exec -it my-web bash
```

##### 컨테이너 실행 명령어

- `docker attach`: Detached 모드로 실행 중인 컨테이너의 표준 입출력에 연결하여 확인할 수 있습니다.
- `docker exec`: 실행 중인 컨테이너 내부에서 새로운 명령어를 실행할 수 있습니다.
  - exec로 컨테이너 내부에 들어왔어도 exit 입력 시 컨테이너가 종료되지 않는데, 포그라운드 모드로 동작하는 프로세스가 있기 때문입니다.

#### 2.2.6 도커 볼륨

##### 볼륨의 필요성

- 도커 컨테이너의 변경 사항은 이미지와 별도로 관리됩니다. 컨테이너 레이어는 읽고 쓰기가 가능하지만, 이미지 레이어는 읽기만 가능합니다.
- 하지만 컨테이너를 삭제하면 컨테이너 레이어에 저장된 파일도 모두 삭제되기에 이를 복구할 수 있는 수단이 없습니다.
- 이를 해결하기 위해 도커에서는 볼륨이라는 개념을 도입했습니다.

##### 호스트와 볼륨을 공유하는 방법

1. 기본 사용법

    - `docker run` 명령어에 **`-v`** 옵션을 통해 볼륨을 지정할 수 있습니다.
    - `입력 값`: `[호스트의 공유 디렉토리]:[컨테이너의 공유 디렉토리]`

2. 특징

    - 호스트에 미리 해당 디렉토리가 생성되지 않았어도 Docker에서 자동으로 이를 생성하며 컨테이너 삭제 시에도 호스트의 공유 디렉토리에 잔존합니다.
    - 리눅스의 마운트 네임스페이스 기능을 활용해서 호스트의 디렉토리를 컨테이너 파일 시스템 트리의 특정 경로에 직접 연결합니다. (Kernel 레벨에서 Mount)

> [!WARNING]
> 호스트 공유 디렉토리에 파일이 이미 존재하면, 볼륨 마운트 시 컨테이너 이미지의 해당 경로 파일이 호스트 디렉토리로 덮어씌워집니다. 이미지에 내장된 기본 파일이 유실될 수 있으므로 마운트 경로를 신중하게 선택해야 합니다. 여러 개의 `-v` 옵션으로 각기 다른 디렉토리를 동기화하는 것도 가능합니다.

##### 볼륨 컨테이너를 활용하는 방법

1. 기본 사용법

    - 컨테이너 생성 시 **`--volumes-from`** 옵션을 활용하여 컨테이너의 볼륨 디렉토리를 공유할 수 있습니다.
    - 직접 볼륨을 생성하는 것이 아니라 `-v` 옵션을 적용한 컨테이너를 통해 공유하는 것임을 유의해야 합니다.

2. 활용 방법

    - 여러 개의 컨테이너가 동일한 컨테이너에 볼륨을 공유함으로써 별도의 볼륨 컨테이너를 지정하고 데이터를 간접적으로 공유받는 방식도 가능합니다.

3. 사용 사례

    - 여러 애플리케이션이 같은 데이터 디렉토리를 써야 할 때 쓰입니다.
    - 권한 및 설정 관리를 단순화하고 싶을 때 등 특정 상황에서 쓰입니다.

##### 도커가 관리하는 볼륨을 생성하는 방법

1. 볼륨 관리 명령어

    - `docker volume create`: 볼륨을 생성합니다.
    - `docker volume ls`: 생성된 볼륨 목록을 열람합니다. 플러그인 드라이버를 활용하여 여러 종류의 스토리지 백엔드를 쓸 수 있습니다. (기본은 `local`)
    - 이 볼륨은 로컬 호스트에 저장되어 도커 엔진에 의해 생성 및 삭제가 관리됩니다.

2. 볼륨 사용법

    - `-v` 옵션으로 볼륨을 마운트하고 싶은 경우 `[볼륨명]:[컨테이너 공유 디렉토리]`로 입력 값을 지정합니다.
    - 볼륨은 디렉터리 하나에 상응하는 관계이며 도커 엔진에서 관리합니다.
    - 도커 볼륨 또한 호스트에 내용을 저장하지만 파일이 실제로 어디에 저장되었는지를 사용자가 알 필요 없이 볼륨명으로 쉽게 접근이 가능하도록 해준다는 점에서 용이합니다.

3. 자동 볼륨 생성

    - `docker volume create` 없이도 컨테이너 생성 및 실행 단계에서 `-v` 옵션 입력 시 이를 시행하도록 할 수 있습니다.
    - 공유할 디렉토리의 위치를 `-v` 옵션에 입력하면 도커에서 해당 디렉토리에 대한 볼륨을 자동 생성하며 16진수 형태의 이름을 가집니다.

##### 볼륨 관리 명령어

1. 볼륨 정보 확인

    - **`docker inspect`** 명령어를 사용해서 해당 볼륨이 호스트 내 실제 어느 디렉토리에 저장되는지 알 수 있습니다.
    - **`--type`** 인자에 `image`, `volume`을 입력하여 MountPoint, Driver, Name 등 볼륨 정보를 열람할 수 있습니다.
    - 도커 명령어는 docker 뒤에 container, image, volume 등을 명시하여 구성 단위를 제어합니다. (같은 inspect여도 컨테이너냐, 볼륨이냐의 차이)

2. 볼륨 저장 위치

    - Docker에서 직접 관리하는 Volume의 경우 **`/var/lib/docker/volumes`** 에 저장됩니다.
    - 해당 디렉토리를 직접 들어가서 확인해보면 도커 볼륨명을 기준으로 하위 디렉토리가 나뉘어 있습니다.

3. 볼륨 정리

    - **`docker volume prune`** 명령어를 사용하여 현재 컨테이너에서 직접적으로 사용하지 않은 볼륨을 제거할 수 있습니다.
 
> [!NOTE]
> 컨테이너가 종료되어도 볼륨은 자동으로 삭제되지 않습니다. 불필요한 볼륨이 누적되면 디스크를 점유하므로, 볼륨에 이름을 명시하여 관리하거나 `docker volume prune`으로 주기적으로 정리하는 습관이 필요합니다.

##### --mount 옵션

1. 사용법

    - **`-v`** 옵션 대신 **`--mount`** 옵션을 사용할 수 있습니다.

2. 설정

    - `--type`: volume 혹은 bind를 넣으며 bind의 경우 호스트 내 디렉토리와 컨테이너 내 경로를 직접 연결하고, volume은 Docker Volume을 사용할 때 씁니다.
    - `--source`: 마운트할 도커 볼륨 혹은 호스트 내 디렉토리 경로를 받습니다.

#### 2.2.7 도커 네트워크

##### 네트워크 기본 개념

- 도커 컨테이너는 내부 IP를 생성 시 순차적으로 할당받으며 컨테이너 재시작 시에도 변경할 수 있습니다.
- 내부 IP의 경우 도커가 설치된 호스트(내부)에서만 사용 가능하기에 외부와 연결이 필요합니다.

##### 네트워크 인터페이스 생성

- 이 과정은 컨테이너를 시작할 때마다 호스트에 `veth`라는 네트워크 인터페이스를 생성하여 이루어집니다.
- 각 컨테이너에 외부와의 네트워크를 제공하기 위해서 도커 엔진은 컨테이너 생성 시 가상 네트워크 인터페이스를 호스트에 생성하며 이름은 `veth`(virtual eth)로 시작합니다.
- 실행 중인 컨테이너 수만큼 `veth` 네트워크가 있음을 호스트에서 확인할 수 있습니다.
- `docker0` 브리지는 각 `veth` 인터페이스와 바인딩되어 호스트의 `eth0` 인터페이스와 이를 이어주는 역할을 합니다.

##### 네트워크 드라이버

컨테이너 생성 시 기본적으로 `docker0` 브릿지를 사용하지만, 다양한 드라이버를 선택할 수 있습니다. `docker network ls`로 목록을 확인할 수 있으며, bridge·host·none은 기본 제공됩니다.

| 드라이버 | 종류 | 설명 |
|---|---|---|
| `bridge` | Docker 기본 | 기본 브릿지(`docker0`) 또는 사용자 정의 브릿지를 통해 외부 통신 |
| `host` | Docker 기본 | 호스트의 네트워크 환경을 컨테이너가 그대로 사용 |
| `none` | Docker 기본 | 네트워크 미사용. 완전히 격리된 컨테이너 |
| `container` | Docker 기본 | 다른 컨테이너의 네트워크 네임스페이스를 공유 |
| `overlay` | Docker 기본 | 멀티 호스트 컨테이너 간 통신 (Swarm 모드) |
| `weave` / `flannel` / `openvswitch` | 서드 파티 | 플러그인 기반 커스텀 네트워크 솔루션 |

##### 브릿지 네트워크

1. 사용자 정의 브릿지 생성

    - `docker0`를 사용하지 않고 사용자 정의 브릿지 네트워크를 생성할 수 있습니다.
    - **`docker network create --driver bridge [브릿지명]`** 으로 생성 가능합니다.
    - `docker run/create` 명령어에 **`--net`** 옵션의 값을 지정하면 컨테이너가 이 네트워크를 사용하도록 설정합니다.
    - 컨테이너 내부에서 ifconfig 입력 시 새로운 IP 대역이 할당됨을 알 수 있습니다. 브리지 타입의 네트워크 생성 시 도커는 IP 대역을 순차적으로 할당합니다.

2. 네트워크 관리

    - 생성된 사용자 정의 네트워크는 **`docker network [disconnect/connect] [네트워크명] [컨테이너]`**를 통해 컨테이너에 부착 및 해제 가능합니다.
    - 단, none 및 host 네트워크 등 특별한 모드에서는 사용이 불가능합니다. (특정 IP 대역을 갖는 모드에서만 사용이 가능함)

3. 네트워크 세부 설정

    - **`--subnet`** 으로 네트워크의 서브넷을, **`--ip-range`** 로 IP 대역폭을, **`--gateway`** 로 게이트웨이를 설정할 수 있습니다.
    - 단, `--subnet`과 `--ip-range`는 같은 대역폭이어야 합니다.

4. 네트워크 별칭

    - `docker run`의 **`--net-alias`** 명령어를 함께 사용할 경우 특정 호스트명으로 컨테이너를 여러 개 접근할 수 있습니다.
    - 동일한 브릿지 네트워크 내 다른 컨테이너에서 특정 호스트명으로 ping 요청을 보낼 경우 각 컨테이너의 IP로 ping이 전송됩니다.
    - 요청 전송 시 IP가 매번 달라지는 것은 라운드 로빈 방식이며, 도커 엔진 내 DNS가 호스트명을 `--net-alias`로 해당 이름을 지정한 컨테이너로 변환하기 때문입니다.
    - 호스트 이름 변환을 도커 내장 DNS로 요청하고 IP 목록을 라운드 로빈 방식으로 반환합니다. DNS의 IP는 127.0.0.11입니다.

##### 호스트 네트워크

1. 기본 개념

    - 네트워크를 호스트로 설정하면 호스트의 네트워크 환경을 그대로 사용할 수 있습니다.
    - 호스트 드라이버의 네트워크는 별도 생성을 거치지 않고 기존 `host`라는 이름을 사용하면 됩니다.

2. 사용 방법

    - **`--net`** 옵션에 `host`를 기술하면 적용됩니다.
    - 호스트 머신에서 설정한 이름도 컨테이너가 물려받기에 컨테이너의 호스트명도 엔진이 설치된 호스트의 이름으로 설정됩니다.
    - 컨테이너 내부의 앱을 별도 포트 포워딩하지 않고 바로 연결할 수 있습니다.

##### 논 네트워크

- 아무런 네트워크를 사용하지 않는다는 의미입니다.
- **`--net`** 옵션에 `none`을 넣으면 적용됩니다.

##### 컨테이너 네트워크

1. 기본 개념

    - **`--net`** 옵션에 container를 입력하면 다른 컨테이너의 네트워크 네임스페이스 환경을 공유할 수 있습니다.
    - 공유되는 속성은 내부 IP, 네트워크 인터페이스 내 MAC 주소 등입니다.

2. 사용 방법

    - **`--net`**의 값으로 `container:[컨테이너ID]`를 입력합니다.
    - 다른 컨테이너의 네트워크 환경을 공유하므로 컨테이너 생성 시 새로운 `veth`도 생성되지 않고 NAT IP도 할당되지 않습니다.
    - 두 컨테이너의 `eth0` 속성 또한 당연히 동일합니다.

#### 2.2.8 컨테이너 로깅

##### json-file 로그 사용 (Default)

1. 기본 로그 확인

    - 도커는 컨테이너의 STDIN, STDERR 로그를 별도의 메타데이터 파일로 저장하여 이를 확인하는 명령어를 제공합니다.
    - **`docker logs`** 명령을 사용하여 컨테이너 내부에서 출력을 열람할 수 있습니다.

2. docker logs 옵션

    - `--tail`: 마지막 로그 줄부터 N개의 로그만 볼 수 있습니다.
    - `--since`: 유닉스 시간을 입력하여 특정 시간 이후의 로그를 볼 수 있습니다.
    - `-t`: 타임스탬프를 표기할 수 있습니다.
    - `-f`: 컨테이너에서 실시간으로 출력되는 내용을 확인하기 위해 로그를 스트림으로 확인할 수 있습니다.

3. 로그 저장 위치

    - 기본적으로 컨테이너 로그는 JSON 형태로 도커 내부에 저장됩니다.
    - **`/var/lib/docker/containers/${CONTAINER_ID}`** 디렉토리 내 **`${CONTAINER_ID}-json.log`** 파일로 저장됩니다.

4. 로그 크기 제한

    - 컨테이너 내부의 출력이 너무 많으면 JSON 파일 사이즈가 커질 수 있기 때문에 **`--log-opt`** 옵션으로 JSON 파일의 최대 크기도 지정할 수 있습니다.
    - `max-size`: 최대 사이즈를 의미합니다.
    - `max-file`: 로그 파일의 최대 개수를 의미합니다.

5. 기본 로깅 드라이버 변경

    - 로깅 드라이버는 기본적으로 json-file로 세팅하나, Docker Daemon 시작 옵션에서 **`--log-driver`** 옵션으로 Default Logging Driver 변경이 가능합니다.

> [!WARNING]
> json-file 드라이버는 로그 크기 제한을 별도로 설정하지 않으면 파일이 무한정 커질 수 있습니다. 프로덕션 환경에서는 반드시 `--log-opt max-size`와 `--log-opt max-file`로 로그 크기를 제한하거나, syslog·fluentd·CloudWatch 같은 중앙 로그 수집 시스템으로 전환하는 것을 권장합니다.

##### syslog 로그 사용

1. syslog 개념

    - Syslog는 Unix/Linux 계열 운영체제에서 로그 메시지를 전송·저장·분석하는 표준 프로토콜 및 프레임워크입니다.
    - 커널, 시스템 서비스, 애플리케이션 등에서 생성된 로그를 중앙에서 관리할 수 있도록 설계되었습니다.
    - 생성된 로그는 로컬 파일(/var/log/)에 기록할 수도 있고, 네트워크를 통해 원격 Syslog 서버로 보낼 수도 있습니다.

2. rsyslog 설치

```shell
sudo apt-get update
sudo apt-get install rsyslog
```

3. 서버 역할 구분

    - `수신 서버`: rsyslog가 TCP/UDP 포트(기본 UDP 514)를 열어 다른 서버에서 오는 로그를 받습니다.
    - `송신 서버`: rsyslog를 통해 생성된 로그를 특정 서버로 전송합니다.

4. Docker에서 syslog로 전송하기

```shell
docker run -d \
  --name my_app \
  --log-driver=syslog \
  --log-opt syslog-address=tcp://192.168.0.100:514 \
  --log-opt tag="myapp_container" \
  --log-opt syslog-facility=daemon \
  nginx
```

5. syslog 옵션 설명

    - `syslog-address`: 로그를 보낼 syslog 서버 주소 (`udp://` 또는 `tcp://`)
    - `tag`: syslog 메시지에 붙는 태그. 검색·분류 시 유용
    - `syslog-facility`: 로그 저장 범주 지정 (`daemon`, `mail`, `user`, `kern` 등)

6. 프로토콜 선택

    - `UDP`: 속도가 빠르지만 신뢰성이 낮음
    - `TCP`: 전송 신뢰성이 높음

##### fluentd 로깅

Fluentd는 로그 수집·필터링·변환·전송을 담당하는 오픈소스 데이터 수집기입니다. 데이터 포맷으로 JSON을 사용하면 로그 파싱과 검색이 편리하며 다양한 출력 플러그인(MongoDB, Elasticsearch, S3 등)을 지원합니다.

1. fluent.conf 설정 예시

```conf
<source>
  @type forward
  port 24224
</source>

<match docker.**>
  @type mongo
  host mongo
  port 27017
  database logs
  collection app_logs
  include_tag_key true
  <buffer>
    flush_interval 5s
  </buffer>
</match>
```

    - 로그의 태그가 `docker`로 시작하면 이를 MongoDB에 전달하도록 세팅 (`<match docker.**>`)

2. Docker에서 fluentd 실행

```shell
docker run -d \
  --name fluentd \
  -v $(pwd)/fluent.conf:/fluentd/etc/fluent.conf \
  -p 24224:24224 \
  fluent/fluentd
```

    - `Volume mount`: -v로 호스트의 fluent.conf를 컨테이너 설정 파일로 사용합니다.
    - `log-driver`: 애플리케이션 컨테이너에서 --log-driver=fluentd로 지정 가능합니다.
    - `address`: Fluentd 서버 주소(--log-opt fluentd-address=...)로 설정합니다.

##### AWS CloudWatch Logs

1. 설정 단계

    - IAM 권한 생성
    - 로그 그룹 생성
    - 로그 그룹에 로그 스트림 생성
    - EC2 인스턴스 생성 및 로그 전송

2. 사용 시나리오

    - AWS 클라우드 환경에서 중앙 집중식 로그 관리가 필요한 경우
    - CloudWatch의 모니터링 및 알람 기능과 연계하여 로그 기반 알림을 설정하고자 할 때
    - 다른 AWS 서비스(Lambda, S3 등)와 로그 데이터를 연동해야 하는 경우

---

#### 2.2.9 컨테이너 자원 할당 제한

##### 자원 제한의 필요성

- 컨테이너가 무제한으로 시스템 자원을 사용하면 호스트 시스템이나 다른 컨테이너에 영향을 줄 수 있습니다.
- 멀티테넌트 환경에서 공정한 자원 분배와 시스템 안정성을 보장하기 위해 자원 제한이 필수적입니다.
- 성능 예측 가능성과 비용 관리 측면에서도 중요한 역할을 합니다.

##### 자원 제한 확인 및 수정

1. 현재 설정 확인

    - **`docker inspect`** 명령어 출력 결과 내 "HostConfig" 속성 중 현재 컨테이너에 설정된 자원 제한을 확인할 수 있습니다.

2. 설정 변경

    - **`docker update [변경할 자원 제한] [컨테이너명]`**으로 변경 사항을 수정할 수 있습니다.

##### 컨테이너 메모리 제한

| 옵션 | 역할 | 단위 | 기본값 | 최솟값 |
|---|---|---|---|---|
| `--memory` | 컨테이너 최대 RAM 사용량 제한 | `m`(MB), `g`(GB) | 제한 없음 | 6MB |
| `--memory-swap` | 메모리 + SWAP 합산 최대 사용량 제한 | `m`, `g` | 메모리의 2배 | 메모리 제한과 동일값 |

```shell
## 512MB 메모리 제한
docker run --memory 512m nginx

## 1GB 메모리와 2GB 스왑 설정
docker run --memory 1g --memory-swap 2g nginx

## 스왑 비활성화 (메모리와 스왑을 같은 값으로 설정)
docker run --memory 1g --memory-swap 1g nginx
```

**`docker stats`** 명령어로 실시간 메모리 사용량을 확인할 수 있으며, 메모리 한계에 도달하면 컨테이너 내 프로세스가 OOM(Out of Memory) 킬러에 의해 종료될 수 있습니다.

##### 컨테이너 CPU 제한

1. --cpu-shares 옵션

    - `--cpu-shares`: 컨테이너에 CPU를 1개씩 할당하지 않고 시스템에 존재하는 CPU를 얼마나 나눠 쓸지 명시하는 옵션입니다.
    - 값의 비율에 따라 점유율이 달라집니다.
    - 기본값은 1024이며, 상대적인 가중치로 작동합니다.

```shell
docker run --cpu-shares 1024 nginx  # 기본 비율
docker run --cpu-shares 512 nginx   # 절반 비율
docker run --cpu-shares 2048 nginx  # 두 배 비율
```

2. --cpuset-cpus 옵션

    - `--cpuset-cpus`: 호스트에 CPU가 여러 개 있을 경우 특정 컨테이너가 특정 CPU만 사용하도록 설정할 수 있습니다.
    - index로 N번째 CPU를 사용할지 지정합니다.

```shell
docker run --cpuset-cpus 0 nginx      # 첫 번째 CPU만 사용
docker run --cpuset-cpus 0,1 nginx    # 첫 번째와 두 번째 CPU 사용
docker run --cpuset-cpus 0-3 nginx    # 0번부터 3번까지 CPU 사용
```

3. --cpu-period / --cpu-quota 옵션 (CFS 스케줄러)

    - `--cpu-period`: CFS 스케줄러의 주기를 설정합니다.
    - `--cpu-quota`: --cpu-period에 설정된 시간 중 CPU 스케줄링에 얼마나 할당할지를 설정합니다.
    - period에서 quota를 나눈 값만큼 컨테이너가 CPU의 시간을 할당받습니다.

```shell
docker run --cpu-period 100000 --cpu-quota 50000 nginx   # 50% CPU
docker run --cpu-period 100000 --cpu-quota 200000 nginx  # 2개 CPU 상당
```

4. --cpus 옵션

    - `--cpus`: `--cpu-period`, `--cpu-quota`와 동일하지만 직관적으로 CPU의 개수를 직접 제한할 수 있습니다.
    - 소수점으로 비율을 작성할 수 있습니다.

```shell
docker run --cpus 1.5 nginx  # 1.5개 CPU 사용
docker run --cpus 0.5 nginx  # 50% 제한
docker run --cpus 2 nginx    # 2개 CPU 사용
```

**`docker stats`** 명령어로 실행 중인 모든 컨테이너의 실시간 자원 사용량(CPU, 메모리, 네트워크 I/O, 블록 I/O)을 확인할 수 있습니다.

### 2.3 도커 이미지

#### 도커 허브 (Docker Hub)

##### 기본 개념

- 도커 허브는 Docker에서 공식적으로 제공하는 이미지 저장소로서, 도커 계정 보유 시 자유롭게 이미지를 올리고 내려받을 수 있습니다.
- `docker create/pull/run` 명령어로 이미지를 내려받을 때 Docker는 Docker Hub에서 이미지를 검색한 이후 내려받습니다.

##### 이미지 품질 및 안전성

1. 공식 이미지 확인

    - Docker Hub는 누구든지 이미지를 올릴 수 있기 때문에 Official 라벨이 없는 경우 사용법을 찾을 수 없거나 제대로 동작하지 않을 수 있습니다.
    - `Official Image`: Docker에서 공식적으로 관리하는 이미지로 보안 업데이트와 품질이 보장됩니다.
    - `Verified Publisher`: 신뢰할 수 있는 조직에서 제공하는 이미지입니다.

2. 이미지 검색 및 선택

    - **`docker search`** 명령어를 사용하여 직접 이미지를 검색하여 찾을 수도 있습니다.

**docker search 주요 옵션:**
- `--filter stars=N`: 최소 N개 이상의 stars를 받은 이미지만 검색
- `--filter is-official=true`: 공식 이미지만 검색
- `--limit N`: 검색 결과를 N개로 제한
- `--no-trunc`: 결과를 자르지 않고 전체 출력

```shell
## 이미지 검색
docker search nginx

## 필터링된 검색 (최소 stars 수)
docker search --filter stars=100 nginx

## 공식 이미지만 검색
docker search --filter is-official=true nginx

## 결과 개수 제한
docker search --limit 5 nginx
```

3. 이미지 선택 시 고려사항

    - `Stars`: 이미지의 인기도를 나타냅니다.
    - `Downloads`: 다운로드 수를 확인할 수 있습니다.
    - `Last Updated`: 최근 업데이트 날짜를 확인하여 활발히 관리되는지 판단합니다.

> [!CAUTION]
> Docker Hub에는 누구나 이미지를 업로드할 수 있습니다. Official 또는 Verified Publisher 라벨이 없는 이미지에는 악성 코드나 취약점이 포함될 수 있으므로, 프로덕션 환경에서는 반드시 공식 이미지 또는 검증된 이미지만 사용하세요.

#### 2.3.1 도커 이미지 생성

##### docker commit을 통한 이미지 생성

1. 기본 사용법

`docker commit [OPTIONS] CONTAINER [REPOSITORY:[TAG]]` - 컨테이너를 이미지로 변환할 수 있습니다.

2. 주요 옵션

    - `-a`: author를 의미하며 이미지의 작성자를 의미하는 메타데이터를 반영합니다.
    - `-m`: 커밋 메시지를 의미하며 이미지에 포함될 부가 설명을 작성합니다.
    - `-c`: Dockerfile 명령어를 추가로 적용할 수 있습니다.
    - `-p`: 커밋하는 동안 컨테이너를 일시 정지합니다.
    - `--change`: 이미지 생성 시 Dockerfile 명령어를 적용합니다.

3. 특징

    - 실행 중이거나 정지된 컨테이너 모두에서 커밋이 가능합니다.
    - 컨테이너 내 변경 사항을 생성하고 이를 이미지로 변환할 수 있습니다.

4. 태그 관리 명령어

    - **`docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]`** 명령어로 기존 이미지에 새로운 태그를 부여할 수 있습니다.
    - `SOURCE_IMAGE[:TAG]`: 태그를 부여할 원본 이미지
    - `TARGET_IMAGE[:TAG]`: 새로 생성할 이미지 태그

#### 2.3.2 이미지 구조 이해

##### 레이어 구조의 기본 원리

1. 이미지 레이어 확인

    - **`docker inspect`** 명령어로 이미지의 정보를 조회하면 이미지를 구성하는 Layer 정보를 알 수 있습니다.
    - A라는 이미지로 B라는 이미지를 새로 생성하면, A 이미지의 레이어를 유지하면서 새로운 레이어만 추가됨을 알 수 있습니다.

2. 레이어 누적 과정 상세 예시

**ubuntu:24.04 → test_commit:A → test_commit:B 생성 과정:**

```shell
## 1단계: ubuntu:24.04 베이스 이미지 (Layer 1)
## - 기본 Ubuntu 파일시스템 포함
## - 크기: 약 70MB

docker run -it --name step1 ubuntu:24.04
## 컨테이너 내에서: apt update && apt install curl
docker commit step1 test_commit:A

## 2단계: test_commit:A (Layer 1 + Layer 2)
## - Layer 1: ubuntu:24.04 레이어 (공유)
## - Layer 2: curl 설치로 인한 변경사항 (약 10MB 추가)
## - 총 이미지 크기: 80MB

docker run -it --name step2 test_commit:A
## 컨테이너 내에서: apt install nodejs npm
docker commit step2 test_commit:B

## 3단계: test_commit:B (Layer 1 + Layer 2 + Layer 3)
## - Layer 1: ubuntu:24.04 레이어 (공유)
## - Layer 2: curl 설치 레이어 (공유)
## - Layer 3: Node.js 설치로 인한 변경사항 (약 50MB 추가)
## - 총 이미지 크기: 130MB
```

3. 레이어 구조의 장점

    - `저장 공간 효율성`: 동일한 베이스 레이어를 여러 이미지가 공유합니다.
    - `빠른 이미지 빌드`: 변경된 레이어만 새로 생성하면 됩니다.
    - `네트워크 효율성`: 이미 존재하는 레이어는 다운로드하지 않습니다.

##### 이미지 히스토리 및 분석

1. 이미지 히스토리 확인

    - **`docker history`** 명령어를 사용하여 이를 좀 더 쉽게 확인할 수 있습니다.
    - 해당 명령어로 이미지가 어떤 레이어로 생성되었는지 알 수 있습니다.

**docker history 주요 옵션:**
- `--no-trunc`: 명령어나 ID를 자르지 않고 전체 출력
- `--format`: 출력 형식을 사용자 정의로 지정
- `-H`: 사람이 읽기 쉬운 크기 형식으로 출력 (기본값)
- `-q`: 이미지 ID만 출력

```shell
## 이미지 히스토리 확인
docker history test_commit:B

## 크기 정보와 함께 확인
docker history --format "table {{.ID}}\t{{.CreatedBy}}\t{{.Size}}" test_commit:B
```

2. 히스토리 출력 (test_commit:B)

```
IMAGE          CREATED BY                                      SIZE
abc123...      /bin/sh -c apt install nodejs npm              50MB
def456...      /bin/sh -c apt update && apt install curl      10MB
ghi789...      /bin/sh -c #(nop) ADD file:... in /             70MB
```

##### 이미지 삭제 관리

1. 기본 이미지 삭제

    - **`docker rmi`** 명령어를 사용하여 이미지를 삭제할 수 있습니다.
    - 단, 이미지를 사용 중인 컨테이너가 존재하는 경우 삭제할 수 없습니다.

**docker rmi 주요 옵션:**
- `-f, --force`: 강제로 이미지 삭제 (권장하지 않음)
- `--no-prune`: 태그가 없는 부모 이미지를 삭제하지 않음

```shell
## 이미지 삭제
docker rmi test_commit:A

## 여러 이미지 동시 삭제
docker rmi ubuntu:20.04 ubuntu:22.04

## 태그만 삭제 (다른 태그가 있는 경우)
docker rmi myapp:old-version
```

2. 강제 삭제의 문제점

    - **`-f`** 옵션을 사용하여 이미지를 강제로 삭제할 수 있지만 레이어 파일을 삭제하지 않고 이름만 지우기 때문에 의미가 없습니다.
    - 따라서 이미지를 지우려면 컨테이너를 먼저 지우고 나서 이미지를 지우는 순으로 가야 합니다.

```shell
## 올바른 삭제 순서
docker stop my-container
docker rm my-container
docker rmi my-image:tag
```

> [!IMPORTANT]
> `docker rmi -f`로 사용 중인 이미지를 강제 삭제하면 레이어 파일은 남고 이름(태그)만 제거되어 Dangling Image가 생성됩니다. 이미지를 완전히 제거하려면 반드시 컨테이너를 먼저 정지·삭제한 뒤 이미지를 삭제하세요.

3. Dangling Image 관리

    - 컨테이너가 사용 중인 이미지를 `docker rmi -f`로 삭제하면 이미지의 이름이 `<none>`으로 변경되며 이를 **Dangling Image**라고 합니다.
    - **`docker images -f dangling=true`** 명령어로 별도로 확인이 가능합니다.

**docker image prune 주요 옵션:**
- `-f, --force`: 확인 없이 자동으로 삭제
- `-a, --all`: 사용하지 않는 모든 이미지 삭제
- `--filter`: 특정 조건에 맞는 이미지만 삭제

##### 이미지 크기 최적화

1. 레이어 수 최소화

```shell
## 비효율적인 방법 (여러 레이어 생성)
docker run ubuntu:24.04
apt update
docker commit step1 temp1
apt install curl
docker commit step2 temp2

## 효율적인 방법 (한 번에 처리)
docker run ubuntu:24.04
apt update && apt install curl && apt clean
docker commit optimized-image
```

2. 불필요한 파일 정리

```shell
## 패키지 캐시 정리와 함께 설치
RUN apt update && apt install -y curl && apt clean && rm -rf /var/lib/apt/lists/*

## 임시 파일 정리
RUN wget http://example.com/file.tar.gz && \
    tar -xzf file.tar.gz && \
    rm file.tar.gz
```

#### 2.3.3 이미지 추출

##### docker save/load를 통한 이미지 백업

1. 이미지 추출 (save)

    - **`docker save`** 명령어로 컨테이너의 커맨드, 이미지 이름 및 태그 등 모든 메타데이터를 하나의 파일로 추출할 수 있습니다.
    - **`-o`** 옵션에는 추출할 파일명을 입력합니다.

**docker save 주요 옵션:**
- `-o, --output`: 출력 파일 경로 지정
- 여러 이미지를 동시에 지정 가능

```shell
## 단일 이미지 추출
docker save -o ubuntu-24.04.tar ubuntu:24.04

## 여러 이미지 동시 추출
docker save -o my-images.tar ubuntu:24.04 nginx:latest mysql:8.0
```

2. 이미지 복원 (load)

    - **`docker load`** 명령어로 추출된 이미지를 도커에 다시 로드할 수 있습니다.
    - 이미지의 모든 메타데이터를 `save`로 저장했기에 `load`로 이를 불러오면 이전의 이미지와 완전히 동일한 이미지가 엔진에 생성됩니다.

**docker load 주요 옵션:**
- `-i, --input`: 입력 파일 경로 지정
- `-q, --quiet`: 로드 과정에서 출력 최소화

```shell
## 이미지 파일 로드
docker load -i ubuntu-24.04.tar

## 압축된 이미지 로드
gunzip -c ubuntu-24.04.tar.gz | docker load

## 표준 입력을 통한 로드
cat my-images.tar | docker load
```

##### docker export/import의 차이점

1. export/import 특징

    - **`docker export`**와 **`docker import`** 명령어도 save/load처럼 유사한 기능을 하지만 export 모드는 컨테이너의 파일 시스템을 tar로 추출하여 컨테이너 및 이미지의 설정 정보를 저장하지 않습니다.

2. 사용 방법

**docker export 주요 옵션:**
- `-o, --output`: 출력 파일 경로 지정

**docker import 주요 옵션:**
- `-c, --change`: import 시 Dockerfile 명령어 적용
- `-m, --message`: import 시 커밋 메시지 설정

```shell
docker export my-container > container-filesystem.tar
## 또는 docker export -o container-filesystem.tar my-container 도 OK

## 설정과 함께 import
docker import --change "ENV DEBUG=true" --change "EXPOSE 8080" container-filesystem.tar my-app:v1.0
```

3. save/load vs export/import 비교

| 구분 | save/load | export/import |
|------|-----------|---------------|
| 대상 | 이미지 | 컨테이너 |
| 메타데이터 보존 | O (완전 보존) | X (일부 손실) |
| 레이어 구조 | 보존됨 | 단일 레이어로 병합 |
| 이미지 히스토리 | 보존됨 | 손실됨 |
| 파일 크기 | 상대적으로 큼 | 상대적으로 작음 |
| 용도 | 이미지 백업/배포 | 컨테이너 스냅샷 |

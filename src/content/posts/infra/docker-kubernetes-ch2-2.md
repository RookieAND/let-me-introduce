## 2. 도커 엔진

### 2.4 Dockerfile

#### 2.4.1 이미지를 생성하는 방법

#### 2.4.2 Dockerfile 작성

#### 2.4.3 Dockerfile 빌드

#### 2.4.4 기타 Dockerfile 명령어

#### 2.4.5 Dockerfile 로 빌드할 때 주의점

### 2.5 도커 데몬

도커를 사용할 때는 `docker` 라는 명령어를 사용하고, 이는 `which` 명령어로 조회 시 `/usr/bin/docker` 에 위치한다.  
실행 중인 도커 프로세스를 `ps aux` 로 조회하면 `/usr/bin/dockerd` 파일로 실행됨을 확인할 수 있다.  

`docker` 명령어를 관리하는 주체와 실제 도커 엔진을 관리하는 주체가 다르다는 것이다.  
이 둘의 관계를 이해하는 것이 도커 데몬을 파악하는 출발점이다.  

#### 2.5.1 도커의 구조

도커는 크게 두 가지 구조로 나뉜다.  
**클라이언트로서의 도커**와 **서버로서의 도커**다.  

컨테이너를 실제로 생성하고 실행하며 이미지를 관리하는 주체는 도커 서버다.  
도커 서버는 `dockerd` 프로세스로 동작하며, 외부에서 API 입력을 받아 기능을 수행한다.  
이렇게 `dockerd` 프로세스가 실행되어 서버로서 API 요청을 받을 준비가 된 상태를 **도커 데몬**이라고 한다.  

##### 막간. Daemon(데몬)이란 무엇인가?

데몬(Daemon)은 백그라운드에서 지속적으로 실행되며 특정 서비스나 기능을 제공하는 프로세스를 가리킨다.  
사용자가 직접 제어하지 않아도 묵묵히 실행 중이면서, 요청이 들어오면 응답하는 구조다.  

유닉스/리눅스 환경에서는 이름 끝에 `d` 를 붙이는 관례가 있다.  
`sshd`(SSH 서버), `httpd`(Apache 웹 서버), `dockerd`(도커 엔진)가 모두 데몬의 예시다.  

도커 데몬(`dockerd`)은 `docker` 명령어로 들어오는 API 요청을 받아서, 컨테이너 생성·실행·이미지 관리 등 실제 작업을 수행한다.  
사용자는 도커 데몬이 백그라운드에서 실행 중이어야 `docker run` 같은 명령어를 정상적으로 사용할 수 있다.  

##### 클라이언트와 데몬의 통신 구조

도커 클라이언트는 도커 데몬이 API를 받아 엔진의 기능을 수행할 수 있도록, 해당 API를 CLI 형태로 제공하는 역할을 한다.  
사용자가 `docker` 명령어를 사용하면 도커 클라이언트를 경유하는 것이고, 입력된 명령어는 로컬에 존재하는 도커 데몬에게 API 형태로 전달된다.  

이때 도커 클라이언트는 `/var/run/docker.sock` 에 위치한 **Unix 소켓**을 통해 도커 데몬에게 명령을 전달한다.  
Unix 소켓은 같은 호스트 내에 있는 프로세스끼리 파일 시스템을 통해 통신하는 IPC(Inter-Process Communication) 수단이다.  
TCP를 활용해서 원격에 위치한 도커 데몬을 제어하는 방법도 별도로 존재한다.  

전체 실행 흐름을 정리하면 아래와 같다.  

| 단계 | 주체 | 동작 |
|---|---|---|
| 1 | 사용자 | `docker version` 같은 명령어를 터미널에 입력 |
| 2 | 도커 클라이언트 | `/var/run/docker.sock` 유닉스 소켓을 통해 도커 데몬에게 API 전달 |
| 3 | 도커 데몬 | 명령어를 파싱하고 대응되는 작업을 수행 |
| 4 | 도커 데몬 | 수행 결과를 클라이언트에 반환 |
| 5 | 도커 클라이언트 | 결과를 사용자에게 출력 |

```shell
## 도커 클라이언트와 서버 버전 정보 확인
docker version

## 도커 데몬의 상세 정보 확인 (스토리지 드라이버, 네트워크 등)
docker info
```

#### 2.5.2 도커 데몬 실행

우분투에서는 도커가 설치되면 자동으로 서비스로 등록된다.  
호스트가 재시작될 때 도커 데몬도 함께 시작되는 구조다.  

명시적으로 도커 프로세스를 시작하고 정지하는 명령어는 아래와 같다.  

```shell
## 도커 서비스 시작 / 정지 (SysV init 방식)
service docker start
service docker stop

## systemd 기반 환경에서의 제어
systemctl start docker
systemctl stop docker
systemctl restart docker

## 도커 서비스 상태 확인
systemctl status docker
```

`dockerd` 명령어는 `/usr/bin/dockerd` 에 존재하기 때문에, 서비스를 거치지 않고 직접 도커 데몬을 실행하는 것도 가능하다.  

```shell
## 직접 도커 데몬 실행 (포그라운드)
dockerd

## 실행 중인 도커 프로세스 확인
ps aux | grep dockerd
```

> [!NOTE]  
> `dockerd` 를 직접 실행하면 포그라운드에서 동작하므로 터미널이 점유된다. 실제 운영 환경에서는 `service` 명령어나 systemd를 통해 백그라운드 서비스로 관리하는 것이 일반적이다.  

#### 2.5.3 도커 데몬 설정

`dockerd --help` 로 사용 가능한 옵션 목록을 확인할 수 있다.  
주요 설정 옵션들을 하나씩 살펴보자.  

##### 1. -H: 도커 데몬의 API를 사용할 수 있는 방법을 추가한다

아무런 옵션 없이 도커 데몬을 실행하면, 도커 클라이언트(`/usr/bin/docker`)를 위한 Unix 소켓인 `/var/run/docker.sock` 만 사용한다.  

`-H` 옵션에 IP 주소 및 포트 번호를 입력하면 원격 API인 **Docker Remote API**로 외부에 위치한 도커를 제어할 수 있다.  
Remote API는 도커 클라이언트와 다르게 로컬에 있는 도커 데몬이 아니어도 제어가 가능하며, RESTful API 형식이기 때문에 HTTP로 제어할 수 있다.  

단, `-H` 에 Remote API만을 위한 바인딩 주소를 입력하면 기존 호스트 내 유닉스 소켓이 비활성화된다.  
그래서 일반적으로는 Unix 소켓 주소와 Remote API 바인딩 주소를 함께 입력한다.  

```shell
## Unix 소켓과 Remote API를 동시에 활성화
dockerd -H unix:///var/run/docker.sock -H tcp://0.0.0.0:2375 --tls=false

## 환경변수로 원격 데몬에 docker 명령어 실행
DOCKER_HOST=tcp://192.168.0.100:2375 docker ps

## docker context로 원격 데몬을 컨텍스트로 등록
docker context create remote --docker "host=tcp://192.168.0.100:2376"

## 등록된 컨텍스트 목록 확인
docker context ls

## 특정 컨텍스트로 전환
docker context use remote
```

> [!WARNING]  
> `--tls=false` 로 TLS를 비활성화하면 해당 포트로 누구나 도커 데몬에 접근할 수 있게 된다. 외부에 노출되는 Remote API라면 반드시 TLS를 활성화하여 인증을 요구하도록 설정해야 한다.  

`docker context` 로 특정 도커 데몬을 컨텍스트로 저장해두면, 필요에 따라 전환하면서 명령어를 사용할 수 있다.  
`docker context ls` 로 현재 환경에 등록된 컨텍스트 목록을 확인할 수 있다.  

##### 2. --tlsverify: 도커 데몬에 TLS 보안을 적용한다

원격으로 도커 데몬에 접근할 때 인증 없이 열어두는 것은 심각한 보안 위협이다.  
`--tlsverify` 옵션을 사용하면 TLS 기반의 인증을 요구하도록 설정할 수 있다.  

###### TLS(Transport Layer Security)란?

TLS는 네트워크 통신을 암호화하고 신원을 검증하는 보안 프로토콜이다.  
HTTPS가 HTTP에 TLS를 적용한 것처럼, 도커 Remote API에도 TLS를 적용해서 도청과 위변조, 불법 접근을 막을 수 있다.  

TLS는 공개 키 기반 암호화(PKI) 구조를 사용한다.  
인증 기관(CA)이 발급한 인증서로 서버와 클라이언트의 신원을 각각 검증하고, 그 위에서 통신 내용을 암호화하는 방식이다.  

###### 보안 적용에 필요한 파일

| 파일 | 역할 | 위치 |
|---|---|---|
| `ca.pem` | 인증 기관(CA) 인증서. 서버·클라이언트 인증서를 모두 서명 | 서버 + 클라이언트 |
| `server-cert.pem` | CA가 서명한 서버 인증서 | 서버 |
| `server-key.pem` | 서버 개인 키 | 서버 |
| `cert.pem` | CA가 서명한 클라이언트 인증서 | 클라이언트 |
| `key.pem` | 클라이언트 개인 키 | 클라이언트 |

서버 측 파일을 먼저 생성한다.  
`openssl` 로 CA 키와 인증서를 만들고, 서버 키와 CSR(Certificate Signing Request)을 생성한 뒤 CA로 서명받아 서버 인증서를 완성한다.  
클라이언트 측도 동일하게 키와 CSR을 만들고 CA로 서명받으면 된다.  

보안 적용을 위한 파일이 준비되면 `--tlsverify` 옵션으로 TLS 보안을 활성화한다.  

```shell
## TLS 활성화 상태로 도커 데몬 실행
dockerd --tlsverify \
  --tlscacert=ca.pem \
  --tlscert=server-cert.pem \
  --tlskey=server-key.pem \
  -H tcp://0.0.0.0:2376

## 클라이언트에서 인증서를 명시해서 원격 데몬에 접속
docker --tlsverify \
  --tlscacert=ca.pem \
  --tlscert=cert.pem \
  --tlskey=key.pem \
  -H tcp://192.168.0.100:2376 ps

## 환경변수로 TLS 설정을 지정하는 방법
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=~/.docker/certs
export DOCKER_HOST=tcp://192.168.0.100:2376
docker ps
```

클라이언트에서 원격 데몬에 접속할 때 설정할 수 있는 주요 환경변수는 아래와 같다.  

- `DOCKER_CERT_PATH`: 도커 데몬 인증에 필요한 파일의 디렉토리 경로
- `DOCKER_TLS_VERIFY`: TLS 인증 사용 여부 (`1` = true)
- `DOCKER_HOST`: 연결할 도커 데몬의 주소

> [!TIP]  
> TLS 포트는 관례적으로 2376을 사용한다. TLS 없이 열어두는 포트는 2375가 관례다. 보안이 필요한 환경이라면 2375 포트를 아예 열지 않는 것이 권장된다.  

##### 3. --storage-driver: 도커 스토리지 드라이버 변경

도커는 특정 스토리지 백엔드 기술을 활용하여 컨테이너 및 이미지를 저장하고 관리한다.  
도커에서는 이 기술을 **스토리지 드라이버**라고 부른다.  

스토리지 드라이버는 컨테이너가 이미지를 불변(immutable)한 읽기 전용 파일 시스템으로 사용할 수 있도록 만들어주는 핵심 기술이다.  

현재 도커가 사용 중인 스토리지 드라이버는 `docker info` 명령어로 확인할 수 있다.  

```shell
docker info | grep "Storage Driver"
```

Docker v28.0.1 기준으로 기본 스토리지 드라이버는 `overlay2` 이며, 리눅스 배포판에서 별도 설정 없이 사용 가능한 대표 기술이다.  

| 드라이버 | 특징 |
|---|---|
| `overlay2` | 기본값. 리눅스 커널 내장, 성능 우수 |
| `btrfs` | B-tree 파일 시스템 기반, 스냅샷 지원 |
| `zfs` | ZFS 파일 시스템 기반, 고급 기능 제공 |

이 중 하나만 선택해서 사용할 수 있다.  
도중에 드라이버를 변경하면 이전 스토리지에서 사용하던 이미지와 컨테이너는 더 이상 사용할 수 없게 된다.  

```shell
## 특정 스토리지 드라이버로 도커 데몬 실행
dockerd --storage-driver overlay2

## daemon.json 파일로 영구 설정 (권장)
## /etc/docker/daemon.json 에 아래 내용 작성
## { "storage-driver": "overlay2" }

## 변경 후 데몬 재시작
systemctl restart docker
docker info | grep "Storage Driver"
```

> [!CAUTION]  
> 운영 중인 환경에서 스토리지 드라이버를 변경하면 기존 이미지와 컨테이너 데이터를 모두 잃는다. 드라이버 변경은 초기 설치 시 결정하는 것이 원칙이며, 불가피한 경우 반드시 데이터를 백업한 뒤 변경해야 한다.  

###### 스토리지 드라이버의 원리: Copy-on-Write

도커 스토리지는 기본적으로 **CoW(Copy on Write)** 전략으로 동작한다.  

이미지 내부의 파일을 변경할 때, 원본 이미지 레이어는 건드리지 않는다.  
변경 대상 파일을 컨테이너 레이어에 복사한 뒤, 복사된 파일에만 쓰기 작업을 수행한다.  
원본을 수정하지 않고 복사본에 변경 사항을 반영하여 격리하는 방식이다.  

컨테이너를 이미지로 커밋하면, 수정된 사항이 스냅샷으로 생성되어 새로운 레이어로 추가된다.  
이 구조 덕분에 여러 컨테이너가 동일한 이미지 레이어를 공유하면서도 서로의 변경 사항에 영향을 주지 않는다.  

###### overlay2 드라이버 구조

overlay2는 리눅스 커널의 OverlayFS를 기반으로 동작한다.  
컨테이너를 마운트할 때 세 가지 디렉토리 계층으로 구성된다.  

| 계층 | 역할 |
|---|---|
| `lowerdir` | 이미지 레이어(들). 읽기 전용으로 마운트됨 |
| `upperdir` | 컨테이너 레이어. 컨테이너에서 발생하는 모든 변경 사항이 기록됨 |
| `merged` | lowerdir와 upperdir를 합쳐 컨테이너에게 단일 파일 시스템으로 보여주는 마운트 지점 |

다른 스토리지 드라이버와 달리 여러 개의 이미지 레이어가 각각 별도 디렉토리로 존재하는 것이 아니다.  
하나의 컨테이너 마운트 지점(`merged`)에서 여러 이미지 레이어를 통합하여 단일 파일 시스템처럼 보여주는 방식이다.  

파일을 읽을 때는 `merged` → `upperdir` → `lowerdir` 순서로 탐색한다.  
`upperdir` 에 파일이 있으면 그것을 반환하고, 없으면 `lowerdir` 에서 찾는다.  
파일을 수정할 때는 `lowerdir` 에서 `upperdir` 로 파일을 복사한 뒤 수정한다. 이것이 CoW가 실제로 동작하는 지점이다.  

```shell
## overlay2 마운트 구조 직접 확인
docker run -d --name test-container nginx

## 컨테이너 ID 확인
CONTAINER_ID=$(docker inspect test-container --format '{{.Id}}')

## /var/lib/docker/overlay2 에서 해당 컨테이너의 레이어 확인
ls /var/lib/docker/overlay2/ | grep ${CONTAINER_ID:0:12}

## 컨테이너의 lowerdir, upperdir, merged 경로 확인
docker inspect test-container --format '{{json .GraphDriver.Data}}'
```

컨테이너 안에서 파일을 생성하거나 수정하면, 호스트의 `upperdir` 디렉토리에 해당 파일이 쌓인다.  
`docker commit` 으로 이미지를 만들면 `upperdir` 의 변경 사항이 새 이미지 레이어로 저장된다.  

###### btrfs 드라이버 구조

btrfs(B-tree File System)는 서브볼륨(subvolume)과 스냅샷(snapshot)을 네이티브로 지원하는 파일 시스템이다.  
도커에서 btrfs 드라이버를 사용하면 이미지 레이어는 **서브볼륨**, 컨테이너 레이어는 **스냅샷**으로 관리한다.  

| 개념 | 역할 |
|---|---|
| 서브볼륨 | 독립적인 파일 시스템 트리. 이미지의 각 레이어에 대응 |
| 스냅샷 | 서브볼륨의 특정 시점 복사본. 컨테이너 레이어에 대응 |

이미지를 pull하면 각 레이어가 btrfs 서브볼륨으로 생성된다.  
컨테이너를 생성하면 최상위 이미지 레이어 서브볼륨을 기반으로 쓰기 가능한 스냅샷을 만든다.  
컨테이너 내에서 파일을 수정하면 스냅샷 안에 변경 사항이 기록된다.  
overlay2의 CoW와 달리, btrfs는 블록 수준에서 변경된 블록만 기록하므로 대용량 파일 수정 시 더 효율적이다.  

**btrfs를 도커 스토리지로 등록하는 방법**  

```shell
## 1. btrfs 파일 시스템 설치
apt-get install -y btrfs-progs

## 2. btrfs 파일 시스템으로 포맷할 디바이스 준비
## (기존 도커 데이터가 있다면 반드시 백업 먼저)
mkfs.btrfs /dev/sdb

## 3. 도커 데이터 디렉토리에 마운트
systemctl stop docker
mount /dev/sdb /var/lib/docker

## 4. /etc/fstab 에 영구 마운트 등록
echo "/dev/sdb /var/lib/docker btrfs defaults 0 0" >> /etc/fstab

## 5. daemon.json 에 스토리지 드라이버 변경
cat > /etc/docker/daemon.json <<EOF
{
  "storage-driver": "btrfs"
}
EOF

## 6. 도커 재시작 및 확인
systemctl start docker
docker info | grep "Storage Driver"

## 7. btrfs 서브볼륨 목록 확인 (이미지·컨테이너 레이어 확인)
btrfs subvolume list /var/lib/docker
```

###### ZFS 드라이버 구조

ZFS(Zettabyte File System)는 원래 Sun Microsystems에서 개발한 파일 시스템으로, 고급 스냅샷, 압축, 무결성 검사, 데이터 중복 제거 기능을 제공한다.  
도커에서 ZFS 드라이버를 사용하면 이미지 레이어는 **ZFS 데이터셋(filesystem)**, 컨테이너 레이어는 **ZFS 스냅샷과 클론**으로 관리한다.  

읽기·쓰기 흐름은 아래와 같다.  

1. **이미지 pull**: 각 레이어가 ZFS 데이터셋으로 생성된다. 상위 레이어는 하위 레이어 데이터셋의 스냅샷을 기반으로 만들어진다.
2. **컨테이너 생성**: 최상위 이미지 레이어 데이터셋의 스냅샷을 생성하고, 그 스냅샷으로부터 **클론(clone)**을 만든다. 이 클론이 컨테이너의 쓰기 레이어가 된다.
3. **파일 쓰기**: 컨테이너 내에서 파일을 수정하면 클론 데이터셋에 기록된다. 원본 스냅샷은 변경되지 않는다.
4. **컨테이너 커밋**: 클론 데이터셋의 스냅샷을 생성하여 새 이미지 레이어로 등록한다.

**ZFS를 도커 스토리지로 등록하는 방법**  

```shell
## 1. ZFS 커널 모듈 및 도구 설치 (Ubuntu 기준)
apt-get install -y zfsutils-linux

## 2. ZFS 풀 생성 (디바이스를 ZFS 스토리지로 초기화)
## (기존 도커 데이터가 있다면 반드시 백업 먼저)
zpool create -f zpool-docker /dev/sdb

## 3. ZFS 파일 시스템 생성 및 도커 디렉토리에 마운트
systemctl stop docker
zfs create -o mountpoint=/var/lib/docker zpool-docker/docker

## 4. daemon.json 에 스토리지 드라이버 변경
cat > /etc/docker/daemon.json <<EOF
{
  "storage-driver": "zfs"
}
EOF

## 5. 도커 재시작 및 확인
systemctl start docker
docker info | grep "Storage Driver"

## ZFS 데이터셋 목록 확인 (이미지·컨테이너 레이어 확인)
zfs list

## ZFS 스냅샷 목록 확인
zfs list -t snapshot

## ZFS 풀 상태 확인
zpool status
```

ZFS는 디스크 I/O 성능보다 데이터 무결성과 안정성이 중요한 환경에 적합하다.  
btrfs와 마찬가지로 ZFS 파일 시스템 위에서만 동작하므로 별도 파티션이나 디바이스가 필요하다.  

#### 2.5.4 도커 데몬 모니터링

도커 데몬의 상태를 확인하고 문제를 진단하는 다양한 방법이 있다.  

##### 도커 데몬 디버그 모드

`dockerd -D` 옵션으로 도커 데몬을 디버그 모드로 실행하면 상세한 로그를 출력한다.  
어떤 API 요청이 들어오고 어떻게 처리되는지 추적할 때 유용하다.  

```shell
## 디버그 모드로 도커 데몬 실행
dockerd -D

## daemon.json 으로 영구 설정
## { "debug": true }

## 실행 중인 데몬에 SIGUSR1 시그널을 보내 스택 트레이스 덤프
kill -SIGUSR1 $(pidof dockerd)
```

##### docker events

`docker events` 명령어는 도커 데몬에서 발생하는 이벤트를 실시간으로 출력한다.  
컨테이너의 생성, 시작, 정지, 삭제 등의 이벤트를 스트림으로 확인할 수 있다.  

```shell
## 실시간 이벤트 스트림 확인
docker events

## 이벤트 타입으로 필터링 (container, image, network, volume)
docker events --filter type=container

## 특정 이벤트 종류만 필터링
docker events --filter event=start
docker events --filter event=die

## 특정 컨테이너의 이벤트만 확인
docker events --filter container=my-container

## 특정 시간 이후의 이벤트만 확인
docker events --since "2024-01-01T00:00:00"

## 특정 시간 범위의 이벤트 확인
docker events --since "1h" --until "30m"
```

`docker system events` 도 동일한 기능을 수행하며, 컨테이너뿐 아니라 이미지·볼륨·네트워크 이벤트도 함께 조회할 수 있다.  

이벤트 출력 형식은 아래와 같다.  

```
2024-01-15T10:23:45.123456789Z container start abc123 (image=nginx, name=my-nginx)
2024-01-15T10:24:10.987654321Z container die abc123 (exitCode=0, image=nginx, name=my-nginx)
```

##### docker stats

`docker stats` 명령어는 실행 중인 컨테이너의 자원 사용량을 실시간으로 보여준다. `top` 명령어의 도커 버전이라고 이해하면 쉽다.  

```shell
## 모든 컨테이너 자원 사용량 실시간 모니터링
docker stats

## 특정 컨테이너만 확인
docker stats my-container

## 여러 컨테이너 동시 확인
docker stats container1 container2

## 한 번만 출력하고 종료 (스트림 없이)
docker stats --no-stream

## 출력 형식 사용자 정의 (Go 템플릿 사용)
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

## JSON 형태로 출력 (스크립트 연동 등에 활용)
docker stats --no-stream --format "{{json .}}"
```

`--format` 에 사용할 수 있는 필드 목록은 아래와 같다.  

| 필드 | 출력 컬럼 | 의미 |
|---|---|---|
| `{{.Name}}` | `NAME` | 컨테이너 이름 |
| `{{.ID}}` | `CONTAINER ID` | 컨테이너 ID (축약) |
| `{{.CPUPerc}}` | `CPU %` | CPU 사용률 |
| `{{.MemUsage}}` | `MEM USAGE / LIMIT` | 현재 메모리 사용량 / 설정된 한계 |
| `{{.MemPerc}}` | `MEM %` | 메모리 사용률 |
| `{{.NetIO}}` | `NET I/O` | 네트워크 입출력 누적량 |
| `{{.BlockIO}}` | `BLOCK I/O` | 디스크 입출력 누적량 |
| `{{.PIDs}}` | `PIDS` | 컨테이너 내 프로세스 수 |

`MEM USAGE / LIMIT` 에서 LIMIT이 표시되지 않는다면 컨테이너에 메모리 제한이 설정되지 않은 것이다.  
호스트 전체 메모리가 상한선이 되므로 프로덕션 환경에서는 반드시 `--memory` 옵션으로 제한을 걸어두는 것이 좋다.  

##### docker system df

`docker system df` 는 도커가 사용 중인 디스크 공간을 요약해서 보여준다.  
디스크 사용량이 급증했을 때 원인을 파악하는 데 가장 먼저 사용하게 되는 명령어다.  

```shell
## 도커 디스크 사용량 요약 확인
docker system df

## 항목별 상세 정보 출력 (이미지·컨테이너·볼륨 각각 나열)
docker system df -v
```

기본 출력(`docker system df`)은 타입별 집계 정보를 보여준다.  

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          10        3         2.4GB     1.8GB (75%)
Containers      5         2         120MB     80MB (66%)
Local Volumes   8         3         500MB     200MB (40%)
Build Cache     25        0         1.2GB     1.2GB
```

| 컬럼 | 의미 |
|---|---|
| `TOTAL` | 전체 개수 |
| `ACTIVE` | 현재 사용 중인 개수 (컨테이너가 참조 중인 이미지·볼륨 등) |
| `SIZE` | 실제 점유 중인 디스크 크기 |
| `RECLAIMABLE` | 현재 미사용 상태여서 삭제 시 회수 가능한 크기 |

상세 출력(`docker system df -v`)은 이미지는 이미지별로, 컨테이너는 컨테이너별로, 볼륨은 볼륨별로 각각 나열해서 보여준다.  
어떤 이미지가 공간을 많이 차지하는지, 어떤 컨테이너가 오래된 로그로 부풀어 있는지 정확히 파악할 수 있다.  

> [!TIP]  
> `docker system prune` 명령어를 사용하면 정지된 컨테이너, 사용하지 않는 네트워크, 댕글링 이미지, 빌드 캐시를 한 번에 정리할 수 있다. `-a` 옵션을 추가하면 사용하지 않는 모든 이미지까지 제거하므로 디스크 공간을 대폭 확보할 수 있다.  

```shell
## 사용하지 않는 리소스 일괄 정리
docker system prune

## 사용하지 않는 이미지까지 모두 정리
docker system prune -a

## 볼륨까지 포함하여 정리 (데이터 유실 주의)
docker system prune -a --volumes
```

##### CAdvisor

CAdvisor(Container Advisor)는 Google이 오픈소스로 공개한 컨테이너 모니터링 도구다.  
도커 컨테이너의 CPU, 메모리, 네트워크, 파일 시스템 사용량을 시각화된 웹 UI로 확인할 수 있다.  

`docker stats` 가 현재 시점의 스냅샷을 보여주는 것과 달리, CAdvisor는 시계열 데이터를 수집하고 대시보드로 제공한다.  
Prometheus, Grafana와 연동하면 장기적인 성능 추이 분석도 가능하다.  

```shell
docker run \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  --detach=true \
  --name=cadvisor \
  gcr.io/cadvisor/cadvisor
```

실행 후 `http://localhost:8080` 에 접속하면 컨테이너별 자원 사용 현황을 웹 UI로 확인할 수 있다.  

#### 2.5.5 Python Remote API를 활용한 도커 사용

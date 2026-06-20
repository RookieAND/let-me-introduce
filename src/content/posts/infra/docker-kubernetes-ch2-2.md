## 2. 도커 엔진

### 2.4 Dockerfile

#### 2.4.1 이미지를 생성하는 방법

#### 2.4.2 Dockerfile 작성

#### 2.4.3 Dockerfile 빌드

#### 2.4.4 기타 Dockerfile 명령어

#### 2.4.5 Dockerfile 로 빌드할 때 주의점

### 2.5 도커 데몬

#### 2.5.1 도커의 구조

도커의 구조는 총 두 개로 나뉨

1. 도커 클라이언트
    - docker 명령어 기반의 CLI 인터페이스 제공
    - 입력된 명령어를 도커 서버에 전달하여 해결
    - 유닉스 소켓을 활용하여 도커 Daemon 에게 명령 전달
2. 도커 서버
    - 컨테이너를 실제로 생성하고 관리하는 주체
    - dockerd 프로세스로 동작함

#### 2.5.2 도커 데몬 실행

시작, 정지 명령어

service docker start
service docker stop

dockerd 를 입력하면 도커 데몬 실행 (/var/run/docker.sock 에서 명령을 입력 받음음)

#### 2.5.3 도커 데몬 설정

--help 로 확인 가능

-H : 도커 데몬의 API 를 사용할 수 있는 방법 추가 (TCP 통신 등)
원격 호스트에서 직접 IP 기반으로 통신도 되면서 클라이언트 단의 통신 (Unix Socket) 도 가능

DOCKER_HOST 가 있다면 해당 Daemon 에 API 요청 전달함

docker context 로 여러 설정을 전환하면서 사용도 가능 

--tlsverify : 도커 데몬에 보안 적용 (pem 키 생성 필요)

--storage-driver : 도커 스토리지 드라이버 변경 (overlay2 가 기본값, zfs 등..)

도커 스토리지는 기본적으로 Cow (Copy on Write) 전략을 사용하여 관리
이미지 내부의 파일 변경 시 이를 컨테이너 레이어에 복사하고 거기에 쓰기 변경 작업을 시행 (복사 후 수정)
컨테이너를 이미지로 만들면 수정된 사항이 스냅숏으로 생성되어 단일 이미지로 치환됨 

원본을 수정하지 않고 복사본에 수정 사항을 반영한 후 변경된 사항을 격리.

overlay2, zfs, btrfs 등 자세한 내용은 정리 필요


#### 2.5.4 도커 데몬 모니터링

도커 데몬 디버그 모드

dockerd -D

events stats system df 명령어

docker events
docket system events -> 이벤트 발생 시 명령어 출력 (type 으로 필터링 가능)

docker stats -> 자원 사용량 관리

docker system df 는 도커에서 사용 중인 이미지 컨테이너 로컬 볼륨의 개수 크기, 삭제함으로서 확보 가능한 공간 

CAdvisor => 모니터링 도구래래

#### 2.5.5 Python Remote API 를 활용한 도커 사용용

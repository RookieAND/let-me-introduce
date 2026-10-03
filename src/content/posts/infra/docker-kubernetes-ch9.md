## 9. 퍼시스턴트 볼륨과 퍼시스턴트 볼륨 클레임

데이터베이스처럼 Pod 안에 데이터를 계속 쌓아두어야 하는 **Stateful** 한 애플리케이션을 떠올려보자.
Deployment 로 Pod 를 만들었다면, 그 안에 저장된 데이터는 어떻게 영속적으로 보존할 수 있을까?

Docker 시절에는 `-v` 옵션으로 호스트의 디렉토리를 컨테이너에 마운트해두면 그만이었다.
컨테이너가 삭제되어도 호스트 파일시스템에 파일이 남아 있으니 데이터 유실 걱정이 크지 않았다.

쿠버네티스에서도 같은 방식이 없는 건 아니다.
`hostPath` 를 쓰면 워커 노드의 특정 디렉토리를 그대로 Pod 에 마운트할 수 있다.
그런데 여기서부터 문제가 시작된다.

쿠버네티스는 여러 노드로 구성된 클러스터 환경을 기본 전제로 삼는다.
Pod 는 스케줄러의 판단에 따라 언제든 다른 노드로 옮겨질 수 있다.
`hostPath` 로 A 노드에 저장해둔 데이터는, Pod 가 B 노드로 재배치되는 순간 접근 불가능해진다.
호스트 서버 자체에 장애라도 나면 그대로 유실이다.

이 문제를 해결하기 위해 등장한 것이 **퍼시스턴트 볼륨 (Persistent Volume, PV)** 이다.
어떤 워커 노드에서도 네트워크로 접근할 수 있는 스토리지를 마운트하는 방식이라, Pod 가 어느 노드로 옮겨가더라도 같은 데이터에 계속 접근할 수 있다.
NFS, AWS EBS, Ceph, GlusterFS 등이 대표적인 백엔드다.

정리하면 쿠버네티스의 볼륨은 성격에 따라 크게 세 갈래로 나뉜다.

| 볼륨 유형 | 대표 종류 | 특징 |
|---|---|---|
| 로컬 볼륨 | `hostPath`, `emptyDir` | 노드나 Pod 로컬에서만 유효. 단순하지만 이동에 취약 |
| 네트워크 볼륨 | NFS, iSCSI, Ceph | 네트워크로 스토리지에 접근. 노드 이동에도 데이터 유지 |
| 클라우드 볼륨 | AWS EBS, GCE PD, Azure Disk | 클라우드 벤더가 제공하는 관리형 블록 스토리지 |

이번 챕터에서는 로컬 볼륨부터 시작해 네트워크 볼륨, 그리고 이 위에 얹혀 있는 PV·PVC 추상화까지 순서대로 살펴본다.

---

### 9.1 로컬 볼륨 — hostPath 와 emptyDir

가장 먼저 다룰 두 종류는 로컬 스코프에서 동작하는 볼륨이다.
`hostPath` 는 호스트와 Pod 사이에서, `emptyDir` 은 같은 Pod 안의 컨테이너 사이에서 데이터를 주고받는 데 쓴다.

둘 다 사용 방식은 단순하지만, 데이터가 노드 밖으로 나가지 않는다는 공통된 제약이 있다.

---

#### 9.1.1 hostPath — 워커 노드의 로컬 디렉토리를 볼륨으로

호스트의 특정 디렉토리를 Pod 안으로 마운트하는 방식이다.
앞서 [7.2](/posts/docker-kubernetes-ch7) 에서 ConfigMap 을 Pod 의 Volume 으로 붙였던 흐름과 거의 동일하다.
`spec.volumes` 에 볼륨을 정의해두고, `spec.containers.volumeMounts` 에서 참조해 컨테이너 내부 경로에 마운트한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-example
spec:
  containers:
    - name: my-app
      image: nginx:latest
      volumeMounts:
        - name: host-volume
          mountPath: /etc/data       # 컨테이너 내부 마운트 경로
  volumes:
    - name: host-volume
      hostPath:
        path: /tmp                    # 워커 노드의 실제 경로
        type: Directory
```

`type` 항목은 마운트 대상이 반드시 존재해야 하는지, 없다면 자동으로 만들지 여부를 결정한다.

| type | 동작 |
|---|---|
| `Directory` | 경로가 반드시 디렉토리로 존재해야 함 |
| `DirectoryOrCreate` | 없으면 새로 생성 |
| `File` | 반드시 파일로 존재해야 함 |
| `FileOrCreate` | 없으면 새로 생성 |

편해 보이지만 실전에서 이 방식만으로 데이터를 보존하는 건 위험하다.
Pod 가 다른 노드로 스케줄링되는 순간, 이전 노드에 저장해둔 파일은 완전히 남남이 된다.
`nodeAffinity` 로 특정 노드에 고정 배치하는 방법이 있긴 하지만, 호스트 서버 자체가 죽으면 이 방어도 소용없다.

그렇다면 `hostPath` 는 언제 쓰는 걸까?
클러스터의 **모든 노드에 하나씩** 배치되어야 하는 특수한 Pod 에 어울린다.
로그 수집기, 모니터링 에이전트 (`Fluentd`, `Node Exporter` 등) 처럼 각 노드의 로컬 파일을 읽어야 하는 DaemonSet 이 대표적이다.
데이터를 "보존" 하는 목적이 아니라, 각 노드의 상태를 "읽어오는" 목적으로 쓰이는 셈이다.

> [!CAUTION]
> `hostPath` 는 호스트의 파일시스템을 그대로 노출하기 때문에 잘못 마운트하면 클러스터의 보안 경계가 무너질 수 있다. `/`, `/etc`, `/var/run/docker.sock` 같은 민감한 경로는 절대 피하고, 필요하다면 별도 계정과 격리된 디렉토리를 준비해두자.

---

#### 9.1.2 emptyDir — 파드 내 컨테이너 간 임시 데이터 공유

이름 그대로 **빈 상태로 시작하는 임시 저장 공간** 이다.
Pod 가 생성될 때 빈 디렉토리로 만들어지고, Pod 가 삭제되면 그 안의 데이터도 함께 사라진다.

용도는 크게 두 가지다.
Pod 실행 중 잠깐 필요한 캐시 파일을 담아두는 스크래치 공간으로 쓰거나, **같은 Pod 안의 여러 컨테이너가 파일을 주고받는 통로** 로 쓴다.
후자가 훨씬 자주 마주치는 시나리오다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: emptydir-example
spec:
  containers:
    - name: writer                              # 파일을 생성하는 컨테이너
      image: busybox
      command: ["sh", "-c", "while true; do date >> /data/log; sleep 5; done"]
      volumeMounts:
        - name: shared
          mountPath: /data
    - name: reader                              # 같은 파일을 읽는 컨테이너
      image: nginx:latest
      volumeMounts:
        - name: shared
          mountPath: /usr/share/nginx/html      # 웹 서버의 Root Directory 에 마운트
  volumes:
    - name: shared
      emptyDir: {}                              # 빈 디렉토리로 시작
```

위 예시에서 `writer` 컨테이너가 `/data/log` 에 남긴 로그를 `reader` (Nginx) 는 `/usr/share/nginx/html/log` 로 그대로 읽는다.
두 컨테이너가 동일한 볼륨을 각자 다른 마운트 경로로 참조하는 셈이다.

이 패턴은 **사이드카 (Sidecar)** 컨테이너 구성에서 특히 진가를 발휘한다.
Git 저장소에서 소스코드를 받아오는 사이드카가 `emptyDir` 에 코드를 내려두면, 옆의 애플리케이션 컨테이너가 그 파일을 곧바로 서비스에 반영한다.
컨테이너끼리 굳이 네트워크로 파일을 주고받을 필요가 없다.

기본 `emptyDir` 은 노드의 디스크에 저장되지만, `medium: Memory` 를 지정하면 tmpfs (RAM) 위에 만들 수도 있다.
디스크 I/O 를 피해야 하는 캐시 용도에 어울린다.

```yaml
volumes:
  - name: fast-cache
    emptyDir:
      medium: Memory                # tmpfs 사용 (RAM 위에 생성)
      sizeLimit: 512Mi              # 상한 지정
```

용량 제한을 걸어두지 않으면 컨테이너가 노드의 메모리를 무제한으로 잡아먹을 수 있으니, `sizeLimit` 은 습관적으로 지정해두는 편이 안전하다.

---

### 9.2 네트워크 볼륨

로컬 볼륨의 한계는 명확하다.
Pod 가 다른 노드로 옮겨가는 순간 데이터가 함께 이동하지 않는다는 점이다.

네트워크 볼륨은 이 지점을 해결한다.
스토리지를 네트워크 저편에 두고, 어느 워커 노드에서 접근하더라도 동일한 파일시스템을 마운트할 수 있게 한다.
쿠버네티스는 이 스토리지의 물리적 위치를 특정하지 않는다.
클러스터 내부에 있어도 되고, 외부의 관리형 스토리지 서비스여도 상관없다.
네트워크로 도달만 가능하면 그것으로 충분하다.

실전에서 자주 마주치는 네트워크 볼륨은 아래와 같다.

| 종류 | 특징 |
|---|---|
| NFS | 가장 오래된 파일 공유 프로토콜. 온프레미스에서 흔히 쓴다 |
| iSCSI | 블록 스토리지를 네트워크로 노출. 고성능이 요구되는 워크로드에 적합 |
| Ceph RBD / GlusterFS | 분산 스토리지 클러스터. 자체 스토리지를 운영할 때 |
| AWS EBS / GCE PD / Azure Disk | 클라우드 벤더가 제공하는 관리형 블록 스토리지 |

각 볼륨마다 마운트에 필요한 필드와 사전 준비 절차가 다르지만, Pod 매니페스트에서 참조하는 흐름 자체는 대체로 비슷하다.
`spec.volumes` 에 해당 볼륨 타입을 명시하고, `spec.containers.volumeMounts` 로 컨테이너 내부에 붙이는 구조다.

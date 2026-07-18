## 7. 쿠버네티스 리소스의 관리와 설정

### 7.1 네임스페이스 (Namespace) — 리소스를 논리적으로 구분하는 장벽

도커나 도커 스웜 모드를 사용할 때는 컨테이너를 논리적으로 구분하는 방법이 딱히 없었다.
쿠버네티스에서는 이 문제를 해결하기 위해 `namespace` 라는 오브젝트를 제공한다.

네임스페이스는 Pod, ReplicaSet, Deployment, Service 같은 쿠버네티스 리소스들이 묶인 하나의 가상 공간이다.
목적에 맞는 리소스끼리 한 공간에 담아두고 싶을 때 사용한다.

- 모니터링을 위한 리소스는 `monitoring` 네임스페이스에 배치
- 테스트를 위한 리소스는 `testbed` 네임스페이스에 배치
- 여러 개발 조직이 하나의 클러스터를 공유할 때도 네임스페이스로 분리

한 가지 유의할 점은, 여기서 말하는 "격리"는 어디까지나 **논리적 격리**라는 것이다.
서로 다른 네임스페이스에 속한 Pod 라도 실제로는 동일한 Node 위에 스케줄링될 수 있다.
물리적 자원까지 나눠주는 개념은 아니다.

---

#### 7.1.1 기본으로 제공되는 네임스페이스

쿠버네티스에서는 `namespace` 또는 축약형인 `ns` 로 네임스페이스를 다룰 수 있다.
현재 클러스터의 네임스페이스 목록은 아래 명령어로 확인한다.

```shell
## 전체 네임스페이스 목록 조회 (둘은 동일한 명령어)
kubectl get namespaces
kubectl get ns
```

기본으로 4개의 네임스페이스가 존재하며, 각각 역할이 나뉘어 있다.

| 네임스페이스 | 역할 |
|---|---|
| `default` | `--namespace` 옵션 없이 리소스를 생성하면 기본으로 할당되는 네임스페이스 |
| `kube-system` | 클러스터 구성에 필수적인 컴포넌트와 설정이 존재하는 내부용 네임스페이스 |
| `kube-public` | 클러스터 내 모든 사용자에게 공개적으로 노출되는 리소스가 위치 |
| `kube-node-lease` | 각 Node의 heartbeat 정보를 저장. Node 상태 감지에 사용 |

`kube-system` 은 클러스터 동작에 직결되는 컴포넌트가 모여 있는 영역이라, 되도록이면 손대지 않는 편이 안전하다.
"이런 영역이 있구나" 정도로 이해하고 넘어가면 충분하다.

---

#### 7.1.2 네임스페이스와 라벨의 차이

여기서 한 가지 의문이 든다.
리소스를 그룹으로 묶는 방법이라면 이미 `label` 이 있다. 굳이 네임스페이스가 왜 별도로 필요한 걸까?

네임스페이스는 단순한 그룹화가 아니라, 그룹 단위로 정책을 걸 수 있는 범위(scope) 역할을 한다.

- `ResourceQuota` 오브젝트를 활용하여 특정 네임스페이스에 생성되는 Pod의 자원 사용량을 제한할 수 있다.
- `Admission Controller` 를 활용하여 특정 네임스페이스에 생성되는 Pod에 사이드카 컨테이너를 자동으로 부착할 수 있다.

라벨이 리소스에 붙는 태그에 가깝다면, 네임스페이스는 리소스가 존재하는 공간 자체를 나눈다.
그래서 격리 단위나 정책 적용 범위로 삼기에는 라벨보다 네임스페이스가 더 적합하다.

```yaml
## production 네임스페이스에 CPU·메모리 총량 제한을 거는 ResourceQuota 예시
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

---

#### 7.1.3 네임스페이스 생성과 사용

YAML 파일로 선언적으로 생성하거나, `kubectl create` 로 즉시 생성할 수 있다.

```yaml
## production-namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: production
```

```shell
## YAML 파일로 생성 (선언적 방식)
kubectl apply -f production-namespace.yml

## 명령어로 즉시 생성 (명령형 방식)
kubectl create namespace production
```

특정 리소스를 원하는 네임스페이스에 배치하려면, 해당 리소스 매니페스트의 `metadata.namespace` 항목에 이름을 명시한다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production   # 이 Deployment는 production 네임스페이스에서 생성됨
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: nginx:latest
```

기본적으로 `kubectl get pods` 같은 조회 명령어는 `default` 네임스페이스만 대상으로 삼는다.
다른 네임스페이스의 리소스를 보려면 `--namespace` 옵션(`-n`) 이나 `--all-namespaces` 옵션(`-A`) 을 붙인다.

```shell
## 특정 네임스페이스의 Pod만 조회
kubectl get pods --namespace production
kubectl get pods -n production

## 모든 네임스페이스에 걸친 Pod 조회
kubectl get pods --all-namespaces
kubectl get pods -A
```

매번 `-n` 옵션을 붙이는 게 번거롭다면, 현재 컨텍스트의 기본 네임스페이스 자체를 변경해두는 방법도 있다.

```shell
## 현재 컨텍스트의 기본 네임스페이스를 production으로 변경
kubectl config set-context --current --namespace=production

## 이후에는 옵션 없이도 production 네임스페이스가 조회 대상이 된다
kubectl get pods

## 현재 컨텍스트가 사용 중인 네임스페이스 확인
kubectl config view --minify --output 'jsonpath={..namespace}'
```

---

#### 7.1.4 다른 네임스페이스의 서비스에 접근하기

앞서 서비스 오브젝트는 클러스터 내부에서 서비스 이름만으로 Pod에 접근할 수 있다고 설명했다.
다만 이는 정확히는 **같은 네임스페이스 안에 있는 서비스** 에 한정된 이야기다.

서로 다른 네임스페이스에 속한 서비스에 접근하려면, 서비스 이름 뒤에 네임스페이스 이름을 붙여줘야 한다.

```
<서비스 이름>.<네임스페이스 이름>.svc
```

FQDN(Fully Qualified Domain Name) 형식으로는 아래와 같이 표기한다.

```
<서비스 이름>.<네임스페이스 이름>.svc.cluster.local
```

예를 들어 `production` 네임스페이스에 있는 `api-server` 라는 서비스를, `monitoring` 네임스페이스의 Pod 에서 호출하는 상황을 생각해보자.

```shell
## 같은 네임스페이스에 있는 서비스라면 이름만으로 충분하다
curl http://api-server

## 다른 네임스페이스에 있다면 네임스페이스 이름을 함께 명시한다
curl http://api-server.production.svc
curl http://api-server.production.svc.cluster.local
```

이 방식이 동작하는 이유는 쿠버네티스의 내부 DNS인 CoreDNS 가 서비스 이름을 클러스터 내부 IP 로 변환해주기 때문이다.
Pod 내부의 `/etc/resolv.conf` 를 열어보면 이 구조가 실제로 어떻게 준비돼 있는지 확인할 수 있다.

```shell
## 임시 Pod 를 띄워서 DNS 설정 확인
kubectl run tmp --rm -it --image=busybox --restart=Never -- cat /etc/resolv.conf

## 출력 예시
# nameserver 10.96.0.10                                   ← CoreDNS 서비스 IP
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

여기서는 `search` 항목이 핵심이다. 그래서 `api-server` 처럼 짧은 이름으로 조회하면 Resolver 가 `search` 에 나열된 도메인을 순서대로 이어붙여 자동으로 조회를 시도한다.  
그래서 같은 네임스페이스에서는 이름만으로 접근이 가능하고, 다른 네임스페이스에서는 네임스페이스 이름을 붙여줘야 하는 것이다.  

---

#### 7.1.5 네임스페이스 삭제

네임스페이스를 삭제하면 그 안에 존재하는 **모든 리소스가 함께 제거된다**.
운영 중인 네임스페이스에 실수로 삭제 명령을 내리는 일이 없도록 조심하자.

```shell
## YAML 파일 기준으로 삭제
kubectl delete -f production-namespace.yml

## 이름으로 직접 삭제
kubectl delete namespace production

## 삭제 전 해당 네임스페이스에 어떤 리소스가 남아 있는지 확인
kubectl get all -n production
```

> [!CAUTION]
> `kubectl delete namespace` 는 되돌릴 수 없다. Deployment, Service, ConfigMap, Secret, PVC 등 네임스페이스에 속한 모든 리소스가 일괄 삭제되며, PVC 가 삭제되면 스토리지 클래스의 회수 정책에 따라 실제 볼륨 데이터까지 사라질 수 있다.

#### 7.1.6 네임스페이스에 종속되는 오브젝트와 독립적인 오브젝트

지금까지의 흐름으로만 보면 쿠버네티스의 모든 리소스가 네임스페이스로 분리될 것처럼 보인다.
그런데 실제로는 그렇지 않다. 네임스페이스로 나뉘는 리소스가 있는가 하면, 클러스터 전체에 걸쳐 하나로 존재하는 리소스도 있다.

Pod, Service, ReplicaSet, Deployment 는 네임스페이스 단위로 구분된다.
예를 들어 `A` 네임스페이스에서 Pod 를 생성하면 `A` 안에서만 보이고, `B` 네임스페이스에서는 조회되지 않는다.
쿠버네티스에서는 이런 성질을 두고 **"오브젝트가 네임스페이스에 속한다 (namespaced)"** 라고 표현한다.

반대로 네임스페이스에 속하지 않는 리소스도 있다.
대표적인 예가 `Node` 다. Node 는 쿠버네티스의 오브젝트 중 하나이지만 특정 네임스페이스에 소속되지 않는다.
그래서 `kubectl get nodes` 에 `--namespace` 옵션을 붙여도 결과는 달라지지 않는다.
이런 오브젝트들은 대개 클러스터 전반에 걸쳐 공용으로 사용되는 성격을 가진다.

특정 리소스가 네임스페이스에 속하는지 여부는 `kubectl api-resources` 로 확인할 수 있다.

```shell
## 네임스페이스에 속하는 리소스 목록
kubectl api-resources --namespaced=true

## 네임스페이스에 속하지 않는 리소스 목록 (클러스터 스코프)
kubectl api-resources --namespaced=false
```

`--namespaced=false` 로 조회해보면 `Node`, `PersistentVolume`, `ClusterRole`, `Namespace` 자체 등이 목록에 나온다.
Namespace 오브젝트 자체가 네임스페이스에 속하지 않는다는 점이 재미있는 부분이다.

---

## 7.2 컨피그 맵 (ConfigMap), 시크릿 (Secret) — 설정값을 파드에 전달

애플리케이션을 구동할 때 필요한 설정 값은 보통 단일 파일이나 Key-Value 형식으로 넘겨준다.
가장 확실한 방법은 도커 이미지 내부에 값이나 파일을 정적으로 박아 넣는 것이다.
문제는 도커 이미지는 빌드 이후로 불변의 상태를 가진다는 점이다. 환경이 바뀔 때마다 이미지를 새로 빌드해야 하니 유연하게 대응하기 어렵다.

파드를 정의하는 YAML 에 환경 변수를 직접 하드코딩하는 방법도 있긴 하다.
다만 이 방식은 값만 다른 동일한 YAML 이 환경마다 하나씩 생기는 결과를 낳는다. (운영과 개발 환경 사이의 차이가 대표적이다)

쿠버네티스에서는 이런 문제를 해결하기 위해 YAML 파일과 설정 값을 분리할 수 있는 `ConfigMap` 과 `Secret` 이라는 두 오브젝트를 제공한다.
`ConfigMap` 은 일반적인 설정 값을, `Secret` 은 노출되어서는 안 될 민감한 값을 담는 용도로 사용한다.

---

### 7.2.1 컨피그 맵 (ConfigMap)

ConfigMap 은 일반적인 설정 값을 담아 저장하는 쿠버네티스 오브젝트다.
네임스페이스에 속하는 리소스이기 때문에, 같은 이름의 ConfigMap 이라도 네임스페이스별로 각각 존재할 수 있다.

생성 방법은 크게 두 가지다. YAML 파일로 정의하거나, `kubectl create configmap` 명령어로 즉시 생성한다.

#### ConfigMap 생성 — `--from-literal`

가장 간단한 방법은 `--from-literal` 옵션으로 Key-Value 를 직접 지정하는 것이다.

```shell
## LOG_LEVEL=DEBUG 값을 가진 log-level-configmap 생성
kubectl create configmap log-level-configmap --from-literal=LOG_LEVEL=DEBUG

## --from-literal 을 여러 번 사용하여 여러 Key-Value 도 담을 수 있다
kubectl create configmap app-configmap \
  --from-literal=LOG_LEVEL=DEBUG \
  --from-literal=APP_ENV=production \
  --from-literal=MAX_RETRY=5

## 생성된 ConfigMap 확인
kubectl get configmap
kubectl describe configmap app-configmap
```

#### Pod 에서 ConfigMap 을 사용하는 세 가지 방법

ConfigMap 을 만들었다면 다음 단계는 이 값을 Pod 로 가져오는 것이다.
Pod Template 안에서 ConfigMap 을 어떻게 참조하느냐에 따라 크게 세 가지 방식이 있다.

**1. 특정 Key 하나를 환경 변수로 주입 (`valueFrom.configMapKeyRef`)**

ConfigMap 안의 특정 Key 만 골라 컨테이너 환경 변수로 매핑한다.
컨테이너 내부에서는 일반적인 환경 변수처럼 `echo $LOG_LEVEL` 로 값을 확인할 수 있다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      image: nginx:latest
      env:
        - name: LOG_LEVEL              # 컨테이너 내부에서 사용할 환경 변수 이름
          valueFrom:
            configMapKeyRef:
              name: app-configmap       # 참조할 ConfigMap 이름
              key: LOG_LEVEL            # ConfigMap 내에서 가져올 Key
```

**2. ConfigMap 의 모든 Key 를 환경 변수로 일괄 주입 (`envFrom.configMapRef`)**

ConfigMap 에 담긴 Key-Value 를 하나하나 매핑하기 번거로울 때 사용한다.
`envFrom` 을 쓰면 ConfigMap 의 모든 Key 가 그대로 환경 변수 이름이 되어 주입된다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      image: nginx:latest
      envFrom:
        - configMapRef:
            name: app-configmap        # ConfigMap 의 모든 Key-Value 를 환경 변수로
```

**3. ConfigMap 값을 파일로 마운트 (`volumeMounts` + `volumes.configMap`)**

`nginx.conf` 처럼 파일 형태로 설정을 읽는 애플리케이션에 적합한 방식이다.
`spec.volumes` 에 ConfigMap 을 지정하고, `spec.containers.volumeMounts` 로 컨테이너 내부 경로에 마운트한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      image: nginx:latest
      volumeMounts:
        - name: config-volume
          mountPath: /etc/config       # 컨테이너 내부 마운트 경로
  volumes:
    - name: config-volume
      configMap:
        name: app-configmap
        items:                          # 특정 Key 만 골라서 파일로 마운트하고 싶을 때 사용
          - key: LOG_LEVEL
            path: log-level.conf        # /etc/config/log-level.conf 로 저장됨
```

`items` 를 생략하면 ConfigMap 의 모든 Key 가 각각 파일 하나로 만들어져 마운트된다.
특정 Key 만 골라서 마운트하고 싶다면 `items` 아래에 `key` 와 `path` 를 명시하면 된다.

#### 파일로부터 ConfigMap 생성 — `--from-file`

실제 운영에서는 Key-Value 를 하나씩 지정하기보다 설정 파일 자체를 ConfigMap 으로 전달하는 경우가 더 많다.
이때는 `--from-literal` 대신 `--from-file` 옵션을 사용한다.

```shell
## 파일 이름이 Key, 파일 내용이 Value 로 저장됨
kubectl create configmap nginx-configmap --from-file=nginx.conf

## Key 이름을 직접 지정하고 싶을 때 (기본은 파일명)
kubectl create configmap nginx-configmap --from-file=config=nginx.conf

## 여러 파일을 한 번에 담기 (--from-file 을 반복 사용)
kubectl create configmap app-configmap \
  --from-file=nginx.conf \
  --from-file=app.properties
```

`KEY=VALUE` 형식으로 여러 줄이 나열된 env 파일이 이미 있다면 `--from-env-file` 로 한 번에 가져올 수 있다.

```shell
## .env 파일의 각 줄을 개별 Key-Value 로 등록
kubectl create configmap app-configmap --from-env-file=.env
```

#### YAML 파일로 ConfigMap 정의하기

명령어로 즉시 생성하는 방식은 편하지만, GitOps 나 형상 관리를 위해서는 YAML 로 남겨두는 편이 좋다.
`--dry-run=client` 와 `-o yaml` 을 함께 사용하면 ConfigMap 을 실제로 생성하지 않고 YAML 만 뽑아낼 수 있다.

```shell
## 실제 생성은 하지 않고 YAML 만 출력
kubectl create configmap app-configmap \
  --from-literal=LOG_LEVEL=DEBUG \
  --dry-run=client -o yaml

## 파일로 저장한 뒤 kubectl apply 로 적용
kubectl create configmap app-configmap \
  --from-literal=LOG_LEVEL=DEBUG \
  --dry-run=client -o yaml > app-configmap.yml

kubectl apply -f app-configmap.yml
```

직접 YAML 을 작성한다면 `data` 항목 아래에 Key-Value 를 나열하는 구조가 된다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-configmap
  namespace: production
data:
  LOG_LEVEL: DEBUG
  APP_ENV: production
  nginx.conf: |
    server {
      listen 80;
      server_name example.com;
    }
```

다만 담아야 할 Key-Value 가 많아지거나 파일 내용이 길어지면 YAML 이 지나치게 비대해진다.
이런 경우에는 **kustomize** 라는 도구를 활용하면 관리가 훨씬 편해지는데, 자세한 내용은 뒤의 [7.2.3](#723-kustomize-로-configmap--secret-편하게-배포하기) 에서 다룬다.

---

### 7.2.2 시크릿 (Secret)

Secret 은 SSH 키, 비밀번호, API 토큰처럼 **노출되어서는 안 될 민감한 정보**를 저장하기 위한 오브젝트다.
ConfigMap 과 마찬가지로 네임스페이스에 속하는 리소스이며, 사용 방식과 저장 구조도 대체로 유사하다.
차이가 있다면 Secret 은 저장하는 데이터의 성격에 따라 여러 종류로 세분화되어 있고, 값이 **base64 로 인코딩** 되어 저장된다는 점이다.

#### Secret 생성 — `kubectl create secret generic`

가장 기본이 되는 사용법은 ConfigMap 과 거의 동일하다.
다만 명령어에 `generic` 이라는 하위 커맨드가 추가로 들어간다.

```shell
## password=12345678 값을 가진 my-password Secret 생성
kubectl create secret generic my-password --from-literal=password=12345678

## 파일이나 env 파일에서 값을 읽어와 생성할 수도 있다
kubectl create secret generic tls-secret --from-file=./cert.pem --from-file=./key.pem
kubectl create secret generic app-secret --from-env-file=.env
```

여기서 왜 `generic` 이 붙는지 의문이 들 수 있는데, 이는 Secret 이 사용 목적에 따라 여러 타입으로 나뉘기 때문이다.
`generic` 은 그중 가장 범용적인 Opaque 타입을 생성하는 하위 커맨드다.

생성된 Secret 은 아래 명령어로 확인할 수 있다.

```shell
## 요약 정보 확인
kubectl describe secret my-password

## 원본 YAML 확인 (data 항목이 base64 로 인코딩되어 있음)
kubectl get secret my-password -o yaml
```

주의할 점은 `kubectl get secret -o yaml` 로 조회한 결과의 값은 base64 로 인코딩되어 있다는 것이다.
`12345678` 이라는 원본 값을 넣었더라도 화면에는 `MTIzNDU2Nzg=` 처럼 인코딩된 문자열이 나온다.
실제 값을 확인하려면 별도로 디코딩이 필요하다.

```shell
## base64 로 인코딩된 Secret 값을 원본으로 디코딩
kubectl get secret my-password -o jsonpath='{.data.password}' | base64 -d
```

> [!NOTE]
> base64 는 암호화가 아니라 **인코딩** 이다. 누구든 디코딩만 하면 원본을 볼 수 있으므로 Secret 자체가 값을 안전하게 보호해주는 장치는 아니다. 실제 보호는 etcd 암호화, RBAC 접근 제어, 외부 KMS(Vault, AWS Secrets Manager 등) 연동으로 이뤄진다.

#### Pod 에서 Secret 사용하기

Pod 에서 Secret 을 참조하는 방식은 ConfigMap 과 동일하게 세 가지다.
`configMapKeyRef` 대신 `secretKeyRef`, `configMapRef` 대신 `secretRef` 를 쓴다는 차이만 있다.

**1. 특정 Key 하나를 환경 변수로 주입 (`valueFrom.secretKeyRef`)**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      image: nginx:latest
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: my-password
              key: password
```

**2. Secret 의 모든 Key 를 환경 변수로 일괄 주입 (`envFrom.secretRef`)**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      image: nginx:latest
      envFrom:
        - secretRef:
            name: app-secret
```

**3. Secret 값을 파일로 마운트 (`volumeMounts` + `volumes.secret`)**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      image: nginx:latest
      volumeMounts:
        - name: secret-volume
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secret-volume
      secret:
        secretName: tls-secret
        items:                    # 특정 Key 만 골라서 마운트하고 싶을 때
          - key: cert.pem
            path: server.crt
```

`items` 를 생략하면 Secret 의 모든 Key 가 각각 파일로 만들어져 마운트된다.

#### Secret 의 타입

Secret 은 저장 목적에 따라 몇 가지 타입으로 나뉜다.
타입을 지정하지 않으면 기본값인 `Opaque` 로 생성되며, 그 외 자주 쓰이는 것은 아래 두 가지다.

| 타입 | 용도 | 생성 커맨드 |
|---|---|---|
| `Opaque` | 일반적인 Key-Value 저장 (기본값) | `kubectl create secret generic` |
| `kubernetes.io/dockerconfigjson` | 사설 Registry 접근 인증 정보 | `kubectl create secret docker-registry` |
| `kubernetes.io/tls` | TLS 인증서와 개인 키 | `kubectl create secret tls` |

##### docker-registry 타입 — 사설 Registry 인증

Docker Hub 처럼 공개된 레지스트리가 아니라 사설 Registry 에서 이미지를 받아오려면 인증 정보가 필요하다.
로컬에서는 `docker login` 으로 처리하지만, 쿠버네티스에서는 이 역할을 `docker-registry` 타입의 Secret 이 대신한다.

생성 방법은 두 가지가 있다.

```shell
## 1. docker login 으로 만들어진 ~/.docker/config.json 파일을 재활용
kubectl create secret generic regcred \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson

## 2. 인증 정보를 직접 명시하여 생성 (docker-server 는 생략 가능, 생략 시 Docker Hub)
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=me@example.com
```

생성된 Secret 은 Deployment 나 Pod 매니페스트의 `imagePullSecrets` 항목에서 참조하여 사용한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-app
spec:
  containers:
    - name: private-app
      image: registry.example.com/private-app:latest
  imagePullSecrets:
    - name: regcred            # docker-registry 타입 Secret 이름
```

##### tls 타입 — TLS 인증서 저장

Pod 내부 애플리케이션이 HTTPS 통신을 위해 인증서와 개인 키를 필요로 할 때 사용한다.
`--cert` 와 `--key` 옵션으로 인증서 파일과 키 파일을 넘긴다.

```shell
## TLS 타입의 Secret 생성
kubectl create secret tls my-tls-secret \
  --cert=./server.crt \
  --key=./server.key
```

Ingress 리소스에서 HTTPS 를 설정할 때도 이 타입의 Secret 을 참조한다.

Secret 도 ConfigMap 과 마찬가지로 Key-Value 가 많아지거나 인증서 파일이 여러 개가 되면 YAML 관리가 번거로워진다.
kustomize 의 `secretGenerator` 를 사용하면 이 문제를 함께 해결할 수 있다. 다음 절에서 ConfigMap 과 묶어서 살펴본다.

---

### 7.2.3 kustomize 로 ConfigMap · Secret 편하게 배포하기

앞선 두 절에서 ConfigMap 과 Secret 을 YAML 로 직접 작성해봤다.
잘 동작하기는 하지만 두 가지 지점이 자꾸 마음에 걸린다.

첫째, Key-Value 가 늘거나 파일 내용이 길어지면 매니페스트가 금방 비대해진다.
둘째, 설정 값을 갱신해도 이미 실행 중인 Pod 는 이를 자동으로 감지하지 못해 별도로 재기동해줘야 한다.

이 두 가지 문제를 함께 해결해주는 것이 **kustomize** 다.

#### kustomize 란?

kustomize 는 쿠버네티스 매니페스트를 템플릿 엔진 없이 커스터마이징하기 위한 도구다.
Helm 처럼 값 치환용 변수 문법을 사용하지 않고, 원본 YAML 위에 **오버레이(overlay)** 를 얹는 방식으로 동작한다.
kubectl 1.14 부터 통합되어 있어 별도 설치 없이 `kubectl apply -k` 만으로 사용할 수 있다.

핵심이 되는 파일은 `kustomization.yml` 하나다.
이 파일이 있는 디렉토리를 대상으로 kustomize 를 실행하면, 파일 안에 정의된 규칙에 따라 최종 매니페스트가 렌더링된다.

```shell
## 실제 적용
kubectl apply -k .

## 실제 적용 없이 렌더링 결과만 미리 확인
kubectl kustomize .
```

kustomize 가 제공하는 기능은 여러 가지지만, ConfigMap 과 Secret 을 관리할 때 특히 유용한 두 가지 제너레이터가 있다.

#### configMapGenerator — ConfigMap 자동 생성

`kustomization.yml` 에 literal 이나 file 을 나열해두면, kustomize 가 실행 시점에 ConfigMap 매니페스트를 알아서 만들어준다.

```yaml
## kustomization.yml
configMapGenerator:
  - name: app-configmap
    literals:
      - LOG_LEVEL=DEBUG
      - APP_ENV=production
    files:
      - nginx.conf
      - app.properties
```

`literals` 는 `--from-literal` 과, `files` 는 `--from-file` 과 대응된다.
결국 kubectl 명령어로 생성하는 것과 같은 결과지만, YAML 파일 하나에 선언적으로 남아 있어 형상 관리하기 훨씬 편하다.

#### secretGenerator — Secret 자동 생성

Secret 도 동일한 흐름이다. `configMapGenerator` 대신 `secretGenerator` 를 사용한다.

```yaml
## kustomization.yml
secretGenerator:
  - name: app-secret
    type: Opaque
    literals:
      - password=12345678
      - api-token=abcdef1234567890
    files:
      - ./cert.pem
```

`type` 항목으로 Secret 타입(`Opaque`, `kubernetes.io/tls` 등) 도 함께 명시할 수 있다.
두 제너레이터는 같은 파일 안에 함께 정의해두는 것도 가능하다.

```yaml
## kustomization.yml — 하나의 파일에서 ConfigMap 과 Secret 을 함께 관리
configMapGenerator:
  - name: app-configmap
    literals:
      - LOG_LEVEL=DEBUG

secretGenerator:
  - name: app-secret
    literals:
      - password=12345678
```

#### 해시 접미사와 자동 롤아웃

kustomize 를 매력적으로 만드는 지점이 하나 더 있다.

`configMapGenerator` 나 `secretGenerator` 로 생성된 리소스는 이름 뒤에 자동으로 **해시 접미사**가 붙는다.
`app-configmap` 이 아니라 `app-configmap-8h7g4d2` 처럼 만들어지고, 원본 값이 바뀌면 해시도 함께 바뀐다.

```shell
## 렌더링 결과를 확인해보면 이런 식으로 이름이 붙는다
$ kubectl kustomize .
apiVersion: v1
data:
  LOG_LEVEL: DEBUG
kind: ConfigMap
metadata:
  name: app-configmap-8h7g4d2      # 해시 접미사가 자동으로 붙음
```

Deployment 나 Pod 매니페스트에서 `app-configmap` 이라는 이름으로 참조해도, kustomize 가 해시 접미사를 붙인 실제 이름 (`app-configmap-8h7g4d2`) 으로 자동 치환해준다.
설정 값을 갱신하면 해시가 달라지고, 참조되는 리소스 이름도 바뀌기 때문에 Deployment 가 이를 변경으로 감지하여 자연스럽게 Rolling Update 를 수행한다.
앞서 아쉬웠던 "설정 변경 후 수동 재기동" 문제가 이 방식으로 자연스럽게 풀린다.

---

### 7.2.4 설정 값 업데이트와 리소스 정리

#### ConfigMap · Secret 을 업데이트하기

한번 생성된 ConfigMap 이나 Secret 의 값을 바꾸고 싶을 때는 두 가지 방법을 사용한다.

```shell
## 1. kubectl edit 로 즉시 편집 (에디터가 열리고 저장 시 반영)
kubectl edit configmap app-configmap

## 2. YAML 파일을 수정한 뒤 kubectl apply 로 재적용
kubectl apply -f app-configmap.yml
```

그런데 여기서 한 가지 오해하기 쉬운 지점이 있다.

Pod 내부에 파일로 마운트된 설정 값의 경우, ConfigMap · Secret 이 업데이트되면 마운트된 파일도 자동으로 갱신된다.
다만 **파일이 바뀌었다고 해서 실행 중인 애플리케이션이 새 설정을 곧바로 반영하는 것은 아니다**.
파일 변경을 감지해 설정을 다시 로드하는 로직은 별도로 구현해야 하고, 아니면 Pod 자체를 재기동해야 한다.

환경 변수로 주입된 값의 경우는 더 확실히 반영되지 않는다.
환경 변수는 Pod 가 생성되는 시점에 결정되는 값이라, 이후 ConfigMap 이 바뀌어도 Pod 를 재기동해야만 새 값이 들어간다.
바로 앞 절에서 kustomize 의 해시 접미사 방식을 소개한 이유가 여기에 있다.
리소스 이름 자체가 바뀌기 때문에 Deployment 가 이를 감지하여 Pod 를 Rolling Update 로 재기동해준다.

#### 리소스 정리

챕터에서 만든 리소스를 한 번에 지우고 싶다면 아래 명령어를 사용한다.

```shell
## 현재 네임스페이스의 Deployment, Pod, ConfigMap, Secret 을 한꺼번에 삭제
kubectl delete deployment,pod,configmap,secret --all

## 특정 네임스페이스에 국한하여 삭제
kubectl delete deployment,pod,configmap,secret --all -n production
```

`--all` 옵션은 지정된 종류의 모든 리소스를 삭제한다는 뜻이다.
실무에서는 남아 있는 리소스까지 통째로 지워버릴 위험이 있으니, 반드시 대상 네임스페이스를 확인한 뒤 실행하자.
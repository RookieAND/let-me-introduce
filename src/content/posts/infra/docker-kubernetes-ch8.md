## 8. 인그레스 (Ingress)

### 8.1 인그레스가 필요한 이유 — 서비스만으로는 부족한 상황

앞선 챕터까지 살펴본 서비스 오브젝트만으로도 외부 요청은 처리할 수 있다.
`NodePort` 나 `LoadBalancer` 타입으로 서비스를 열어주면 클러스터 외부에서 Pod 로 트래픽이 흘러들어오기 때문이다.
그런데 왜 굳이 인그레스라는 오브젝트가 별도로 필요한 걸까?

문제는 애플리케이션이 다수의 Deployment 로 쪼개져 있을 때 드러난다.
Deployment 마다 서비스를 하나씩 붙이고, 서비스마다 외부 도메인이나 포트를 따로 열어주는 구조가 되어버린다.
서비스가 3개면 URL 도 3개, 30개면 URL 도 30개가 된다는 뜻이다.
클라이언트 입장에서는 어떤 서비스가 어디에 있는지 매번 알고 있어야 한다.

인그레스는 바로 이 지점을 해결하기 위해 등장한 오브젝트다.
여러 Deployment 를 하나의 URL 뒤에 숨겨두고, 요청 경로나 도메인 이름을 보고 어디로 보낼지 결정한다.
클라이언트는 인그레스에 진입하는 단일 URL 만 알면 되고, 뒤에 붙은 서비스들이 어떻게 구성되어 있는지는 클러스터 안쪽 문제로 남는다.

인그레스가 담당하는 역할을 정리하면 크게 세 가지다.

| 역할 | 설명 |
|---|---|
| 경로 기반 라우팅 | `/api`, `/auth/login` 처럼 요청 경로별로 다른 서비스에 전달 |
| 가상 호스트 라우팅 | 동일 IP 라도 `api.example.com`, `admin.example.com` 처럼 도메인별로 분기 |
| SSL/TLS 종료 | 인증서를 인그레스 지점에 두고, 뒤쪽 서비스는 평문 HTTP 로 유지 |

L4 (전송 계층) 에 머무르는 서비스와 달리, 인그레스는 L7 (애플리케이션 계층) 에서 동작한다.
HTTP 헤더나 URL 경로 같은 요청의 세부 정보를 볼 수 있는 위치에 있기 때문에 이런 라우팅이 가능한 것이다.

---

### 8.2 인그레스의 구조

쿠버네티스에서는 인그레스를 `ingress` 또는 축약형 `ing` 으로 다룬다.
기본 매니페스트는 아래와 같은 형태다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com          # 이 도메인으로 들어온 요청에만 규칙 적용
      http:
        paths:
          - path: /users              # 경로별 라우팅
            pathType: Prefix
            backend:
              service:
                name: users-service   # 요청을 전달할 서비스 이름
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders-service
                port:
                  number: 80
```

주요 항목만 짚어보면 이렇다.

| 항목 | 역할 |
|---|---|
| `host` | 어느 도메인으로 들어온 요청에 규칙을 적용할지 지정. 생략 시 모든 도메인 대상 |
| `path` | 요청 경로별 라우팅 규칙. 여러 개를 나열할 수 있다 |
| `pathType` | 경로 매칭 방식 (`Exact`, `Prefix`, `ImplementationSpecific`) |
| `backend.service.name` | 매칭된 요청을 전달할 서비스 이름 |
| `backend.service.port.number` | 서비스가 노출하는 포트 |
| `ingressClassName` | 이 규칙을 처리할 인그레스 컨트롤러 지정 (자세한 내용은 [8.5](#85-여러-인그레스-컨트롤러-함께-쓰기) 에서) |

`host` 와 `path` 는 반드시 지정하지 않아도 된다.
도메인 이름과 무관하게 특정 경로로 온 모든 요청을 하나의 서비스로 보내고 싶다면 `host` 를 생략하면 되고, 반대로 도메인 단위로만 갈라내고 싶다면 `path: /` 하나로 두면 된다.

---

#### 8.2.1 인그레스 오브젝트는 규칙만 정의한다

인그레스 매니페스트를 잘 작성해뒀다고 해서, 이것만으로 요청이 처리되지는 않는다.
인그레스는 그 자체로는 아무 일도 하지 않는 **선언적 오브젝트**에 가깝다.
실제 트래픽 처리는 별도의 **Ingress Controller** 라는 서버가 담당한다.
컨트롤러가 인그레스 오브젝트의 규칙을 읽어와서 자기 안의 프록시 설정으로 반영하는 구조다.

이 사실을 처음 알았을 때 조금 당황했다.
"규칙만 정의하는 오브젝트" 라는 개념이 다른 리소스들과는 조금 다르게 느껴졌기 때문이다.
Pod 나 Deployment 는 그 자체로 실체가 있는 반면, 인그레스는 컨트롤러가 없다면 그저 YAML 조각에 지나지 않는다.

컨트롤러는 종류가 여럿이고 상황에 맞게 골라 쓰면 된다.

| 컨트롤러 | 특징 |
|---|---|
| Nginx Ingress Controller | 쿠버네티스 공식 개발. Nginx 웹서버를 프록시로 활용 |
| Kong Ingress Controller | API Gateway 기능이 강력한 Kong 기반 |
| AWS Load Balancer Controller | AWS 환경에서 ALB 를 인그레스로 활용 |
| GKE Ingress Controller | GCP 환경에서 Google Cloud Load Balancer 와 통합 |

이 중에서 가장 널리 쓰이는 것은 Nginx Ingress Controller 다.
공식 매니페스트가 제공되기 때문에 설치도 명령어 하나로 끝난다.

```shell
## Nginx Ingress Controller 설치 (공식 매니페스트 사용)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

## 전용 네임스페이스에 리소스들이 생성된다
kubectl get all -n ingress-nginx
```

설치를 마치면 `ingress-nginx` 라는 네임스페이스가 생기고, 그 안에 컨트롤러 Deployment, Pod, 그리고 외부 노출을 위한 서비스가 함께 배치된다.
서비스 타입은 클라우드 환경이라면 `LoadBalancer`, 온프레미스라면 `NodePort` 로 잡히는 경우가 많다.

```shell
## 컨트롤러 서비스가 어떤 IP·포트로 노출되어 있는지 확인
kubectl get svc -n ingress-nginx

## 출력 예시 (클라우드 환경)
# NAME                       TYPE           CLUSTER-IP     EXTERNAL-IP        PORT(S)
# ingress-nginx-controller   LoadBalancer   10.96.10.20    a1b2c3.elb.aws     80:30080/TCP,443:30443/TCP
```

`EXTERNAL-IP` 로 잡힌 주소가 외부에서 클러스터로 들어오는 진입점이 된다.
DNS 를 이 주소에 매핑해두면, 이후 인그레스 매니페스트에서 정의한 규칙에 따라 요청이 분기된다.

---

#### 8.2.2 요청이 흐르는 경로 — Bypass 개념

인그레스가 실제로 어떻게 동작하는지 순서대로 정리해보자.

1. 사용자가 클러스터 외부에서 인그레스 컨트롤러의 서비스 (LoadBalancer / NodePort) 로 요청을 보낸다
2. 컨트롤러는 감시하고 있던 인그레스 오브젝트들의 규칙을 참고해 요청의 목적지를 결정한다
3. 규칙에 매칭된 서비스로 요청을 전달한다 — 정확히는 서비스가 관리하는 **Endpoint 로 직접** 전달

여기서 짚고 넘어갈 지점이 있다.
인그레스 컨트롤러는 서비스의 `ClusterIP` 를 거치지 않는다.
서비스가 관리하는 Endpoint 목록에서 실제 Pod 의 IP 를 뽑아 곧바로 요청을 넘긴다.
쿠버네티스에서는 이런 동작을 **Bypass** 라 부른다. 서비스라는 홉을 건너뛰기 때문이다.

```shell
## 특정 서비스가 관리하는 Endpoint (실제 Pod IP 목록) 확인
kubectl get endpoints users-service

## 출력 예시
# NAME            ENDPOINTS                                 AGE
# users-service   10.244.1.5:80,10.244.2.7:80,10.244.3.9:80  10m
```

인그레스 컨트롤러는 이 Endpoint 목록을 주기적으로 감시하다가, 요청이 들어오면 그 안의 Pod IP 중 하나로 곧바로 트래픽을 흘려보낸다.
kube-proxy 가 관리하는 iptables 규칙을 거쳐 다시 Pod IP 를 찾아가는 홉을 건너뛰는 셈이다.
그만큼 지연이 줄어들고, 로드밸런싱 로직도 컨트롤러가 자체적으로 관리할 수 있는 여지가 생긴다.

> [!NOTE]
> 컨트롤러는 특정 네임스페이스에 배포되어 있지만, 감시 대상은 **클러스터 전체의 인그레스 오브젝트** 다. 각기 다른 네임스페이스에 인그레스를 만들어도 하나의 컨트롤러가 모두 처리한다.

---

### 8.3 Annotation 으로 인그레스 세부 동작 제어

인그레스의 기본 문법은 단순하다.
그런데 실제 운영에서는 "경로를 다시 써서 넘기고 싶다", "HTTP 요청은 HTTPS 로 리다이렉트하고 싶다" 같은 요구가 반드시 따라붙는다.
쿠버네티스 인그레스 스펙 자체는 이런 세부 옵션을 모두 표준화하지 않았고, 컨트롤러별 `annotation` 항목으로 확장하는 방식을 채택했다.

Nginx Ingress Controller 에서 자주 쓰는 몇 가지를 살펴본다.

---

#### 8.3.1 rewrite-target — 요청 경로 다시 쓰기

인그레스에 도착한 요청 경로를, 백엔드 서비스로 넘길 때 다른 경로로 바꾸는 옵션이다.
클라이언트는 `/api/users` 로 요청했는데 백엔드 서비스는 `/users` 만 알고 있는 경우가 대표적이다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rewrite-example
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2   # Capture Group 2번을 그대로 사용
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api(/|$)(.*)     # (/|$) = Capture Group 1, (.*) = Capture Group 2
            pathType: ImplementationSpecific
            backend:
              service:
                name: users-service
                port:
                  number: 80
```

정규식으로 경로를 여러 Capture Group 으로 잘라두고, `rewrite-target` 에서 `$숫자` 형식으로 참조하는 구조다.
위 예시에서 `/api/users/1` 요청이 들어오면 `(/|$)` 는 `/` 에, `(.*)` 는 `users/1` 에 매칭된다.
최종적으로 백엔드 서비스에는 `/users/1` 이 전달된다.

Capture Group 을 쓰지 않고 단순히 `rewrite-target: /` 로만 두면, `/api/users/1` 처럼 뒤쪽 경로가 붙어 있는 요청은 전부 `/` 로 뭉개져버린다.
경로 뒷부분을 살리고 싶다면 반드시 Capture Group 으로 잡아둬야 한다.

---

#### 8.3.2 app-root — 루트 접근을 특정 경로로 리다이렉트

사용자가 도메인 루트 (`/`) 로 접근했을 때, 특정 경로로 자동 리다이렉트하고 싶을 때 쓴다.

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/app-root: /dashboard
```

`example.com` 으로 들어온 요청이 302 응답과 함께 `example.com/dashboard` 로 리다이렉트된다.
SPA 의 진입점을 특정 경로로 통일하고 싶을 때 유용하다.

---

#### 8.3.3 ssl-redirect — HTTP 를 HTTPS 로 강제

HTTPS 인증서가 설정된 인그레스에 HTTP 로 접근했을 때, 자동으로 HTTPS 로 리다이렉트한다.

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
```

이 값은 TLS 설정이 있는 인그레스에서는 기본적으로 `true` 로 잡히기 때문에 명시할 일이 많지는 않다.
반대로 특정 인그레스만 HTTP 접근을 허용하고 싶다면 `"false"` 로 명시적으로 꺼둘 수 있다.

---

### 8.4 인그레스에 SSL/TLS 적용하기

인그레스의 매력 중 하나는 SSL/TLS 인증서를 **인그레스 컨트롤러 지점에 몰아둘 수 있다** 는 점이다.
뒤에 붙는 Deployment 나 Pod 는 인증서를 신경 쓰지 않아도 된다.
컨트롤러가 HTTPS 요청을 받아 복호화한 뒤, 평문 HTTP 로 백엔드에 전달하는 구조이기 때문이다.
게이트웨이 역할을 인그레스에 맡기는 셈이다.

적용 절차는 두 단계다.

1. TLS 인증서와 개인 키를 담은 `Secret` (`kubernetes.io/tls` 타입) 을 생성한다
2. 인그레스 매니페스트의 `spec.tls` 항목에서 이 Secret 을 참조한다

```shell
## TLS 타입의 Secret 생성 (인증서와 개인 키 파일이 준비돼 있다고 가정)
kubectl create secret tls example-tls \
  --cert=./server.crt \
  --key=./server.key
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com          # 이 도메인에 인증서를 적용
      secretName: example-tls      # 위에서 생성한 Secret 이름
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: users-service
                port:
                  number: 80
```

`spec.tls` 만 걸어두면 인그레스 컨트롤러가 자동으로 HTTP → HTTPS 리다이렉트를 처리한다.
바로 앞의 [8.3.3](#833-ssl-redirect--http-를-https-로-강제) 에서 살펴본 `ssl-redirect` 어노테이션이 자동으로 `true` 로 잡히기 때문이다.

클라우드 환경에서는 굳이 Secret 을 만들지 않고 플랫폼이 관리하는 인증서를 재사용할 수도 있다.
AWS 라면 ACM 에서 발급받은 인증서를, 인그레스 컨트롤러 서비스에 어노테이션으로 부착하는 방식이 흔하다.

```yaml
## LoadBalancer 타입 Service 에 ACM 인증서를 부착하는 예시
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:ap-northeast-2:123456789012:certificate/abc-def
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: http
spec:
  type: LoadBalancer
  ports:
    - name: https
      port: 443
      targetPort: 80
```

이 방식은 TLS 종료 지점이 인그레스 컨트롤러가 아닌 AWS ELB 로 한 단계 더 앞당겨진다.
인증서 갱신을 ACM 이 알아서 처리해주기 때문에 운영 편의성 면에서는 이쪽이 훨씬 낫다.

> [!NOTE]
> TLS 종료 지점을 인그레스 컨트롤러에 둘지, 클라우드 LB 에 둘지는 정책상의 선택이다. 내부망 규정으로 "인증서는 절대 클러스터 밖으로 나갈 수 없다" 같은 제약이 있다면 컨트롤러에 두는 편이 맞고, 그런 제약이 없다면 관리형 서비스에 맡기는 편이 손이 덜 간다.

---

### 8.5 여러 인그레스 컨트롤러 함께 쓰기

하나의 클러스터에서 반드시 컨트롤러를 하나만 써야 하는 것은 아니다.
Nginx 를 기본으로 두고 특정 규칙만 Kong 이나 다른 컨트롤러에 맡기는 구성도 가능하다.

앞의 예시들에서 계속 `ingressClassName: nginx` 를 지정했는데, 이 필드가 그 역할을 한다.
컨트롤러가 배포될 때 자기 이름의 `IngressClass` 를 함께 등록하고, 인그레스 오브젝트에 명시된 클래스 이름과 매칭되는 것만 골라서 처리하는 구조다.

```shell
## 현재 클러스터에 등록된 IngressClass 목록 확인
kubectl get ingressclass

## 출력 예시
# NAME    CONTROLLER                     PARAMETERS   AGE
# nginx   k8s.io/ingress-nginx           <none>       3d
# kong    konghq.com/ingress-controller  <none>       1d
```

이제 인그레스 매니페스트에서 어느 컨트롤러가 이 규칙을 처리할지 골라서 지정하면 된다.

```yaml
## Kong 컨트롤러에 맡기는 인그레스
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kong-ingress
spec:
  ingressClassName: kong        # nginx 대신 kong 을 지정
  rules:
    - host: gateway.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

이런 식으로 나눠 쓰면 특정 서비스에만 Kong 이 제공하는 인증·플러그인 기능을 붙이거나, 클라우드 환경에서 특정 도메인만 관리형 LB 로 처리하는 구성이 가능해진다.
컨트롤러마다 강점이 다르니, 하나로 통일하기보다는 상황에 맞춰 조합하는 편이 실용적이다.

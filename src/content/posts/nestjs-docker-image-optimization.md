## 📖 Introduction
> 급한 마음에 일단 대충 만들었던 **Dockerfile**, 처음에는 이게 그렇게 큰 문제가 될 줄 몰랐는데...

최근 NestJS 에 익숙해질 겸 작은 사이드 프로젝트를 진행하고 있는데, Backend 를 NestJS 로 구축하고 이를 컨테이너 기반으로 운용하기 위해 Dockerfile 을 작성했다.

하지만 그때 당시에는 내가 작성한 Dockerfile 이 그렇게 큰 문제가 될 거라고 생각하지 못했다. **500MB 가 넘는 이미지 사이즈**와 **빌드에 1분이 넘게 걸리는 문제**를 마주하기 전까지는.

이대로는 안되겠다 싶어 결국 서비스 오픈 전 개선을 위해 칼을 빼들었다. 애플리케이션 사이즈에 비해 커진 Docker Image 를 다이어트 시키기 위한 눈물겨운 노력이 이제 시작된다.

## ✒️ 기존 이미지의 문제점

```bash
FROM node:20.12.2-alpine3.18 AS base
LABEL maintainer="gwangin1999@naver.com"

RUN npm install -g pnpm

FROM base as deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base as builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

ENV NODE_ENV production
USER node
CMD ["node", "dist/main"]
```

처음 Docker 를 입문하고 나서 작성했던 초기 **Dockerfile** 은 **아래와 같은 문제를 안고 있다.**

1. 불필요한 **WORKDIR 선언이 너무 많다.**
2. deps Stage 에서 생성된 `/node_modules` 을 builder 와 runner Stage **두 차례에 걸쳐 COPY 하고 있다.** 
	- 가뜩이나 파일도 많은데 이걸 복사하는 과정에서 빌드 시간이 증가했다.
3. Production 환경에서는 **서비스 운영에 필요한 라이브러리만 설치하면 된다.** 
	- 굳이 `devDependencies` 에 포함된 라이브러	리까지 `/node_modules` 에 담아야 할까?
4. **Caching 전략이 부재하다.** 
	- 만약 이전 빌드와 현재 빌드 간의 변경이 없을 경우 캐싱된 데이터를 활용하는 Stage 가 없다.
	- 따라서 매번 새로운 빌드마다 같은 작업을 반복하고, 이는 빌드 시간의 증가로 이어진다.

---

## ✒️ 기존 이미지 빌드 테스트

### 1. 생성된 이미지 사이즈 : **512.4MB**
상당히 큰 이미지이며 프로젝트 규모가 작음을 고려하면 더욱 개선이 시급하다.

### 2. 빌드 시간 테스트

#### 2-A. 최초 Docker Image Build **(59.7s)**
 - deps Stage 의 3번째 Step (`pnpm install`) 과 두 차례에 걸친 `/node_modules` COPY 작업에서 많은 시간을 소요하고 있다.
        
![](https://velog.velcdn.com/images/rookieand/post/a8f47cd6-dfb0-4908-b6a9-169cea17eaa0/image.PNG)


#### 2-B. NestJS 애플리케이션 내 코드 일부가 변경된 경우 **(16.3s)**
- 의존성 파일은 변경되지 않아 deps Stage 의 3번째 Step 과 builder Stage 의 2번째 Step 은 CACHED 되었다.
- 하지만 이후 runner Stage 의 2번째 Step 의 경우 `/node_modules` COPY 작업을 또 다시 처리한다.
        
![](https://velog.velcdn.com/images/rookieand/post/b8859fa2-c1d3-4e6a-b406-c9c35461d6e7/image.PNG)

        
#### 2-C. package.json 의 변경 사항이 발생할 경우 **(38.9s)**
- 애플리케이션 코드의 변경 사항이 없기에 Build 결과물인 `/dist` 파일을 COPY 하는 작업은 CACHED 되었다.
- 하지만 그 외 의존성 파일을 설치하고, 이를 복사하는 Step 의 경우 시간을 계속 소비하고 있다.
        
![](https://velog.velcdn.com/images/rookieand/post/34d7fdb6-a1b4-4aef-a656-db89dab93702/image.PNG)

---

## ✒️ 이후 개선된 이미지

```bash
FROM node:20.12.2-alpine3.18 AS base
LABEL maintainer="gwangin1999@naver.com"
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnmcache,target=/var/pnpm/store \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm config set store-dir /var/pnpm/store && \
    pnpm config set package-import-method copy && \
    pnpm install --prefer-offline --ignore-scripts --frozen-lockfile

FROM base as builder
COPY . . 
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

FROM base AS runner
COPY --from=builder --chown=node:node /app/dist ./dist
RUN pnpm install --prod --frozen-lockfile

ENV NODE_ENV production
USER node
CMD ["node", "dist/main"]
```

위에서 기술한 문제를 해결하여 새롭게 Dockerfile 을 구축했다.

1. 불필요한 **WORKDIR 선언을 모두 걷어내고, base Stage 에서만 선언했다.**
2. **Cache Mount 를 활용**하여 의존성이 변경되더라도 재사용이 용이하도록 빌드 전략을 설계했다.
	- `--mount=type=cache`를 사용하여 `/var/pnpm/store` 디렉토리에 캐시를 마운트하면, `pnpm`은 패키지 설치 시 캐시를 활용한다.
    - 이렇게 하면 변경사항이 없는 라이브러리의 경우 이전 빌드에서 다운로드한 패키지를 재사용하기에 효과적이다.
3. deps Stage 에서 생성된 `/node_modules` 을 COPY 하지 않고 `--prod` 옵션을 킨 상태로 install 을 진행했다.
    - 이렇게 될 경우 dependencies 에 속한 라이브러리들만 설치하여 Image 사이즈가 감소하는 효과를 낳는다.
    - 또한 로컬 캐시를 활용하기에 패키지 설치 속도와 COPY 속도가 엇비슷하거나 더 빠를 것이라 기대했다.
    - 추가로 Production 환경에서는 **서비스 운영에 필요한 라이브러리만 설치하는 것이 바람직하다 생각했다.**

---

## ✒️ 리뉴얼 이미지 빌드 테스트

### 1. 생성된 이미지 사이즈 : **144.7MB**
- 불필요한 파일을 걷어내 기존 대비 **70% 이상의 사이즈**가 감소했다.
- 추가로 이미지 사이즈가 줄어 **이미지를 내보내는 작업이 빨라지는 이점도 얻었다 (5s > 1~2s)**

### 2. 빌드 시간 테스트

#### 2-A. 최초 Docker Image Build **(59.7s > 51s)**
- 기존에 비해 불필요한 `/node_modules` COPY 작업이 생략되어 빌드 시간이 소폭 줄었다.
        
![](https://velog.velcdn.com/images/rookieand/post/cc214dca-45fb-48b8-a765-576c6d08d709/image.PNG)

        
#### 2-B. NestJS 애플리케이션 내 코드 일부가 변경된 경우 **(16.3s > 10.4s)**
- 이전에는 `/node_modules` 을 COPY 하는 작업에서 5초가 소요되었으나, 이를 install 로 대체하여 **2초로 감소**했다.
        
![](https://velog.velcdn.com/images/rookieand/post/adc35fe1-2b7f-4ab0-9788-9b0ec37b475d/image.PNG)
   
#### 2-C. package.json 의 변경 사항이 발생할 경우 **(38.9s > 22.2s)**
- 의존성 파일이 변경되더라도 기존에 Cached 되었던 데이터를 재활용하기에 **7초만에 설치를 마무리지었다.**
- 새롭게 추가된 라이브러리에 대해서만 download 를 진행하고, 그 외는 캐시된 데이터를 사용함을 알 수 있었다.
 
![](https://velog.velcdn.com/images/rookieand/post/74b4b6ac-dedf-40dd-bfd2-c5433216fc68/image.PNG)
      
> ⚠️ 위의 Dockerfile 중에서 **pnpm 관련한 명령어 두 가지**에 대해서 짚고 넘어가자.


1. **pnpm config set store-dir /var/pnpm/store**
    - pnpm 에서 패키지를 보관하는 Store Directory 를 Cache Mount 의 대상이 되는 디렉토리 **/var/pnpm/store** 로 지정한다.
    - 기본적으로 pnpm 은 Store Directory 를 Linux OS 에서는 **/.local/share/pnpm/store** 으로 지정하기에 수정이 필요하다.

2. **pnpm config set package-import-method copy**
    - pnpm 에서 사용하는 패키지 설치 전략을 기본값인 auto 에서 `copy` 로 지정하기 위한 명령어다.
    - 기본적으로 pnpm 에서는 공통의 스토어를 두고 저장된 패키지를 Hard Link 기반으로 가져온다
    - Docker 환경에서는 여러 레이어를 사용하여 이미지를 빌드하기에 각 레이어가 서로 다른 파일 시스템에 존재하여 Hard Link 가 동작하지 않을 가능성이 있다.
    - 또한 Docker 에서 사용하는 Storage Driver (`overlay2` 등) 중 일부는 Hard Link 를 지원하지 않는다.
    
    
## ✒️ Conclusion

기존의 이미지 빌드 과정에서 발생했던 여러 문제들을 종합적으로 해결하고, 이를 기반으로 Docker Image 의 용량을 줄여 배포 시간이 더욱 빨라지도록 설계했다.

사실 조금만 더 초반에 신경썼으면 진작에 해결 가능한 문제였는데, 서비스 초기 구축을 대충 해버린 나머지 이런 참사가 발생했다고 생각한다.

다음 글에서는 Github Action 을 기반으로 한 CI / CD 과정에서 어떻게 배포 시간을 단축했는지를 소개하려 한다.

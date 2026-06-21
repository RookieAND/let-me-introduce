## 배경: pnpm 모노레포, CI가 느렸다

goorm의 프론트엔드 모노레포는 앱 5개, 패키지 12개로 구성된다. 변경이 없는 패키지도 매 CI에서 빌드가 돌았고, PR 하나에 8~12분이 걸렸다.  

Turborepo의 Remote Cache를 쓰면 이전 빌드 결과를 재사용할 수 있다는 걸 알았다. 공식 클라우드인 [Vercel Remote Cache](https://turbo.build/repo/docs/core-concepts/remote-caching)는 팀 플랜 이상에서만 무제한으로 쓸 수 있었고, 추가 비용을 들이고 싶지 않았다.  

그래서 **직접 구축**하기로 했다.  

---

## Remote Cache 프로토콜

Turborepo Remote Cache는 단순한 HTTP API다. 세 엔드포인트만 있으면 된다.  

- `GET  /v8/artifacts/:hash` — 캐시 히트 확인 + 다운로드
- `PUT  /v8/artifacts/:hash` — 캐시 업로드
- `HEAD /v8/artifacts/:hash` — 캐시 존재 여부 확인

```typescript
// 캐시 업로드 핸들러
app.put('/v8/artifacts/:hash', async (req, res) => {
  const { hash } = req.params;
  const teamId = req.query.teamId as string;
  const dest = path.join(CACHE_DIR, teamId, hash);

  await fs.mkdir(path.dirname(dest), { recursive: true });
  const stream = fs.createWriteStream(dest);
  req.pipe(stream);

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  res.json({ urls: [hash] });
});
```

---

## 스토리지: AWS EFS

파일을 어디에 저장할지가 핵심이었다. Jenkins 에이전트가 여러 인스턴스로 스케일 아웃되기 때문에, 로컬 디스크에 저장하면 에이전트마다 캐시가 달라진다.  

[AWS EFS](https://aws.amazon.com/efs/)(Elastic File System)를 선택했다. NFS 기반으로 여러 EC2 인스턴스에서 동시에 마운트할 수 있고, 저장 용량만큼만 비용을 낸다.  

```bash
# Jenkins 에이전트의 /mnt/turbo-cache에 EFS 마운트
sudo mount -t nfs4 \
  fs-xxxxxxxx.efs.ap-northeast-2.amazonaws.com:/ \
  /mnt/turbo-cache
```

캐시 서버 컨테이너도 같은 EFS를 마운트해서 쓴다. 에이전트가 몇 개 뜨든 같은 캐시를 공유한다.  

---

## Turborepo 연동

`.turbo/config.json` 또는 환경변수로 Remote Cache 서버를 지정한다.  

```json
{
  "teamId": "goorm",
  "apiUrl": "https://turbo-cache.internal.goorm.io"
}
```

```bash
# CI에서 실행
TURBO_TOKEN=secret pnpm turbo build --team=goorm
```

캐시 히트 시 Turborepo는 빌드를 건너뛰고 캐시된 결과물을 복원한다.  

---

## 캐시 만료 처리

EFS는 저장한 만큼 비용이 든다. 오래된 캐시를 정리하는 크론잡을 붙였다.  

```bash
# 14일 이상 접근하지 않은 캐시 삭제
find /mnt/turbo-cache -atime +14 -type f -delete
```

Jenkins의 주기적 잡으로 등록해두면 스토리지가 무한정 쌓이지 않는다.  

---

## 결과

- PR 평균 CI 시간 **11분 → 2분** (영향받은 패키지만 빌드)
- 추가 SaaS 비용 **$0** (EFS 비용은 월 $3 내외)
- 스케일 아웃 시에도 캐시 공유가 자동으로 동작

팀에서 "CI가 이제 빠르다"는 말을 들을 때가 가장 보람 있었다.  

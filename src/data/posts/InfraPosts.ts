import type { Post } from "#/data/Posts";

export const INFRA_POSTS: Post[] = [
  {
    slug: "valkey-hash-key-expiration",
    date: "2026-06-16",
    cat: "DB / Infra",
    title: "Valkey Hash Key Expiration — 필드 단위 TTL 설정",
    excerpt: [
      "Redis, Valkey 는 원래 Key 단위로만 TTL 을 지원했다. Hash 필드마다 만료 시간이 달라야 할 때 기존에는 개별 Key 로 분리하거나 Lua Script 로 우회하는 수밖에 없었다. Valkey 9.0 에서 추가된 HEXPIRE, HPEXPIRE, HEXPIREAT, HTTL, HPERSIST 등 9개 명령어와 Active Expiration 동작 방식을 정리했다.",
    ],
    tags: ["Valkey", "Redis", "Cache", "TTL", "Hash"],
    read: "8 min",
    href: "/posts/valkey-hash-key-expiration",
  },
  {
    slug: "mongoose-connection-internals",
    date: "2023-06-01",
    cat: "DB / Infra",
    title: "Mongoose Connection 내부 동작 — 싱글톤, Default Connection, Hot Reload 메모리 누수",
    excerpt: [
      "require('mongoose') 한 줄이 실행되는 순간 이미 connections 배열에는 빈 Connection이 하나 들어간다. 생성자 내부에서 createConnection()을 호출하기 때문이다. connect()와 createConnection()의 슬롯 차이, 그리고 Hot Reload마다 Connection이 쌓이는 메모리 누수까지.",
    ],
    tags: ["Node.js", "Mongoose", "MongoDB", "메모리 누수"],
    read: "8 min",
    href: "/posts/mongoose-connection-internals",
  },
  {
    slug: "docker-kubernetes-ch1",
    date: "2026-06-01",
    cat: "DB / Infra",
    title: "도커란? — 가상 머신과 컨테이너의 차이",
    excerpt: [
      "하이퍼바이저 기반 VM의 성능 손실·이미지 크기 문제와, 도커가 chroot·네임스페이스·cgroup으로 프로세스 단위 격리를 구현하는 원리. MSA 환경에서 컨테이너가 주목받는 이유를 정리했다.",
    ],
    tags: ["Docker", "Container", "가상화"],
    read: "3 min",
    href: "/posts/docker-kubernetes-ch1",
  },
  {
    slug: "docker-kubernetes-ch2",
    date: "2026-06-01",
    cat: "DB / Infra",
    title: "도커 엔진 — 이미지·컨테이너·볼륨·네트워크 완전 정리",
    excerpt: [
      "컨테이너 생성·볼륨·네트워크·로깅·자원 제한·이미지 레이어까지. 도커 엔진 핵심 기능 전체 정리.",
    ],
    tags: ["Docker", "Container", "Network", "Volume"],
    read: "15 min",
    href: "/posts/docker-kubernetes-ch2",
  },
  {
    slug: "docker-compose-basics",
    date: "2024-10-01",
    cat: "DB / Infra",
    title: "Docker Compose 찍먹하기",
    excerpt: [
      "다수의 컨테이너를 일괄 실행·관리하기 위한 Docker Compose의 필요성과 compose 파일 작성 방법, 컨테이너 간 네트워크 구성, 주요 명령어를 정리했다.",
    ],
    tags: ["Docker", "Docker Compose", "Infra"],
    read: "6 min",
    href: "/posts/docker-compose-basics",
  },
  {
    slug: "nestjs-docker-image-optimization",
    date: "2024-06-01",
    cat: "DB / Infra",
    title: "내겐 너무나 컸던 NestJS Docker Image, 이젠 좀 줄여보자",
    excerpt: [
      "급하게 만든 NestJS Dockerfile이 1GB에 육박했다. pnpm + turbo prune + 멀티스테이지 빌드를 조합해 이미지를 대폭 줄인 과정.",
    ],
    tags: ["NestJS", "Docker", "pnpm", "최적화"],
    read: "8 min",
    href: "/posts/nestjs-docker-image-optimization",
  },
  {
    slug: "github-actions-docker-deploy",
    date: "2024-06-01",
    cat: "DB / Infra",
    title: "Github Actions으로 Docker 배포 오답노트",
    excerpt: [
      "scp-action source 경로 오류, Job 간 checkout 누락, .env 숨김 파일 문제, Nginx 502·host.docker.internal Linux 미지원까지. 처음 배포 파이프라인을 구축하며 삽질한 것들의 기록.",
    ],
    tags: ["GitHub Actions", "Docker", "CI/CD"],
    read: "7 min",
    href: "/posts/github-actions-docker-deploy",
  },
];

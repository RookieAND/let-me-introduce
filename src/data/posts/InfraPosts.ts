import type { Post } from "#/data/Posts";

export const INFRA_POSTS: Post[] = [
  {
    slug: "valkey-hash-key-expiration",
    date: "2026-06-16",
    cat: "DB / Infra",
    title: "Valkey Hash Key Expiration — 필드 단위 TTL 설정",
    excerpt: [
      "Valkey 9.0에서 추가된 Hash 필드 단위 TTL — HEXPIRE, HPEXPIRE 등 9개 명령어와 Active Expiration 동작 방식.",
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
      "require('mongoose')가 실행되는 순간 생성되는 빈 Connection, connect()와 createConnection()의 차이, Hot Reload 메모리 누수.",
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
      "VM의 성능 손실 문제와 도커가 chroot·네임스페이스·cgroup으로 프로세스 단위 격리를 구현하는 원리.",
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
      "컨테이너 생성·볼륨·네트워크·로깅·자원 제한·이미지 레이어까지 도커 엔진 핵심 기능 전체 정리.",
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
      "다수 컨테이너를 일괄 관리하는 Docker Compose — compose 파일 작성, 컨테이너 간 네트워크 구성, 주요 명령어.",
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
      "pnpm + turbo prune + 멀티스테이지 빌드로 1GB에 육박하던 NestJS Docker 이미지를 대폭 줄인 과정.",
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
      "scp-action 오류, checkout 누락, .env 숨김 파일, Nginx 502까지 첫 배포 파이프라인에서 겪은 삽질 기록.",
    ],
    tags: ["GitHub Actions", "Docker", "CI/CD"],
    read: "7 min",
    href: "/posts/github-actions-docker-deploy",
  },
];

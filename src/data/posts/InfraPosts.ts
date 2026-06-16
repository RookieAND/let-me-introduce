import type { Post } from "#/data/Posts";

export const INFRA_POSTS: Post[] = [
  {
    slug: "docker-kubernetes-ch1",
    date: "2026-06-01",
    cat: "Infra",
    title: "도커란? — 가상 머신과 컨테이너의 차이",
    excerpt:
      ["하이퍼바이저 기반 VM의 성능 손실·이미지 크기 문제와, 도커가 chroot·네임스페이스·cgroup으로 프로세스 단위 격리를 구현하는 원리. MSA 환경에서 컨테이너가 주목받는 이유를 정리했다."],
    tags: ["Docker", "Container", "가상화"],
    read: "3 min",
    href: "/posts/docker-kubernetes-ch1",
  },
  {
    slug: "docker-kubernetes-ch2",
    date: "2026-06-01",
    cat: "Infra",
    title: "도커 엔진 — 이미지·컨테이너·볼륨·네트워크 완전 정리",
    excerpt:
      ["컨테이너 생성·볼륨·네트워크·로깅·자원 제한·이미지 레이어까지. 도커 엔진 핵심 기능 전체 정리."],
    tags: ["Docker", "Container", "Network", "Volume"],
    read: "15 min",
    href: "/posts/docker-kubernetes-ch2",
  },
  {
    slug: "docker-compose-basics",
    date: "2024-10-01",
    cat: "Infra",
    title: "Docker Compose 찍먹하기",
    excerpt:
      ["다수의 컨테이너를 일괄 실행·관리하기 위한 Docker Compose의 필요성과 compose 파일 작성 방법, 컨테이너 간 네트워크 구성, 주요 명령어를 정리했다."],
    tags: ["Docker", "Docker Compose", "Infra"],
    read: "6 min",
    href: "/posts/docker-compose-basics",
  },
  {
    slug: "nestjs-docker-image-optimization",
    date: "2024-06-01",
    cat: "Infra",
    title: "내겐 너무나 컸던 NestJS Docker Image, 이젠 좀 줄여보자",
    excerpt:
      ["급하게 만든 NestJS Dockerfile이 1GB에 육박했다. pnpm + turbo prune + 멀티스테이지 빌드를 조합해 이미지를 대폭 줄인 과정."],
    tags: ["NestJS", "Docker", "pnpm", "최적화"],
    read: "8 min",
    href: "/posts/nestjs-docker-image-optimization",
  },
  {
    slug: "github-actions-docker-deploy",
    date: "2024-06-01",
    cat: "Infra",
    title: "Github Actions으로 Docker 배포 오답노트",
    excerpt:
      ["scp-action source 경로 오류, Job 간 checkout 누락, .env 숨김 파일 문제, Nginx 502·host.docker.internal Linux 미지원까지. 처음 배포 파이프라인을 구축하며 삽질한 것들의 기록."],
    tags: ["GitHub Actions", "Docker", "CI/CD"],
    read: "7 min",
    href: "/posts/github-actions-docker-deploy",
  },
];

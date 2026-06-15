# Spring Boot Deployment Runtime Lab

이 레포는 A&I 백엔드 커리큘럼의 `09~10` 배포와 운영 자동화 시퀀스를 담는 토픽 레포입니다.
`main`은 가이드 브랜치이고, 학생 실습은 오늘 시퀀스 번호에 맞는 `NN-implementation`에서 시작합니다.

## 이 레포에서 배우는 것

- 로컬에서는 실행되던 앱이 서버에서 실패하는 문제를 찾는 방법
- Spring Boot jar를 Docker 실행 단위로 묶기
- `application-prod.yaml`로 운영 설정 분리하기
- GitHub Actions와 Secrets로 배포 입력값을 분리하기
- build, test, deploy, verify 자동화 흐름 분리하기
- workflow와 배포 스크립트 역할 나누기

## 시작 방법

오늘 시퀀스 번호에 맞는 브랜치로 checkout합니다.
예를 들어 시퀀스 09는 아래처럼 시작합니다.

```bash
git clone https://github.com/stdiodh/spring-boot-deployment-runtime-lab.git
cd spring-boot-deployment-runtime-lab
git checkout 09-implementation
```

## 실습 브랜치

| 용도 | 브랜치 |
| --- | --- |
| 가이드 | `main` |
| 학생 시작 | `09-implementation`, `10-implementation` |
| 참고 정답 | `09-answer`, `10-answer` |

## 실행 방법

로컬 확인:

```bash
docker compose up -d
./gradlew bootRun
```

배포 산출물 확인:

```bash
./gradlew bootJar
```

## 테스트 방법

```bash
./gradlew test
```

배포 전 검증:

```bash
./gradlew test bootJar
```

컨테이너 실행 확인:

```bash
docker build -t aandi-deployment-runtime-lab .
docker compose up -d
```

테스트가 확인하는 것:

- 09는 docker build, docker compose up, health check 또는 로그 확인을 다룹니다.
- 10은 workflow 성공/실패 케이스와 배포 전 검증 명령을 다룹니다.

실패하면 먼저 볼 것:

- Gradle test 실패, bootJar 실패, Docker build 실패, compose 실행 실패를 분리해서 읽습니다.
- GitHub Actions에서는 처음 실패한 step을 먼저 확인합니다.

완료 기준:

- 배포 전 검증 명령이 통과합니다.
- 컨테이너 실행 상태 또는 workflow verify 기준을 설명할 수 있습니다.

## 정답과 비교하는 방법

실습 중 막혔거나 완료 후 확인이 필요할 때만 같은 번호의 참고 정답 브랜치와 비교합니다.
예를 들어 시퀀스 10은 아래처럼 비교합니다.

```bash
git fetch origin
git diff 10-implementation..10-answer
```

## Visual Lab

`main` 가이드 브랜치에는 Docker/Runtime과 CI/CD 자동화 흐름을 훑어보는 Visual Lab 진입점이 있습니다.
이 페이지는 정답 비교 페이지가 아니라 배포 단위, 환경 설정, 자동화 순서를 먼저 이해하기 위한 정적 학습 화면입니다.

```text
docs/visual-lab/index.html
```

## 문서 안내

- [레포 가이드](./docs/repo-guide.md)
- [브랜치 가이드](./docs/branch-guide.md)
- [시퀀스 맵](./docs/sequence-map.md)
- [Visual Lab](./docs/visual-lab/index.html)

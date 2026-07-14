# 10 CI/CD Deployment

## 이 시퀀스에서 다루는 문제

이번 answer 브랜치는 09 시퀀스에서 만든 배포 가능한 앱을 GitHub Actions와 shell script로 반복 실행하는 비교 기준입니다. build, test, deploy, verify 단계를 분리해 실패한 단계 이후 작업이 실행되지 않도록 하고, 배포 성공 판정을 verify 단계까지 포함합니다.

이번 범위는 GitHub Actions workflow와 shell script의 책임 분리입니다. 고급 배포 전략, 복잡한 브랜치 전략, 모니터링 도구 전체, Kubernetes/Terraform은 포함하지 않습니다.

## 학습 목표

- CI와 CD를 이번 코드 기준으로 구분합니다.
- build, test, deploy, verify 단계가 어떤 순서로 이어지는지 설명합니다.
- workflow와 shell script의 책임을 분리합니다.
- starter 구현과 answer 구현의 차이를 job 의존성, artifact 전달, deploy/verify script 기준으로 비교합니다.

## 멘티 시작 흐름

먼저 starter 브랜치에서 직접 구현한 뒤, 이 브랜치의 문서를 비교 기준으로 사용합니다.

```bash
git fetch origin
git diff origin/10-implementation..origin/10-answer
```

비교할 때는 자동화가 "어디서 멈추고 어디서 성공이라고 판단하는지"를 중심으로 봅니다.

## 읽는 순서

1. [이론 정리](./docs/theory.md)
2. [구현 가이드](./docs/implementation.md)
3. [체크리스트](./docs/checklist.md)

## 실행 / 테스트 방법

로컬 검증은 아래 명령으로 시작합니다.

```bash
./gradlew test bootJar
```

배포 검증 script는 운영 환경의 `.env`, Docker, 실행 중인 컨테이너 상태에 의존합니다. 로컬에서 실행할 때는 필요한 환경이 준비되어 있는지 먼저 확인합니다.

```bash
bash scripts/check-deploy.sh
```

## 완료 기준

- build와 test가 deploy보다 먼저 실행됩니다.
- workflow 실패 시 다음 단계로 넘어가지 않습니다.
- deploy script와 verify script의 역할이 분리되어 있습니다.
- verify 단계가 컨테이너 상태, 로그, HTTP 응답 확인을 포함합니다.
- `./gradlew test bootJar`가 통과합니다.

<details>
<summary>멘토용 진행 포인트</summary>

## 수업 전 확인

- answer 브랜치에서 `./gradlew test bootJar`가 통과하는지 확인합니다.
- GitHub Actions와 EC2 검증은 외부 환경이 필요하므로 로컬 검증 범위와 운영 검증 범위를 분리합니다.
- secret 값 자체를 workflow나 문서에 쓰지 않고 이름과 주입 위치만 다룹니다.

## 수업 중 질문

- answer의 build job이 실패하면 deploy job은 어떻게 되나요?
- release bundle에는 어떤 파일이 들어가나요?
- deploy script와 verify script를 나눈 이유는 무엇인가요?

## 리뷰 기준

- 멘티가 answer 코드를 그대로 외우는 것이 아니라 실패 차단과 성공 판정 기준을 설명하는지 봅니다.
- workflow는 순서와 artifact 전달을 담당하고, script는 서버 작업을 담당한다는 구분을 확인합니다.
- verify가 빠진 자동화의 위험을 설명할 수 있는지 봅니다.

</details>

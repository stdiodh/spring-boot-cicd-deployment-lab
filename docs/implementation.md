# Docker/Runtime과 CI/CD 구현 안내

## 1. 해결할 문제

운영 서버는 로컬 개발 환경과 다릅니다.
앱을 jar로 만들고, Docker 이미지로 묶고, 운영 profile과 secret을 외부에서 주입해야 같은 방식으로 실행할 수 있습니다.

## 2. 구현 흐름

1. `./gradlew test bootJar`로 실행 산출물을 만듭니다.
2. `Dockerfile`이 jar를 컨테이너 실행 단위로 묶습니다.
3. `application-prod.yaml`이 운영 환경변수 자리를 정의합니다.
4. `deploy/compose.prod.yaml`이 앱과 의존 서비스를 실행합니다.
5. `.github/workflows/deploy.yml`이 test/build, release bundle 생성, upload, EC2 deploy, 로그 확인 흐름을 연결합니다.

## 3. 핵심 코드

왜 이 코드를 보는지 먼저 정리합니다.
CI/CD는 secret을 레포에 저장하지 않고 실행 시점에만 꺼내 써야 합니다.

```yaml
- name: Run tests and build jar
  run: ./gradlew test bootJar
```

이 코드는 배포 전에 테스트와 jar 생성이 먼저 통과해야 한다는 문제를 해결합니다.
배포 실패를 줄이려면 서버에 올리기 전에 빌드 산출물이 정상인지 확인해야 합니다.

## 4. 실행/테스트

```bash
./gradlew test bootJar
docker build -t aandi-deployment-runtime-lab:local .
docker compose up -d
```

운영에서는 GitHub Secrets를 채운 뒤 workflow를 실행하고, EC2에서 컨테이너 상태와 로그를 확인합니다.

## 5. 한계와 다음 개선 방향

이번 구현은 기본 배포 자동화입니다.
실패 rollback, blue/green 배포, 모니터링, 알림은 다음 운영 개선 과제로 남깁니다.

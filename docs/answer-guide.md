# 참고 구현 가이드

이 문서는 answer 브랜치에서만 사용하는 비교 가이드입니다. starter 구현을 마친 뒤 build, test, deploy, verify 흐름이 같은 순서로 이어지는지 확인합니다.

## 1. 꼭 비교할 파일

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/check-deploy.sh`

## 2. CI workflow 비교 포인트

`ci.yml`은 build와 test를 먼저 고정해야 합니다.

```yaml
- name: Run build and test
  run: ./gradlew test bootJar
```

- 검증된 산출물만 다음 단계로 넘어갈 수 있는지 확인합니다.
- push와 pull request 트리거가 이번 시퀀스 브랜치 기준과 맞는지 확인합니다.

## 3. deploy workflow 비교 포인트

`deploy.yml`은 build, deploy, verify job을 나누고 job 의존성으로 순서를 고정합니다.

- build job은 release bundle을 만듭니다.
- deploy job은 artifact를 내려받아 EC2에 업로드하고 `deploy.sh`를 실행합니다.
- verify job은 `check-deploy.sh`를 실행합니다.
- secret 값 자체는 파일에 직접 남지 않고 `secrets.*` 참조로만 사용됩니다.

## 4. deploy script 비교 포인트

`scripts/deploy.sh`는 서버에서 실제 재배포를 수행합니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml down || true
docker build -t "$APP_IMAGE" .
docker compose --env-file .env -f deploy/compose.prod.yaml up -d
```

workflow가 순서를 담당하고 script가 서버 작업을 담당한다는 역할 분리를 확인합니다.

## 5. verify script 비교 포인트

`scripts/check-deploy.sh`는 배포 성공 판정을 담당합니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

컨테이너 상태, 최근 로그, HTTP 응답 확인이 함께 있어야 "배포 명령 실행"과 "앱 정상 기동"을 구분할 수 있습니다.

## 6. 멘토 리뷰 포인트

- starter와 answer의 차이를 코드 길이가 아니라 실패 차단 지점과 성공 판정 기준으로 비교합니다.
- verify가 없는 자동화가 왜 위험한지 사례로 설명하게 합니다.
- 운영 환경이 없으면 로컬 `./gradlew test bootJar`와 script 구조 검토를 통과 기준으로 둡니다.

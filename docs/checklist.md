# Docker Runtime과 CI/CD 체크리스트

## 수업 전 확인

- [ ] `09-answer`가 `deploy-v1.0.3` HTTP 배포 commit에 고정된 불변 기준인지 확인했습니다.
- [ ] `10-answer`가 09 기준 위에 Nginx와 HTTPS 계약을 추가하는 실행 브랜치인지 확인했습니다.

## 09 Docker Runtime

- [ ] `./gradlew clean test bootJar`가 통과합니다.
- [ ] executable JAR가 `build/libs/app.jar` 하나로 만들어집니다.
- [ ] plain JAR task가 비활성화되어 있습니다.
- [ ] `.dockerignore`가 `build/libs/app.jar`를 image build context에 포함합니다.
- [ ] Dockerfile이 정확히 `build/libs/app.jar`를 복사합니다.
- [ ] image에 `org.opencontainers.image.revision` label이 있습니다.
- [ ] `deploy/compose.prod.yaml`은 `APP_IMAGE`가 없으면 실패합니다.
- [ ] 애플리케이션 runtime 값은 `.env`로 주입됩니다.

## 10 CI와 image 게시

- [ ] CI는 `10-answer` 대상 PR과 `10-answer` push에서 test와 `bootJar`를 실행합니다.
- [ ] test 실패 시 image build와 push가 실행되지 않습니다.
- [ ] Docker Hub에는 tag 대상 40자리 commit SHA와 `deploy-https-vX.Y.Z` tag가 게시됩니다.
- [ ] 기존 SHA image는 revision label을 확인해 재사용하고 다시 push하지 않습니다.
- [ ] `latest` tag를 게시하거나 배포 입력으로 사용하지 않습니다.
- [ ] 실제 배포 입력은 SHA tag입니다.
- [ ] image revision label은 tag 대상 commit SHA입니다.

## secret과 runtime 경계

- [ ] Docker Hub와 EC2 접속값은 Repository Secret에 있습니다.
- [ ] DB, JWT, OAuth, Mail 값은 GitHub `production` Environment의 Secret과 Variable에 있습니다.
- [ ] 필수 Variable `PROD_DOMAIN`과 `PROD_CERTBOT_EMAIL`이 `production` Environment에 있습니다.
- [ ] `PROD_DOMAIN`의 모든 A 레코드는 `EC2_HOST`와 같은 IPv4를 가리키고 AAAA 레코드는 없습니다.
- [ ] 최초 HTTPS 전환 뒤 같은 EC2의 `PROD_DOMAIN`, `PROD_CERTBOT_EMAIL`을 변경하지 않습니다.
- [ ] 공개 URL과 WebSocket origin은 모두 `https://`를 사용합니다.
- [ ] Secret을 workflow 명령문에 직접 삽입하지 않고 step `env`로 전달합니다.
- [ ] workflow가 필수값 누락과 dotenv에 안전하지 않은 줄바꿈을 EC2 전송 전에 차단합니다.
- [ ] workflow가 제한된 재시도와 `ssh-keyscan`으로 `known_hosts`를 준비합니다.
- [ ] EC2 `.env` 권한은 `600`입니다.
- [ ] 검증된 `.env.next`만 기존 `.env`와 원자적으로 교체됩니다.
- [ ] 기존 `.env`는 rollback을 위해 `.env.previous`로 보존됩니다.
- [ ] 새 배포 bundle은 `.deploy-next`에서 검증되고 현재 bundle은 `.deploy.previous`에 보존됩니다.
- [ ] secret 실제 값이 workflow, script, 문서, 로그에 노출되지 않습니다.

## EC2 배포

- [ ] EC2에는 Docker, curl, sha256sum이 설치되어 있습니다.
- [ ] Compose plugin이 없으면 workflow가 checksum 검증 후 배포 사용자 영역에 설치합니다.
- [ ] 전용 배포 사용자가 Docker daemon에 접근하며, 필요하면 passwordless sudo로 `docker` 그룹에 추가됩니다.
- [ ] Security Group에서 `80`, `443`을 열고 `3306`, `6379`는 닫았습니다.
- [ ] 첫 09→10 전환이면 기존 `8080` 규칙을 HTTPS verify 성공까지 유지했습니다.
- [ ] HTTPS verify 성공 직후 `8080` 규칙을 제거했습니다. 신규 10 배포라면 처음부터 열지 않았습니다.
- [ ] 첫 배포가 사전 `.env` 없이 MySQL, Redis, app, Nginx와 Certbot을 생성합니다.
- [ ] `scripts/deploy.sh`가 정확한 SHA image를 pull합니다.
- [ ] MySQL과 Redis는 `--no-recreate`로 보존되고, 없거나 멈춘 경우 기동됩니다.
- [ ] app은 host port 없이 Compose 내부 `8080`에서만 요청을 받습니다.
- [ ] Nginx는 `nginx:1.28.3-alpine`으로 host `80`, `443`만 공개합니다.
- [ ] Certbot은 `certbot/certbot:v5.7.0`을 사용합니다.
- [ ] 인증서가 없거나 손상·만료·24시간 이내 만료 예정이면 HTTP challenge Nginx를 먼저 띄운 뒤 Certbot webroot 방식으로 발급 또는 갱신합니다.
- [ ] 발급 후 Nginx가 HTTPS template로 전환되어 `app:8080`으로 reverse proxy합니다.
- [ ] Nginx가 forwarded header와 WebSocket upgrade header를 전달합니다.
- [ ] Spring Boot가 forwarded header를 해석합니다.
- [ ] Certbot은 12시간마다 갱신을 시도하고 Nginx는 6시간마다 reload합니다.
- [ ] 기존 MySQL과 Redis container를 내리거나 다시 만들지 않습니다.
- [ ] MySQL은 root가 아닌 전용 애플리케이션 사용자를 제공합니다.
- [ ] MySQL named volume과 기존 데이터가 재배포 전후 유지됩니다.
- [ ] MySQL `3306`과 Redis `6379`는 host port로 공개되지 않습니다.
- [ ] `docker compose down -v`를 사용하지 않습니다.
- [ ] 같은 SHA를 다시 배포해도 script가 실패하지 않습니다.
- [ ] deployment concurrency가 동시 운영 배포를 직렬화합니다.
- [ ] 실패 시 이전 Compose·Nginx template·script, `.env`, image를 함께 복구합니다.

## 배포 검증

- [ ] MySQL과 Redis가 healthy 상태인지 확인합니다.
- [ ] Nginx가 healthy이고 Certbot이 running 상태인지 확인합니다.
- [ ] app container가 running 상태인지 확인합니다.
- [ ] 실제 image reference와 image ID가 예상 SHA image와 같습니다.
- [ ] OCI revision label이 예상 commit SHA와 같습니다.
- [ ] `https://<PROD_DOMAIN>/actuator/health/readiness` 응답을 제한된 횟수로 재시도합니다.
- [ ] `http://<PROD_DOMAIN>/` 요청이 같은 도메인의 HTTPS URL로 이동합니다.
- [ ] 실패 시 Compose 상태와 최근 app log를 확인할 수 있습니다.
- [ ] 내부 또는 외부 HTTPS verify 실패 시 이전 bundle, `.env`, image와 HTTP/HTTPS readiness가 자동 복구됩니다.
- [ ] 이력상 rollback 배포는 기존 tag를 이동하지 않고 정상 HTTPS commit에 더 높은 새 tag를 만듭니다.
- [ ] verify 실패가 workflow 전체 실패로 이어집니다.

## trigger 정책

- [ ] `deploy-https-v<major>.<minor>.<patch>` 새 tag push만 HTTPS production deploy를 시작합니다.
- [ ] tag 강제 이동은 `github.event.created`, `github.event.forced` gate에서 거부됩니다.
- [ ] GitHub tag ruleset이 `deploy-https-v*`의 update와 delete를 제한합니다.
- [ ] 원격 tag와 peeled `tag^{}` ref의 쌍으로 annotated tag를 판별합니다.
- [ ] tag commit이 `origin/10-answer`에 포함되지 않으면 publish 전에 실패합니다.
- [ ] 이미 원격에 push한 배포 tag는 이동하거나 재사용하지 않습니다.

## 로컬 마무리

- [ ] `bash -n scripts/deploy.sh`가 통과합니다.
- [ ] `bash -n scripts/check-deploy.sh`가 통과합니다.
- [ ] `docker compose ... config`가 통과합니다.
- [ ] `git diff --check`가 통과합니다.
- [ ] 외부 Docker Hub와 EC2 검증 여부를 별도로 기록했습니다.
- [ ] `10-answer`의 commit을 push한 뒤 `deploy-https-v1.0.0` annotated tag를 만들었습니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 학생이 `test -> SHA image -> runtime env -> 인증서 bootstrap -> HTTPS readiness -> rollback`을 설명합니다.
- 보완 기준: `latest`를 사용하거나, `10-answer` 밖의 commit에 배포 tag를 만듭니다.
- 질문 예시: “workflow가 성공했지만 실행 revision이 다른 경우 이 배포는 성공인가요?”
- 질문 예시: “왜 MySQL과 Redis의 host port를 공개하지 않아도 app이 연결될 수 있나요?”
- 질문 예시: “왜 app의 `8080`을 닫고 Nginx의 `80/443`만 공개하나요?”
- 질문 예시: “최초 인증서 발급과 이후 자동 갱신에서 Nginx와 Certbot은 각각 무엇을 하나요?”
- 질문 예시: “MySQL volume이 이미 있으면 GitHub Secret 변경만으로 비밀번호가 바뀌지 않는 이유는 무엇인가요?”

</details>

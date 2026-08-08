# CI/CD와 HTTPS 운영 배포 체크리스트

## 저장소와 포크

- [ ] 이 저장소가 시퀀스 10 독립 저장소이고 `main`이 유일한 기준 브랜치임을 확인했습니다.
- [ ] 포크의 Actions 탭에서 workflow 실행을 활성화했습니다.
- [ ] 포크에 Repository Secrets가 상속되지 않음을 확인하고 직접 다시 등록했습니다.
- [ ] 포크에 `production` Environment가 상속되지 않음을 확인하고 직접 다시 만들었습니다.
- [ ] 본인이 소유하거나 사용 권한을 받은 Docker Hub, EC2, 도메인만 등록했습니다.
- [ ] 원본 저장소 소유자의 운영 인프라와 자격 증명을 사용하지 않습니다.

## 로컬 artifact

- [ ] `./gradlew clean test bootJar`가 통과합니다.
- [ ] executable JAR가 `build/libs/app.jar` 하나로 만들어집니다.
- [ ] plain JAR task가 비활성화되어 있습니다.
- [ ] `.dockerignore`가 `build/libs/app.jar`를 image build context에 포함합니다.
- [ ] Dockerfile이 정확히 `build/libs/app.jar`를 복사합니다.
- [ ] `APP_VERSION`과 `APP_RELEASE`에 같은 revision을 전달합니다.
- [ ] image의 OCI revision과 version label이 같은 revision입니다.
- [ ] `deploy/compose.prod.yaml`은 `APP_IMAGE`가 없으면 실패합니다.

## CI와 CD trigger

- [ ] CI는 `main`을 대상으로 한 PR에서 test와 `bootJar`를 실행합니다.
- [ ] CI는 Docker Hub push나 EC2 SSH를 수행하지 않습니다.
- [ ] CD는 `main` push에서 자동으로 시작됩니다.
- [ ] CD는 `workflow_dispatch`로 현재 `main`을 수동 실행할 수 있습니다.
- [ ] publish 전에 `GITHUB_SHA`가 소문자 16진수 exact 40자리인지 검사합니다.
- [ ] publish 전에 `GITHUB_SHA`가 fetch한 `origin/main`의 exact commit인지 검사합니다.
- [ ] source gate나 test가 실패하면 image 게시와 EC2 배포가 실행되지 않습니다.
- [ ] production deployment concurrency가 동시 운영 배포를 직렬화합니다.

## Docker image 게시

- [ ] Docker Hub 저장소 이름은 `aandi-cicd-deployment-lab`입니다.
- [ ] 운영 image는 `docker.io/${DOCKERHUB_USERNAME}/aandi-cicd-deployment-lab:<full-sha>` 하나입니다.
- [ ] full SHA는 Docker 이미지 태그이며 Git 태그가 아님을 설명할 수 있습니다.
- [ ] 사람이 읽기 위한 별칭이나 이동 가능한 기본 태그를 게시하지 않습니다.
- [ ] 새 image의 `APP_VERSION`과 `APP_RELEASE`는 모두 `GITHUB_SHA`입니다.
- [ ] 기존 SHA image는 OCI revision이 `GITHUB_SHA`와 같을 때만 재사용합니다.
- [ ] 기존 SHA image를 덮어쓰지 않습니다.
- [ ] EC2의 `APP_IMAGE`는 exact full SHA image 경로입니다.

## GitHub 설정

- [ ] Repository Secrets에 `DOCKERHUB_USERNAME`을 등록했습니다.
- [ ] Repository Secrets에 `DOCKERHUB_TOKEN`을 등록했습니다.
- [ ] Repository Secrets에 `EC2_HOST`를 등록했습니다.
- [ ] Repository Secrets에 `EC2_USERNAME`을 등록했습니다.
- [ ] Repository Secrets에 `EC2_SSH_KEY`를 등록했습니다.
- [ ] `production` Secrets에 `PROD_DB_PASSWORD`를 등록했습니다.
- [ ] `production` Secrets에 `PROD_MYSQL_ROOT_PASSWORD`를 등록했습니다.
- [ ] `production` Secrets에 `PROD_JWT_SECRET`을 등록했습니다.
- [ ] `production` Secrets에 `PROD_MAIL_USERNAME`을 등록했습니다.
- [ ] `production` Secrets에 `PROD_MAIL_PASSWORD`를 등록했습니다.
- [ ] `production` Secrets에 `PROD_GOOGLE_CLIENT_SECRET`을 등록했습니다.
- [ ] `production` Variables에 `PROD_DB_USERNAME`을 등록했습니다.
- [ ] `production` Variables에 `PROD_MYSQL_DATABASE`를 등록했습니다.
- [ ] `production` Variables에 `PROD_GOOGLE_CLIENT_ID`를 등록했습니다.
- [ ] `production` Variables에 `PROD_DOMAIN`을 등록했습니다.
- [ ] `production` Variables에 `PROD_CERTBOT_EMAIL`을 등록했습니다.
- [ ] 선택 URL·origin Variables는 비어 있거나 모두 `https://`를 사용합니다.
- [ ] 애플리케이션 DB 비밀번호와 MySQL root 비밀번호가 다릅니다.
- [ ] `PROD_JWT_SECRET`은 32바이트 이상입니다.
- [ ] 실제 secret이 문서, Git, image와 workflow 로그에 노출되지 않습니다.

## DNS와 EC2

- [ ] 운영 도메인의 모든 A 레코드는 `EC2_HOST`와 같은 EC2 public IPv4를 가리킵니다.
- [ ] 운영 도메인에 AAAA 레코드가 없습니다.
- [ ] Security Group에서 `80`, `443`을 허용했습니다.
- [ ] `22`는 필요한 출발지에만 허용했습니다.
- [ ] `8080`, `3306`, `6379`는 외부에 열지 않았습니다.
- [ ] EC2에 Docker, `curl`, `sha256sum`이 준비되어 있습니다.
- [ ] 배포 사용자가 Docker daemon을 사용할 수 있습니다.
- [ ] 배포 사용자의 home은 `/home/<EC2_USERNAME>`입니다.
- [ ] release directory는 `/home/<EC2_USERNAME>/aandi-cicd-deployment-lab`입니다.
- [ ] EC2에서 Docker Hub와 GitHub로 HTTPS 통신할 수 있습니다.
- [ ] image와 MySQL volume을 위한 디스크 여유 공간이 있습니다.

## runtime namespace와 config

- [ ] Compose project 이름은 `aandi-production`입니다.
- [ ] container 이름은 기존 HTTPS runtime의 `aandi-*` 이름을 승계합니다.
- [ ] named volume은 `aandi-mysql-data`, `aandi-certbot-www`, `aandi-letsencrypt`입니다.
- [ ] 09가 별도 `aandi-runtime-*` namespace를 사용해 같은 EC2에서도 충돌하지 않습니다.
- [ ] runtime `.env` 권한은 `600`입니다.
- [ ] `DB_USERNAME == MYSQL_USER`입니다.
- [ ] `DB_PASSWORD == MYSQL_PASSWORD`입니다.
- [ ] `DB_URL` database와 `MYSQL_DATABASE`가 같습니다.
- [ ] `DB_URL` host는 `mysql`입니다.
- [ ] `REDIS_HOST`는 `redis`이고 `REDIS_PORT`는 `6379`입니다.
- [ ] 기존 `aandi-mysql-data`를 유지할 때 MySQL 초기 값이 자동 변경되지 않음을 이해했습니다.

## EC2 배포

- [ ] 새 bundle은 `.deploy-next`에서 검증됩니다.
- [ ] 현재 bundle은 가능한 경우 `.deploy.previous`에 보존됩니다.
- [ ] 현재 `.env`와 image 정보는 가능한 경우 이전 snapshot으로 보존됩니다.
- [ ] MySQL과 Redis는 재배포 중 보존됩니다.
- [ ] `docker compose down -v`를 사용하지 않습니다.
- [ ] app은 host port 없이 Compose 내부 `8080`에서만 요청을 받습니다.
- [ ] Nginx만 host `80`, `443`을 사용합니다.
- [ ] 인증서가 없거나 사용할 수 없으면 HTTP challenge Nginx와 Certbot이 먼저 실행됩니다.
- [ ] 인증서 준비 뒤 Nginx가 HTTPS template로 전환됩니다.
- [ ] Nginx가 forwarded header와 WebSocket upgrade header를 전달합니다.

## 배포 검증과 복구

- [ ] MySQL, Redis와 Nginx가 healthy인지 확인합니다.
- [ ] app과 Certbot이 running인지 확인합니다.
- [ ] app container의 image reference와 image ID가 요청한 SHA image와 같습니다.
- [ ] OCI revision label이 `GITHUB_SHA`와 같습니다.
- [ ] EC2 내부 HTTPS readiness를 제한된 횟수로 재시도합니다.
- [ ] GitHub runner에서도 공개 HTTPS readiness를 확인합니다.
- [ ] HTTP 요청이 같은 도메인의 HTTPS URL로 이동합니다.
- [ ] 실패 시 Compose 상태와 최근 app log를 확인할 수 있습니다.
- [ ] 직전 snapshot이 있으면 bundle, `.env`, image와 readiness 자동 복구를 시도합니다.
- [ ] 자동 복구에 성공해도 실패한 workflow는 실패 상태로 남습니다.
- [ ] 최초 배포에는 이전 snapshot이 없어 자동 rollback이 불가능할 수 있음을 확인했습니다.

## 최초 배포와 이후 배포

- [ ] 최초 배포 전에 Actions 활성화와 GitHub 설정 재등록을 마쳤습니다.
- [ ] 다음 명령에서 `<fork-owner>`를 본인 계정으로 바꿔 최초 배포를 실행했습니다.

```bash
gh workflow run deploy.yml \
  --repo <fork-owner>/spring-boot-cicd-deployment-lab \
  --ref main
```

- [ ] 최초 성공 이후 PR을 `main`에 merge하면 자동 CD가 시작됨을 확인했습니다.
- [ ] 잘못 배포된 변경은 `git revert <bad-sha>` 후 `main` push로 되돌립니다.
- [ ] revert commit의 새 full SHA image가 정상 CD 흐름으로 배포됩니다.

## 로컬 마무리

- [ ] `bash -n scripts/ensure-compose.sh scripts/deploy.sh scripts/check-deploy.sh`가 통과합니다.
- [ ] `docker compose --env-file .env.example -f deploy/compose.prod.yaml config --quiet`가 통과합니다.
- [ ] `git diff --check`가 통과합니다.
- [ ] 예상하지 않은 변경 파일이 없는지 확인했습니다.
- [ ] 외부 Docker Hub, EC2, DNS와 HTTPS 검증 여부를 별도로 기록했습니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 학생이 `main -> exact SHA image -> runtime env -> HTTPS -> evidence -> recovery`를 설명합니다.
- 보완 기준: 포크 설정이 상속된다고 생각하거나 원본 저장소 소유자의 인프라를 사용합니다.
- 보완 기준: 이동 가능한 image 이름을 운영 입력으로 사용하거나 `origin/main` SHA gate를 설명하지 못합니다.
- 질문 예시: “콜론 뒤 full SHA가 Git 태그가 아닌데도 source revision을 추적할 수 있는 이유는 무엇인가요?”
- 질문 예시: “기존 SHA image를 발견했을 때 바로 사용하지 않고 OCI revision을 확인하는 이유는 무엇인가요?”
- 질문 예시: “왜 모든 A 레코드가 같은 EC2를 가리키고 AAAA 레코드는 없어야 하나요?”
- 질문 예시: “최초 배포 실패와 이후 배포 실패에서 자동 복구 가능성이 다른 이유는 무엇인가요?”
- 질문 예시: “왜 revert commit을 새로 배포하면 운영 이력을 더 명확히 추적할 수 있나요?”

</details>

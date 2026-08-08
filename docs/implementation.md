# CI/CD와 HTTPS 운영 배포 구현 안내

## 1. 구현 목표

이 저장소의 완료 기준은 `main`의 한 commit이 같은 full SHA로 build, publish, deploy, verify되는 것입니다.

| 경계 | 구현 목표 | 확인 방법 |
| --- | --- | --- |
| source | `main`만 운영 source로 허용 | `GITHUB_SHA == origin/main` |
| artifact | executable JAR 하나 생성 | `build/libs/app.jar` 존재 |
| image | full SHA image 하나 게시 | Docker Hub 경로와 OCI revision 확인 |
| config | secret과 runtime 값을 image 밖에서 주입 | GitHub 설정과 EC2 `.env` 권한 확인 |
| runtime | 기존 `aandi-*` HTTPS 자원을 승계해 stack 실행 | Compose 상태와 container 이름 확인 |
| network | 도메인이 EC2로만 연결 | 모든 A가 `EC2_HOST`, AAAA 없음 |
| verify | 실제 image와 HTTPS 응답 확인 | 내부·외부 readiness와 redirect 성공 |
| recovery | 가능한 경우 직전 snapshot 복구 | 실패 workflow와 복구 결과 확인 |

## 2. 로컬 artifact 계약 확인

### Step 1. executable JAR를 하나로 만듭니다

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

`build.gradle.kts`는 `bootJar` 출력 이름을 `app.jar`로 고정하고 plain `jar` task를 비활성화해야 합니다.
Dockerfile은 wildcard가 아니라 다음 exact 경로만 복사합니다.

```dockerfile
COPY build/libs/app.jar /app/app.jar
```

### Step 2. revision label이 있는 image를 만듭니다

로컬 검증에서도 두 build argument에 같은 revision을 전달합니다.

```bash
revision="$(git rev-parse HEAD)"

docker build \
  --build-arg APP_VERSION="$revision" \
  --build-arg APP_RELEASE="$revision" \
  --tag aandi-cicd-deployment-lab:local \
  .
```

label 확인:

```bash
docker image inspect \
  --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
  aandi-cicd-deployment-lab:local

docker image inspect \
  --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' \
  aandi-cicd-deployment-lab:local
```

두 결과는 `revision`과 같아야 합니다.
운영 workflow에서는 이 값이 exact 40자리 `GITHUB_SHA`입니다.

### Step 3. 운영 Compose 입력을 확인합니다

`deploy/compose.prod.yaml`의 app image는 `APP_IMAGE`가 없으면 실패해야 합니다.

```yaml
image: "${APP_IMAGE:?APP_IMAGE is required}"
```

예제 환경변수로 Compose 구성을 확인합니다.

```bash
docker compose \
  --env-file .env.example \
  -f deploy/compose.prod.yaml \
  config --quiet
```

예제 파일에는 실제 운영 secret을 넣지 않습니다.

## 3. 포크와 본인 인프라 준비

이 실습은 포크 소유자의 운영 인프라를 변경합니다.
원본 저장소 소유자나 다른 수강생의 Docker Hub, EC2, 도메인과 자격 증명을 사용하지 않습니다.

### Step 1. 본인 Docker Hub 저장소를 만듭니다

Docker Hub에 공개 저장소 `aandi-cicd-deployment-lab`을 만듭니다.
workflow가 사용하는 운영 경로는 다음과 같습니다.

```text
docker.io/${DOCKERHUB_USERNAME}/aandi-cicd-deployment-lab:<full-sha>
```

full SHA는 Docker 이미지 태그이며 Git 태그가 아닙니다.
운영 경로에는 별칭을 추가하지 않습니다.

### Step 2. EC2와 도메인을 준비합니다

EC2에는 다음 조건이 필요합니다.

- 배포 사용자의 home이 `/home/<EC2_USERNAME>`입니다.
- Docker Engine이 설치되고 실행 중입니다.
- 배포 사용자가 Docker를 실행하거나 passwordless `sudo docker`를 실행할 수 있습니다.
- `curl`, `sha256sum`을 사용할 수 있습니다.
- Docker Hub와 GitHub로 나가는 HTTPS 통신이 가능합니다.
- 이미지와 MySQL volume을 저장할 디스크 여유 공간이 있습니다.

Security Group은 다음처럼 설정합니다.

| port | 공개 여부 | 역할 |
| --- | --- | --- |
| `22` | 필요한 출발지에만 허용 | 배포 SSH |
| `80` | 허용 | ACME HTTP challenge와 HTTPS redirect |
| `443` | 허용 | 공개 HTTPS |
| `8080` | 차단 | app은 Compose 내부에서만 사용 |
| `3306` | 차단 | MySQL은 Compose 내부에서만 사용 |
| `6379` | 차단 | Redis는 Compose 내부에서만 사용 |

도메인 확인:

```bash
dig +short A <PROD_DOMAIN>
dig +short AAAA <PROD_DOMAIN>
```

모든 A 결과는 `EC2_HOST`와 같은 EC2 public IPv4여야 합니다.
AAAA 결과는 없어야 합니다.
workflow도 배포 전에 이 조건을 검사합니다.

### Step 3. 포크에서 Actions를 활성화합니다

포크한 저장소의 `Actions` 탭을 열고 workflow 실행을 허용합니다.
포크 직후에는 Actions가 비활성화되어 있을 수 있습니다.

Repository Secrets와 Environment 설정은 포크에 상속되지 않습니다.
아래 값을 모두 본인 값으로 다시 등록해야 합니다.

## 4. GitHub 필수 설정

### Repository Secrets

`Settings > Secrets and variables > Actions`에서 등록합니다.

| 이름 | 입력 |
| --- | --- |
| `DOCKERHUB_USERNAME` | 본인 Docker Hub 사용자명 |
| `DOCKERHUB_TOKEN` | 본인 Docker Hub access token |
| `EC2_HOST` | 본인 EC2 public IPv4 또는 host |
| `EC2_USERNAME` | EC2 SSH 사용자 |
| `EC2_SSH_KEY` | 해당 인스턴스의 SSH private key 전체 |

### `production` Environment Secrets

`Settings > Environments > production`을 만들고 다음 Secrets를 등록합니다.

| 이름 | 입력 |
| --- | --- |
| `PROD_DB_PASSWORD` | MySQL 애플리케이션 사용자 비밀번호 |
| `PROD_MYSQL_ROOT_PASSWORD` | 앱에 전달하지 않는 MySQL root 비밀번호 |
| `PROD_JWT_SECRET` | 32바이트 이상의 JWT 서명 key |
| `PROD_MAIL_USERNAME` | SMTP 인증 계정 |
| `PROD_MAIL_PASSWORD` | SMTP 비밀번호 |
| `PROD_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### `production` Environment Variables

같은 Environment에 다음 Variables를 등록합니다.

| 이름 | 입력 |
| --- | --- |
| `PROD_DB_USERNAME` | root가 아닌 애플리케이션 DB 사용자 |
| `PROD_MYSQL_DATABASE` | 애플리케이션 database 이름 |
| `PROD_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `PROD_DOMAIN` | 본인이 제어하고 EC2로 연결한 소문자 FQDN |
| `PROD_CERTBOT_EMAIL` | 인증서 운영 연락 이메일 |

선택 Variables:

| 이름 | 비워 둘 때 기본값 |
| --- | --- |
| `PROD_FRONTEND_URL` | `https://<PROD_DOMAIN>/realtime-demo.html` |
| `PROD_PASSWORD_RESET_URL` | `https://<PROD_DOMAIN>/auth-demo.html` |
| `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | `https://<PROD_DOMAIN>` |

workflow는 다음 runtime 관계를 강제합니다.

| runtime 값 | GitHub source 또는 고정값 |
| --- | --- |
| `APP_IMAGE` | `docker.io/${DOCKERHUB_USERNAME}/aandi-cicd-deployment-lab:${GITHUB_SHA}` |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `APP_DOMAIN` | `PROD_DOMAIN` |
| `CERTBOT_EMAIL` | `PROD_CERTBOT_EMAIL` |
| `DB_URL` | `jdbc:mysql://mysql:3306/${PROD_MYSQL_DATABASE}...` |
| `DB_USERNAME`, `MYSQL_USER` | `PROD_DB_USERNAME` |
| `DB_PASSWORD`, `MYSQL_PASSWORD` | `PROD_DB_PASSWORD` |
| `MYSQL_ROOT_PASSWORD` | `PROD_MYSQL_ROOT_PASSWORD` |
| `REDIS_HOST`, `REDIS_PORT` | `redis`, `6379` |
| `JWT_SECRET`, `JWT_EXPIRATION_MS` | `PROD_JWT_SECRET`, `3600000` |
| `MAIL_HOST`, `MAIL_PORT` | `smtp.gmail.com`, `587` |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | 대응하는 production Secret |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 대응하는 production 값 |
| 공개 URL과 WebSocket origin | 선택 Variable 또는 HTTPS 기본값 |
| `MYSQL_DATABASE` | `PROD_MYSQL_DATABASE` |

앱 DB 비밀번호와 MySQL root 비밀번호는 달라야 합니다.
필수값은 비어 있을 수 없고 dotenv 한 줄을 깨뜨리는 줄바꿈이나 작은따옴표(`'`)를 포함할 수 없습니다.

Environment에 승인 규칙을 추가했다면 배포 job은 승인 전까지 대기합니다.
이것은 실패가 아니라 설정된 보호 절차입니다.

## 5. CI workflow 확인

`.github/workflows/ci.yml`은 `main`을 대상으로 하는 PR에서 실행됩니다.

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

CI는 Docker Hub에 로그인하지 않고 EC2에 접속하지 않습니다.
PR 검증에서 production Secret을 사용하지 않는 것이 정상입니다.

## 6. deploy workflow 확인

`.github/workflows/deploy.yml`은 다음 event를 받습니다.

- `main` push
- `workflow_dispatch`

workflow는 운영 배포를 한 번에 하나만 실행합니다.
각 job은 `publish -> deploy -> verify` 순서로 연결되어 앞 단계가 실패하면 다음 단계가 실행되지 않습니다.

### publish job

publish job은 다음 순서로 실행됩니다.

1. source를 전체 이력으로 checkout합니다.
2. event ref가 `main`이고 `GITHUB_SHA`가 exact 소문자 16진수 40자리이며 checkout revision과 같은지 확인합니다.
3. shell 문법과 Nginx HTTP·HTTPS template을 검사합니다.
4. test와 `bootJar`를 실행하고 `build/libs/app.jar`를 확인합니다.
5. Docker Hub에 로그인합니다.
6. `origin/main`을 fetch하고 `GITHUB_SHA`가 그 exact commit인지 확인합니다.
7. `${IMAGE_REPOSITORY}:${GITHUB_SHA}`가 있으면 OCI revision을 확인합니다.
8. 이미지가 없을 때만 `APP_VERSION`과 `APP_RELEASE`를 모두 `GITHUB_SHA`로 build합니다.
9. full SHA image 하나만 push합니다.

핵심 artifact 계약은 다음과 같습니다.

```bash
sha_image="${IMAGE_REPOSITORY}:${GITHUB_SHA}"

if docker pull "$sha_image"; then
  existing_revision="$(
    docker image inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "$sha_image"
  )"
  test "$existing_revision" = "$GITHUB_SHA"
else
  docker build \
    --build-arg APP_VERSION="$GITHUB_SHA" \
    --build-arg APP_RELEASE="$GITHUB_SHA" \
    --tag "$sha_image" \
    .
  docker push "$sha_image"
fi
```

실제 workflow는 실패 메시지와 strict shell option을 포함합니다.
위 예시는 artifact 경계만 보여 줍니다.

### deploy job

deploy job은 `production` Environment를 사용합니다.

1. Repository Secrets와 Environment 값의 필수 조건을 확인합니다.
2. 값 자체를 출력하지 않고 권한 `600`의 임시 `runtime.env`를 만듭니다.
3. 도메인의 모든 A가 `EC2_HOST`와 같고 AAAA가 없는지 확인합니다.
4. exact SHA `APP_IMAGE`, `APP_DOMAIN`, `CERTBOT_EMAIL`로 Compose 설정을 검증합니다.
5. SSH host key를 준비하고 EC2의 release directory를 확인합니다.
6. bundle은 `.deploy-next`, runtime 값은 `.env.next`로 전송합니다.
7. EC2에서 파일, shell 문법, Compose 설정을 다시 검사합니다.
8. 현재 배포가 있으면 `.deploy.previous`, `.env.previous`, `.previous-image`에 직전 상태를 보존합니다.
9. MySQL과 Redis를 보존한 채 app·Nginx·Certbot을 새 계약으로 갱신합니다.
10. 인증서가 필요하면 HTTP challenge 뒤 HTTPS template로 전환합니다.

release directory:

```text
/home/<EC2_USERNAME>/aandi-cicd-deployment-lab
```

runtime namespace:

| 종류 | 이름 |
| --- | --- |
| Compose project | `aandi-production` |
| containers | `aandi-app`, `aandi-nginx`, `aandi-certbot`, `aandi-mysql`, `aandi-redis` |
| volumes | `aandi-mysql-data`, `aandi-certbot-www`, `aandi-letsencrypt` |

MySQL named volume을 유지해야 하므로 배포 script에서 `docker compose down -v`를 실행하지 않습니다.

### verify job

verify job은 다음 증거를 확인합니다.

1. MySQL, Redis와 Nginx가 healthy인지 확인합니다.
2. Certbot과 app이 running인지 확인합니다.
3. app container의 image reference와 image ID가 요청한 SHA image와 같은지 확인합니다.
4. OCI revision label이 `GITHUB_SHA`와 같은지 확인합니다.
5. EC2 내부에서 HTTPS readiness를 제한된 횟수로 재시도합니다.
6. HTTP 요청이 같은 도메인의 HTTPS URL로 이동하는지 확인합니다.
7. GitHub runner에서도 공개 HTTPS readiness를 확인합니다.

deploy 또는 verify가 실패하면 직전 snapshot이 있을 때 이전 bundle, `.env`와 image로 자동 복구를 시도합니다.
복구에 성공해도 시도한 workflow는 실패 상태로 남아 원인을 숨기지 않습니다.

최초 배포에는 `.deploy.previous`, `.env.previous`, `.previous-image`가 없습니다.
따라서 최초 실행 실패 시 자동 rollback을 할 수 없을 수 있습니다.
로그의 첫 실패 지점을 수정한 다음 현재 `main`을 다시 실행합니다.

## 7. 최초 배포와 이후 배포

### 최초 배포

Actions 활성화와 GitHub 설정 재등록을 마친 뒤 다음 명령을 실행합니다.

```bash
gh workflow run deploy.yml \
  --repo <fork-owner>/spring-boot-cicd-deployment-lab \
  --ref main
```

실행 확인:

```bash
gh run list \
  --repo <fork-owner>/spring-boot-cicd-deployment-lab \
  --workflow deploy.yml \
  --limit 5
```

### 이후 배포

일반 변경은 PR을 만들고 CI 성공을 확인한 뒤 `main`에 merge합니다.
merge가 만든 `main` push가 자동 CD를 시작합니다.
직접 `main`에 push하는 경우에도 같은 자동 CD가 시작됩니다.

현재 `main`을 다시 배포해야 할 때만 최초 배포와 같은 수동 실행 명령을 사용합니다.

## 8. 수동 rollback

운영에 반영된 잘못된 commit은 새 revert commit으로 되돌립니다.

```bash
git switch main
git pull --ff-only origin main
git revert <bad-sha>
git push origin main
```

push가 자동 CD를 시작하고 revert commit의 full SHA image를 새로 게시·배포합니다.
문제 commit을 이력에서 지우거나 원격 branch를 강제로 이동하지 않습니다.

## 9. EC2 script를 개별 확인하는 방법

실제 pull과 HTTPS stack 갱신에는 Docker가 설치된 EC2와 운영 `.env`가 필요합니다.
workflow가 파일을 설치한 뒤 release directory에서 다음 형태로 확인할 수 있습니다.

```bash
release_sha="<40-character-sha>"
release_dir="/home/<EC2_USERNAME>/aandi-cicd-deployment-lab"
app_image="docker.io/<DOCKERHUB_USERNAME>/aandi-cicd-deployment-lab:${release_sha}"

bash scripts/deploy.sh \
  "$release_dir" \
  "$app_image" \
  "<PROD_DOMAIN>" \
  "<PROD_CERTBOT_EMAIL>"

bash scripts/check-deploy.sh \
  "$release_dir" \
  "$app_image" \
  "$release_sha" \
  "<PROD_DOMAIN>"
```

실패하면 출력된 Compose 상태와 app log에서 첫 실패 경계를 확인합니다.

## 10. 완료 전 확인

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
bash -n scripts/ensure-compose.sh scripts/deploy.sh scripts/check-deploy.sh
docker compose \
  --env-file .env.example \
  -f deploy/compose.prod.yaml \
  config --quiet
git diff --check
git status --short
```

외부 검증은 별도로 기록합니다.

- 포크에서 Actions가 활성화되어 있는가
- 본인 GitHub 설정이 모두 등록되어 있는가
- Docker Hub에 full SHA image 하나가 있는가
- EC2가 10 소유의 `aandi-*` HTTPS runtime을 실행하는가
- DNS, HTTPS readiness와 HTTP redirect가 성공하는가
- 최초 배포라면 이전 snapshot이 없다는 제한을 이해했는가

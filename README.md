# Spring Boot CI/CD Deployment Lab

이 저장소는 A&I 백엔드 커리큘럼의 시퀀스 10을 독립적으로 실습하는 저장소입니다.
검증된 Spring Boot 애플리케이션을 하나의 Docker 이미지로 게시하고, Nginx와 Certbot을 포함한 HTTPS 운영 환경을 EC2에 배포합니다.

## 저장소와 브랜치 계약

| 항목 | 계약 |
| --- | --- |
| 기준 브랜치 | `main` 하나만 사용합니다. |
| PR 검증 | `main`을 대상으로 한 PR에서 CI가 test와 `bootJar`를 실행합니다. |
| 자동 운영 배포 | `main`에 새 commit이 push되면 CD가 시작됩니다. |
| 수동 운영 배포 | `workflow_dispatch`로 현재 `main`을 배포할 수 있습니다. |
| 운영 소유권 | 각 포크 소유자가 자신의 Docker Hub, EC2, 도메인과 GitHub 설정을 사용합니다. |

포크에는 원본 저장소의 Repository Secrets와 `production` Environment가 복사되지 않습니다.
원본 저장소 소유자의 인프라를 실습에 사용하지 말고, 반드시 본인이 소유하거나 사용 권한을 받은 Docker Hub 저장소, EC2 인스턴스와 도메인을 준비합니다.

## 운영 배포 흐름

```text
main 대상 PR
  -> CI: test + bootJar

main push 또는 workflow_dispatch
  -> main ref, exact 40자리 GITHUB_SHA와 checkout revision 확인
  -> script + Nginx template + test + bootJar 검증
  -> fetch한 origin/main과 GITHUB_SHA가 같은지 확인
  -> Docker Hub의 기존 SHA image가 있으면 OCI revision 확인
  -> 없으면 APP_VERSION과 APP_RELEASE를 같은 SHA로 build
  -> Docker Hub에 full SHA image 하나만 게시
  -> production 설정으로 runtime .env 생성
  -> DNS A/AAAA와 EC2 사전 조건 확인
  -> EC2에 staging bundle 전송
  -> exact SHA image로 HTTPS stack 갱신
  -> container, image, OCI revision, HTTPS readiness, redirect 검증
  -> 실패 시 직전 snapshot으로 자동 복구 시도
```

publish 전에 workflow는 다음 두 조건을 모두 확인합니다.

- `GITHUB_SHA`는 소문자 16진수 40자리입니다.
- `GITHUB_SHA`는 fetch한 `origin/main`의 exact commit과 같습니다.

따라서 오래된 commit이나 `main` 밖의 revision은 운영 이미지로 게시되지 않습니다.

운영 이미지 경로는 다음 하나뿐입니다.

```text
docker.io/${DOCKERHUB_USERNAME}/aandi-cicd-deployment-lab:<full-sha>
```

콜론 뒤의 40자리 SHA는 Docker 이미지 태그입니다.
Git 태그가 아니며, 배포를 위해 Git 태그를 만들 필요도 없습니다.
사람용 별칭이나 기본 태그를 추가하지 않고, EC2의 `APP_IMAGE`에도 같은 full SHA 경로만 기록합니다.

이미 같은 SHA 이미지가 Docker Hub에 있으면 workflow는 새로 push하지 않습니다.
대신 `org.opencontainers.image.revision` 값이 SHA와 같은지 검사한 뒤에만 재사용합니다.
새 이미지를 만들 때는 Docker build argument인 `APP_VERSION`과 `APP_RELEASE`를 모두 동일한 full SHA로 설정합니다.

## 포크 후 최초 배포

### 1. 본인 인프라를 준비합니다

- Docker Hub에 공개 저장소 `aandi-cicd-deployment-lab`을 만듭니다.
- EC2 인스턴스를 준비하고 배포 사용자가 Docker를 실행할 수 있게 합니다.
- 본인이 제어하는 운영 도메인을 EC2에 연결합니다.
- Security Group에서 `80`, `443`을 공개하고 `3306`, `6379`, 애플리케이션 `8080`은 공개하지 않습니다.
- SSH용 `22`는 필요한 출발지에만 허용합니다.

운영 도메인의 모든 A 레코드는 `EC2_HOST`와 같은 EC2 public IPv4를 가리켜야 합니다.
AAAA 레코드는 없어야 합니다.
여러 A 레코드 중 하나라도 다른 주소를 가리키면 인증서 발급이나 외부 검증이 실패할 수 있습니다.

### 2. 포크에서 Actions를 활성화합니다

GitHub 포크의 `Actions` 탭에서 workflow 실행을 허용합니다.
최초 포크는 Actions가 비활성화되어 있을 수 있으므로 이 단계를 건너뛰면 CI와 CD가 시작되지 않습니다.

### 3. GitHub 설정을 다시 등록합니다

포크 설정은 원본 저장소에서 상속되지 않습니다.
아래 Repository Secrets와 `production` Environment의 Secrets·Variables를 포크에 직접 등록합니다.

### 4. 현재 `main`을 최초로 수동 배포합니다

GitHub CLI로 다음 명령을 실행합니다.

```bash
gh workflow run deploy.yml \
  --repo <fork-owner>/spring-boot-cicd-deployment-lab \
  --ref main
```

GitHub 웹의 `Actions > Deploy to EC2 > Run workflow`에서 `main`을 선택해도 같습니다.
첫 배포가 성공한 뒤에는 PR을 `main`에 merge하거나 `main`에 직접 push할 때 자동 배포됩니다.
필요하면 같은 수동 실행 경로로 현재 `main`을 다시 배포할 수 있습니다.

## GitHub 필수 설정

### Repository Secrets

| 이름 | 역할 |
| --- | --- |
| `DOCKERHUB_USERNAME` | 본인 Docker Hub 로그인 계정과 이미지 경로 |
| `DOCKERHUB_TOKEN` | 본인 Docker Hub image push token |
| `EC2_HOST` | 본인 EC2 public IPv4 또는 해당 주소로 해석되는 host |
| `EC2_USERNAME` | EC2 SSH 사용자 |
| `EC2_SSH_KEY` | 해당 인스턴스의 SSH private key 전체 내용 |

### `production` Environment Secrets

| 이름 | runtime `.env`로 연결되는 값 |
| --- | --- |
| `PROD_DB_PASSWORD` | `DB_PASSWORD`, `MYSQL_PASSWORD` |
| `PROD_MYSQL_ROOT_PASSWORD` | `MYSQL_ROOT_PASSWORD` |
| `PROD_JWT_SECRET` | `JWT_SECRET` |
| `PROD_MAIL_USERNAME` | `MAIL_USERNAME` |
| `PROD_MAIL_PASSWORD` | `MAIL_PASSWORD` |
| `PROD_GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` |

### `production` Environment Variables

| 이름 | runtime `.env`로 연결되는 값 |
| --- | --- |
| `PROD_DB_USERNAME` | `DB_USERNAME`, `MYSQL_USER` |
| `PROD_MYSQL_DATABASE` | `DB_URL`의 database, `MYSQL_DATABASE` |
| `PROD_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| `PROD_DOMAIN` | `APP_DOMAIN`, 인증서와 공개 HTTPS origin |
| `PROD_CERTBOT_EMAIL` | `CERTBOT_EMAIL`, 인증서 운영 연락처 |

다음 Variables는 선택 사항입니다.
비워 두면 workflow가 `https://<PROD_DOMAIN>`을 기준으로 값을 만듭니다.

| 이름 | 기본값으로 생성되는 runtime 값 |
| --- | --- |
| `PROD_FRONTEND_URL` | `APP_FRONTEND_URL=https://<PROD_DOMAIN>/realtime-demo.html` |
| `PROD_PASSWORD_RESET_URL` | `APP_PASSWORD_RESET_URL=https://<PROD_DOMAIN>/auth-demo.html` |
| `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=https://<PROD_DOMAIN>` |

`PROD_DOMAIN`은 소문자 FQDN이어야 하고 `PROD_CERTBOT_EMAIL`은 유효한 이메일이어야 합니다.
필수 값은 빈 문자열일 수 없고 줄바꿈이나 작은따옴표(`'`)를 포함할 수 없습니다.
실제 비밀번호, token, private key는 `.env.example`이나 Git에 커밋하지 않습니다.

## runtime `.env` 환경변수 계약

[`.env.example`](./.env.example)은 로컬 검증과 운영 runtime 파일이 공유하는 변수 이름의 기준입니다.
운영 `.env`는 workflow가 권한 `600`으로 만들며 EC2에서 출력하거나 Git에 커밋하지 않습니다.

| runtime 변수 | 운영 배포에서 만드는 방법 | 필수 계약 |
| --- | --- | --- |
| `APP_IMAGE` | Docker Hub 경로 + `GITHUB_SHA` | `aandi-cicd-deployment-lab:<full-sha>` |
| `SPRING_PROFILES_ACTIVE` | workflow 고정값 `prod` | `prod` |
| `APP_DOMAIN` | `PROD_DOMAIN` | EC2를 가리키는 소문자 FQDN |
| `CERTBOT_EMAIL` | `PROD_CERTBOT_EMAIL` | 인증서 운영 연락처 |
| `DB_URL` | `PROD_MYSQL_DATABASE`로 JDBC URL 생성 | host는 `mysql` |
| `DB_USERNAME` | `PROD_DB_USERNAME` | `MYSQL_USER`와 같음 |
| `DB_PASSWORD` | `PROD_DB_PASSWORD` | `MYSQL_PASSWORD`와 같음 |
| `REDIS_HOST` | workflow 고정값 `redis` | Compose service name |
| `REDIS_PORT` | workflow 고정값 `6379` | Compose 내부 port |
| `JWT_SECRET` | `PROD_JWT_SECRET` | HS256용 32바이트 이상의 운영 secret |
| `JWT_EXPIRATION_MS` | workflow 고정값 `3600000` | millisecond 단위 |
| `MAIL_HOST` | workflow 고정값 `smtp.gmail.com` | SMTP host |
| `MAIL_PORT` | workflow 고정값 `587` | SMTP port |
| `MAIL_USERNAME` | `PROD_MAIL_USERNAME` | 운영 계정 |
| `MAIL_PASSWORD` | `PROD_MAIL_PASSWORD` | 운영 secret |
| `GOOGLE_CLIENT_ID` | `PROD_GOOGLE_CLIENT_ID` | 운영 OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `PROD_GOOGLE_CLIENT_SECRET` | 운영 OAuth secret |
| `APP_FRONTEND_URL` | Variable 또는 도메인 기본 URL | `https://` URL |
| `APP_PASSWORD_RESET_URL` | Variable 또는 도메인 기본 URL | `https://` URL |
| `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | Variable 또는 도메인 origin | `https://` origin |
| `MYSQL_DATABASE` | `PROD_MYSQL_DATABASE` | `DB_URL`의 database와 같음 |
| `MYSQL_USER` | `PROD_DB_USERNAME` | `DB_USERNAME`과 같음 |
| `MYSQL_PASSWORD` | `PROD_DB_PASSWORD` | `DB_PASSWORD`와 같음 |
| `MYSQL_ROOT_PASSWORD` | `PROD_MYSQL_ROOT_PASSWORD` | 앱 DB 비밀번호와 별도로 관리 |

핵심 일치 조건은 다음과 같습니다.

```text
DB_USERNAME == MYSQL_USER
DB_PASSWORD == MYSQL_PASSWORD
DB_URL database == MYSQL_DATABASE
DB_URL host == mysql
REDIS_HOST == redis
MYSQL_ROOT_PASSWORD는 앱 DB 비밀번호와 별도
```

기존 `aandi-mysql-data` volume이 있다면 `MYSQL_*` 값을 바꿔도 초기 사용자와 비밀번호가 자동으로 다시 만들어지지 않습니다.
데이터를 유지할 때는 MySQL 내부 계정과 권한을 별도로 변경한 뒤 배포합니다.

## EC2 Docker Compose 계약

배포 경로는 다음과 같습니다.

```text
/home/<EC2_USERNAME>/aandi-cicd-deployment-lab/
├── .env
├── .env.previous
├── .previous-image
├── .deploy-next/
├── .deploy.previous/
├── deploy/
│   ├── compose.prod.yaml
│   └── nginx/
│       ├── http.conf.template
│       └── https.conf.template
└── scripts/
    ├── ensure-compose.sh
    ├── deploy.sh
    └── check-deploy.sh
```

10의 production runtime은 기존 HTTPS 배포의 DB와 인증서를 보존하기 위해 현재 `aandi-*` 자원 이름을 승계합니다.
09는 별도 `aandi-runtime-*` namespace와 host `8080`을 사용하므로 같은 EC2에서 함께 실행할 수 있습니다.
다른 10 fork와는 이 고정 자원을 공유하지 않습니다.

| 종류 | 이름 |
| --- | --- |
| Compose project | `aandi-production` |
| container | `aandi-app`, `aandi-nginx`, `aandi-certbot`, `aandi-mysql`, `aandi-redis` |
| named volume | `aandi-mysql-data`, `aandi-certbot-www`, `aandi-letsencrypt` |

| 서비스 | 역할 | 외부 포트 | 데이터 |
| --- | --- | --- | --- |
| `app` | exact SHA Spring Boot image | 없음, Compose 내부 `8080` | 없음 |
| `nginx` | TLS 종료와 reverse proxy | `80`, `443` | 인증서 volume 읽기 |
| `certbot` | 인증서 발급과 갱신 | 없음 | challenge·인증서 volume |
| `mysql` | 애플리케이션 DB | 없음 | `aandi-mysql-data` |
| `redis` | cache | 없음 | 별도 volume 없음 |

MySQL과 Redis는 재배포 때 유지하고, app·Nginx·Certbot을 새 배포 계약에 맞게 갱신합니다.
인증서가 없거나 사용할 수 없으면 HTTP challenge용 Nginx를 먼저 실행한 뒤 HTTPS 설정으로 전환합니다.

배포 전에 EC2에서 다음 조건을 확인합니다.

- home 경로가 `/home/<EC2_USERNAME>`입니다.
- Docker Engine이 실행 중입니다.
- 배포 사용자가 Docker daemon을 사용하거나 passwordless `sudo docker`를 실행할 수 있습니다.
- `curl`과 `sha256sum`을 사용할 수 있습니다.
- Docker Hub와 GitHub로 나가는 HTTPS 통신이 가능합니다.
- 이미지와 MySQL volume을 저장할 디스크 여유 공간이 있습니다.
- 도메인의 모든 A 레코드가 `EC2_HOST`와 같고 AAAA 레코드는 없습니다.
- `80`, `443`은 열려 있고 `3306`, `6379`, `8080`은 외부에 열려 있지 않습니다.

## 배포 전 로컬 검증

```bash
git switch main
git pull --ff-only origin main

./gradlew clean test bootJar
test -f build/libs/app.jar

revision="$(git rev-parse HEAD)"
docker build \
  --build-arg APP_VERSION="$revision" \
  --build-arg APP_RELEASE="$revision" \
  --tag aandi-cicd-deployment-lab:local \
  .

docker compose \
  --env-file .env.example \
  -f deploy/compose.prod.yaml \
  config --quiet

bash -n scripts/ensure-compose.sh scripts/deploy.sh scripts/check-deploy.sh
git diff --check
git status --short
```

운영 배포 여부와 무관하게 PR에서는 CI 결과를 먼저 확인합니다.
로컬 이미지의 이름은 로컬 검증용일 뿐 운영 image contract가 아닙니다.

## 배포 성공 확인

```bash
gh run list \
  --repo <fork-owner>/spring-boot-cicd-deployment-lab \
  --workflow deploy.yml \
  --limit 5

curl --fail --show-error \
  "https://<PROD_DOMAIN>/actuator/health/readiness"

curl --head "http://<PROD_DOMAIN>/"
```

성공한 workflow는 app container가 요청한 full SHA image reference와 image ID를 사용하는지, OCI revision이 같은 SHA인지, HTTPS readiness가 성공하는지, HTTP가 같은 도메인의 HTTPS URL로 이동하는지 확인합니다.

## 실패와 rollback

새 배포 전에 현재 bundle, `.env`와 image 정보가 있으면 직전 snapshot으로 보존합니다.
배포 또는 검증에 실패하면 workflow는 그 snapshot으로 자동 복구를 시도하고 실패한 실행은 실패 상태로 남깁니다.

최초 배포에는 이전 snapshot이 없습니다.
따라서 최초 배포가 중간에 실패하면 자동 rollback이 불가능할 수 있으며, workflow 로그에서 첫 실패 지점을 고친 뒤 현재 `main`을 다시 수동 실행해야 합니다.

이미 배포된 잘못된 변경을 되돌릴 때는 이력을 이동하지 않고 새 revert commit을 만듭니다.

```bash
git switch main
git pull --ff-only origin main
git revert <bad-sha>
git push origin main
```

마지막 push가 새 CD를 시작하고, revert commit의 full SHA로 새 이미지를 게시·배포합니다.

## 문서와 Visual Lab

- [이론 정리](./docs/theory.md)
- [구현 안내](./docs/implementation.md)
- [체크리스트](./docs/checklist.md)
- [Visual Lab](./docs/visual-lab/index.html)

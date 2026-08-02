# Spring Boot Deployment Runtime Lab

이 레포는 A&I 백엔드 커리큘럼의 `09 Docker Runtime`과 `10 CI/CD`를 단계별 정답 브랜치로 다룹니다.
`09-answer`는 `deploy-v1.0.3`으로 검증한 HTTP 배포 기준이고, `10-answer`는 그 위에 Nginx와 HTTPS 운영 계약을 추가합니다.

## 범위와 브랜치

| 용도 | 브랜치 |
| --- | --- |
| 공통 계약과 가이드 | `main` |
| 09 HTTP 배포 기준 | `09-answer` |
| 10 Nginx·HTTPS 운영 배포 | `10-answer` |

`09-answer`는 `deploy-v1.0.3` commit에 고정된 불변 기준으로 유지합니다.
`10-answer`에서만 Nginx, Certbot, 도메인과 HTTPS 변경을 이어갑니다.
별도의 implementation 브랜치는 사용하지 않습니다.

| 시퀀스 | 정답 브랜치에서 확인할 계약 |
| --- | --- |
| 09 Docker Runtime | `app.jar`, Dockerfile, 운영 profile, MySQL·Redis·app Compose와 `8080` HTTP |
| 10 CI/CD | 태그 gate, SHA 이미지 게시, Nginx·Certbot HTTPS 배포, 검증과 rollback |

## 운영 배포 계약

HTTPS 운영 배포는 `10-answer`에 포함된 커밋에 `deploy-https-vX.Y.Z` 형식의 새 annotated tag를 push할 때만 시작합니다.
09의 `deploy-vX.Y.Z` HTTP workflow와 tag 형식을 분리해 과거 HTTP commit에서 HTTPS 배포가 잘못 시작되지 않게 합니다.

```text
10-answer commit
  -> deploy-https-vX.Y.Z tag push
  -> test + bootJar
  -> commit-SHA image가 없으면 build, 있으면 revision 확인 후 재사용
  -> Docker Hub commit-SHA image + release tag alias 게시
  -> production 도메인의 EC2 DNS 연결 검증
  -> GitHub production 설정으로 HTTPS runtime .env 생성
  -> EC2에 Compose, Nginx template과 배포 스크립트 전송
  -> MySQL + Redis 유지, 인증서 bootstrap 뒤 app + Nginx 갱신
  -> health + image + revision + HTTPS readiness + HTTP redirect 검증
```

태그는 배포 시작점이지만 EC2가 실제로 실행하는 이미지는 다음과 같은 40자리 commit SHA tag입니다.

```text
docker.io/<DOCKERHUB_USERNAME>/aandi-deployment-runtime-lab:<40-character-commit-sha>
```

`deploy-https-v1.0.0` 같은 release tag는 사람이 HTTPS 배포본을 찾기 위한 별칭입니다.
운영 Compose의 `APP_IMAGE`에는 commit SHA 이미지만 기록합니다.
workflow는 같은 SHA image가 Docker Hub에 이미 있으면 revision label을 확인한 뒤 재사용하며, SHA tag를 다시 push하지 않습니다.
태그 대상이 `origin/10-answer`에 포함되지 않거나 태그 이름이 계약과 다르면 workflow가 배포를 거부합니다.

## EC2 Docker Compose 계약

EC2에는 소스나 JAR를 복사하지 않고 공개 Docker Hub repository에서 이미지를 받습니다.
배포 파일은 다음 위치에 설치됩니다.

```text
/home/<EC2_USERNAME>/aandi-deployment-runtime-lab/
├── .env
├── .env.previous
├── .previous-image
├── .deploy-next/       # 검증 전 staging bundle
├── .deploy.previous/   # 직전 rollback bundle
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

| 서비스 | 이미지와 역할 | 외부 포트 | 데이터 |
| --- | --- | --- | --- |
| `app` | exact SHA Spring Boot image | 노출하지 않음, Compose 내부 `8080` | 없음 |
| `nginx` | `nginx:1.28.3-alpine`, TLS 종료와 reverse proxy | `80`, `443` | 인증서 volume 읽기 |
| `certbot` | `certbot/certbot:v5.7.0`, 발급과 갱신 | 노출하지 않음 | `aandi-certbot-www`, `aandi-letsencrypt` |
| `mysql` | `mysql:8.4` | 노출하지 않음 | `aandi-mysql-data` named volume |
| `redis` | `redis:7.4` | 노출하지 않음 | 캐시이므로 별도 volume 없음 |

`app`은 MySQL과 Redis가 healthy가 된 뒤 시작합니다.
인증서가 없거나 손상·만료·만료 임박 상태이면 HTTP challenge 전용 Nginx로 발급 또는 갱신한 뒤 HTTPS template로 전환합니다.
Certbot은 12시간마다 갱신을 시도하고 Nginx는 6시간마다 설정과 갱신된 인증서를 reload합니다.
Nginx는 forwarded header와 WebSocket upgrade header를 전달하고 Spring Boot는 forwarded header를 해석합니다.
재배포할 때 MySQL·Redis와 named volume은 유지하고 `app`, Nginx와 Certbot만 배포 계약에 맞게 갱신합니다.
publish job은 Nginx HTTP·HTTPS template을 실제 `nginx -t`로 검사하고, EC2에서는 staging bundle의 파일·shell 문법·Compose 설정을 다시 확인합니다.
현재 Compose·Nginx template·script는 완성된 snapshot으로 `.deploy.previous`에 전환한 뒤 새 bundle을 설치하며, 설치가 중단돼도 wrapper trap이 이전 bundle과 `.env`를 복원합니다.
배포 명령, 내부 검증 또는 GitHub runner의 외부 HTTPS 검증이 실패하면 이전 bundle, `.env`와 이미지로 자동 복구하고 이전 HTTP 또는 HTTPS readiness까지 다시 확인합니다.
자동 복구 뒤 이력상 rollback 배포가 필요하면 정상 HTTPS commit에 더 높은 새 `deploy-https-vX.Y.Z` tag를 만듭니다.

## EC2 사전 준비

배포 전에 다음 조건을 만족해야 합니다.

- EC2 인스턴스가 실행 중이고 `EC2_HOST`가 현재 public IP 또는 DNS를 가리켜야 합니다.
- 배포 사용자의 home이 `/home/<EC2_USERNAME>`이어야 합니다.
- Docker Engine이 설치되어 실행 중이어야 합니다.
- 배포 사용자가 Docker daemon을 사용할 수 있거나 passwordless `sudo docker`를 실행할 수 있어야 합니다.
- `curl`과 `sha256sum`을 사용할 수 있어야 합니다. Compose plugin은 workflow가 checksum을 확인해 준비합니다.
- EC2에서 Docker Hub와 GitHub로 나가는 HTTPS 통신이 가능해야 합니다.
- 운영 도메인의 모든 A 레코드가 `EC2_HOST`와 같은 EC2 public IPv4만 가리켜야 하며 AAAA 레코드는 없어야 합니다.
- Security Group은 인증서 challenge와 redirect용 `80`, HTTPS용 `443`을 공개해야 합니다.
- 첫 09→10 전환에서는 실패 시 09 HTTP 서비스가 외부에서도 복구되도록 기존 `8080` 규칙을 HTTPS verify 성공 때까지 유지하고, 성공 직후 제거합니다.
- 이미 HTTPS 전환을 마친 환경이나 신규 10 배포에서는 애플리케이션 `8080`을 외부에 열지 않습니다.
- SSH용 `22`는 필요한 범위에만 엽니다.
- MySQL `3306`과 Redis `6379`는 외부에 열지 않습니다.
- 이미지와 MySQL volume을 저장할 디스크 여유 공간이 있어야 합니다.

## GitHub 필수 설정

GitHub Repository Secrets에 다음 값을 등록합니다.

| 이름 | 역할 |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub 로그인 계정과 이미지 경로 |
| `DOCKERHUB_TOKEN` | Docker Hub image push token |
| `EC2_HOST` | EC2 public IP 또는 DNS |
| `EC2_USERNAME` | EC2 SSH 사용자 |
| `EC2_SSH_KEY` | 해당 인스턴스의 SSH private key 전체 내용 |

GitHub에 `production` Environment를 만들고 다음 Secrets를 등록합니다.

| 이름 | runtime `.env`로 연결되는 값 |
| --- | --- |
| `PROD_DB_PASSWORD` | `DB_PASSWORD`, `MYSQL_PASSWORD` |
| `PROD_MYSQL_ROOT_PASSWORD` | `MYSQL_ROOT_PASSWORD` |
| `PROD_JWT_SECRET` | `JWT_SECRET` |
| `PROD_MAIL_USERNAME` | `MAIL_USERNAME` |
| `PROD_MAIL_PASSWORD` | `MAIL_PASSWORD` |
| `PROD_GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` |

같은 `production` Environment의 Variables에는 다음 값을 등록합니다.

| 이름 | runtime `.env`로 연결되는 값 |
| --- | --- |
| `PROD_DB_USERNAME` | `DB_USERNAME`, `MYSQL_USER` |
| `PROD_MYSQL_DATABASE` | `DB_URL`의 database, `MYSQL_DATABASE` |
| `PROD_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| `PROD_DOMAIN` | `APP_DOMAIN`, 인증서와 공개 HTTPS origin |
| `PROD_CERTBOT_EMAIL` | `CERTBOT_EMAIL`, 인증서 운영 연락처 |

`PROD_DOMAIN`은 사용자가 DNS를 제어하며 EC2로 연결한 소문자 FQDN이어야 하고 `PROD_CERTBOT_EMAIL`은 유효한 이메일이어야 합니다.
최초 HTTPS 전환 뒤 `PROD_DOMAIN`과 `PROD_CERTBOT_EMAIL`은 같은 EC2에서 변경하지 않습니다. 도메인이나 ACME 계정 연락처 교체는 인증서와 rollback 기준을 새로 준비하는 별도 작업으로 다룹니다.
다음 URL Variables는 선택 사항입니다. 비워 두면 workflow가 `https://<PROD_DOMAIN>`을 기준으로 만듭니다.

| 이름 | 기본값으로 생성되는 runtime 값 |
| --- | --- |
| `PROD_FRONTEND_URL` | `APP_FRONTEND_URL=https://<PROD_DOMAIN>/realtime-demo.html` |
| `PROD_PASSWORD_RESET_URL` | `APP_PASSWORD_RESET_URL=https://<PROD_DOMAIN>/auth-demo.html` |
| `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=https://<PROD_DOMAIN>` |

GitHub `Settings > Rules > Rulesets`에는 활성 상태의 tag ruleset을 추가합니다.

| 설정 | 값 |
| --- | --- |
| Target tags | `deploy-https-v*` |
| Restrict updates | 활성화 |
| Restrict deletions | 활성화 |
| Bypass | 실제 운영 관리자만 최소 범위로 지정 |

workflow도 새 tag 생성 event만 허용하고 force update를 거부하지만, 삭제 후 같은 이름으로 다시 만드는 경우까지 막으려면 이 ruleset이 필요합니다.

실제 비밀번호, token, private key는 `.env.example`이나 Git에 커밋하지 않습니다.
필수 production 값은 빈 문자열일 수 없고 줄바꿈이나 작은따옴표(`'`)를 포함할 수 없습니다.

## runtime `.env` 환경변수 계약

[`.env.example`](./.env.example)은 로컬 검증과 운영 runtime 파일이 공유하는 변수 이름의 기준입니다.
운영 `.env`는 workflow가 권한 `600`으로 만들며 EC2에서 출력하거나 커밋하지 않습니다.

| runtime 변수 | 운영 배포에서 만드는 방법 | 필수 계약 |
| --- | --- | --- |
| `APP_IMAGE` | Docker Hub 경로 + tag 대상 commit SHA | 40자리 SHA tag 또는 digest |
| `SPRING_PROFILES_ACTIVE` | workflow 고정값 `prod` | `prod` |
| `APP_DOMAIN` | `PROD_DOMAIN` | EC2를 가리키는 소문자 FQDN |
| `CERTBOT_EMAIL` | `PROD_CERTBOT_EMAIL` | 인증서 운영 연락처 |
| `DB_URL` | `PROD_MYSQL_DATABASE`로 JDBC URL 생성 | host는 `mysql` |
| `DB_USERNAME` | `PROD_DB_USERNAME` | `MYSQL_USER`와 같음 |
| `DB_PASSWORD` | `PROD_DB_PASSWORD` | `MYSQL_PASSWORD`와 같음 |
| `REDIS_HOST` | workflow 고정값 `redis` | Compose service name |
| `REDIS_PORT` | workflow 고정값 `6379` | Compose 내부 port |
| `JWT_SECRET` | `PROD_JWT_SECRET` | HS256용 32바이트 이상의 실제 운영 secret |
| `JWT_EXPIRATION_MS` | workflow 고정값 `3600000` | millisecond 단위 |
| `MAIL_HOST` | workflow 고정값 `smtp.gmail.com` | SMTP host |
| `MAIL_PORT` | workflow 고정값 `587` | SMTP port |
| `MAIL_USERNAME` | `PROD_MAIL_USERNAME` | 실제 운영 계정 |
| `MAIL_PASSWORD` | `PROD_MAIL_PASSWORD` | 실제 운영 secret |
| `GOOGLE_CLIENT_ID` | `PROD_GOOGLE_CLIENT_ID` | 실제 OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `PROD_GOOGLE_CLIENT_SECRET` | 실제 OAuth secret |
| `APP_FRONTEND_URL` | `PROD_FRONTEND_URL` 또는 도메인 기본 URL | `https://` URL |
| `APP_PASSWORD_RESET_URL` | `PROD_PASSWORD_RESET_URL` 또는 도메인 기본 URL | `https://` URL |
| `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` 또는 도메인 origin | `https://` origin |
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
기존 데이터를 유지할 때는 MySQL 내부 계정과 권한을 별도로 변경한 뒤 배포해야 합니다.

## 배포 전 로컬 검증

`10-answer`에서 다음 검증을 먼저 통과시킵니다.

```bash
git switch 10-answer
git pull --ff-only origin 10-answer

./gradlew clean test bootJar
test -f build/libs/app.jar

docker build \
  --build-arg APP_VERSION="$(git rev-parse HEAD)" \
  --tag aandi-deployment-runtime-lab:local \
  .

docker compose \
  --env-file .env.example \
  -f deploy/compose.prod.yaml \
  config --quiet

bash -n scripts/ensure-compose.sh scripts/deploy.sh scripts/check-deploy.sh
git diff --check
git status --short
```

마지막 `git status --short`에 예상하지 않은 파일이 나오면 태그를 만들기 전에 정리합니다.

## 10 HTTPS 태그 배포

`09-answer`의 HTTP 기준 배포는 `deploy-v1.0.3`으로 고정되어 있습니다.
아래 예시는 `10-answer`의 첫 HTTPS 운영 버전을 `deploy-https-v1.0.0`으로 배포합니다.

```bash
git switch 10-answer
git fetch --prune --tags origin
git pull --ff-only origin 10-answer

./gradlew clean test bootJar
test -f build/libs/app.jar
git status --short

git push origin 10-answer
git tag -a deploy-https-v1.0.0 -m "Deploy HTTPS v1.0.0"
git show --stat deploy-https-v1.0.0
git push origin deploy-https-v1.0.0
```

마지막 push가 `Deploy to EC2` workflow를 시작합니다.
태그를 만들기 전에 변경 사항을 커밋하고 `git status --short`가 비어 있는지 확인합니다.

## 다음 버전 태그 배포

이미 사용한 태그 이름은 이동하거나 재사용하지 않고 버전을 올립니다.

```bash
git switch 10-answer
git fetch --prune --tags origin
git pull --ff-only origin 10-answer

./gradlew clean test bootJar
test -f build/libs/app.jar
git status --short

git push origin 10-answer
git tag -a deploy-https-v1.0.1 -m "Deploy HTTPS v1.0.1"
git show --stat deploy-https-v1.0.1
git push origin deploy-https-v1.0.1
```

원격에 push하기 전 로컬 태그를 잘못 만들었다면 다음처럼 지운 뒤 새로 만들 수 있습니다.

```bash
git tag -d deploy-https-v1.0.1
```

원격에 push한 배포 태그는 삭제하거나 같은 이름으로 다시 만들지 않습니다.

## 이전 버전으로 rollback 배포

이전 태그를 옮기지 않고 정상 동작했던 커밋에 더 높은 새 배포 태그를 붙입니다.
다음 예시는 정상 동작했던 `deploy-https-v1.0.0` commit을 아직 사용하지 않은 `deploy-https-v1.0.2`로 다시 배포합니다.
수동 tag rollback 대상은 HTTPS workflow가 들어 있는 `10-answer` commit으로 제한합니다. 첫 09→10 전환 실패는 workflow가 보존한 09 bundle로 자동 복구합니다.

```bash
git fetch --prune --tags origin
git switch 10-answer
git pull --ff-only origin 10-answer

ROLLBACK_SHA="$(git rev-list -n 1 deploy-https-v1.0.0)"
git merge-base --is-ancestor "$ROLLBACK_SHA" origin/10-answer

git tag -a deploy-https-v1.0.2 "$ROLLBACK_SHA" \
  -m "Deploy HTTPS v1.0.2: rollback to v1.0.0"
git show --stat deploy-https-v1.0.2
git push origin deploy-https-v1.0.2
```

예시의 두 태그는 실제 배포 이력에 맞는 정상 태그와 아직 사용하지 않은 새 버전으로 바꿉니다.

## 배포 성공 확인

GitHub Actions의 publish, deploy, verify job이 모두 성공한 뒤 EC2에서도 확인합니다.

```bash
ssh -i <EC2_PRIVATE_KEY_PATH> <EC2_USERNAME>@<EC2_HOST>
cd /home/<EC2_USERNAME>/aandi-deployment-runtime-lab

stat -c '%a' .env
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker inspect --format '{{.Config.Image}}' aandi-app
docker inspect \
  --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
  aandi-app
curl --fail --silent --show-error \
  "https://<PROD_DOMAIN>/actuator/health/readiness"
curl --silent --show-error --output /dev/null \
  --write-out '%{http_code} %{redirect_url}\n' \
  "http://<PROD_DOMAIN>/"
```

성공 기준은 다음과 같습니다.

- `.env` 권한이 `600`입니다.
- `aandi-mysql`, `aandi-redis`, `aandi-nginx`가 healthy이고 `aandi-certbot`이 running입니다.
- `aandi-app`이 running이고 host의 `8080` 포트로 공개되지 않습니다.
- 앱 컨테이너의 image와 revision이 태그 대상 commit SHA와 같습니다.
- `https://<PROD_DOMAIN>/actuator/health/readiness` 요청이 성공합니다.
- `http://<PROD_DOMAIN>/` 요청이 같은 도메인의 HTTPS URL로 이동합니다.

검증 중에도 `.env`, private key, token이나 비밀번호 내용을 출력하거나 공유하지 않습니다.

## Visual Lab과 문서

Visual Lab은 가이드 브랜치인 `main`에서 관리합니다. `09-answer`와 `10-answer`에는 실행 계약과 정답 문서만 둡니다.

- [main Visual Lab](https://github.com/stdiodh/spring-boot-deployment-runtime-lab/tree/main/docs/visual-lab)
- [이론 정리](./docs/theory.md)
- [구현 안내](./docs/implementation.md)
- [체크리스트](./docs/checklist.md)

`09-answer`와 `deploy-v1.0.3`은 HTTP 기준을 보존하고, HTTPS 운영 변경은 `10-answer`와 `deploy-https-v1.x` 이력에서만 관리합니다.

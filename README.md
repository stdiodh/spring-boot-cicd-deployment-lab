# Spring Boot Deployment Runtime Lab

이 레포는 A&I 백엔드 커리큘럼의 `09 Docker Runtime`과 `10 CI/CD`를 하나의 실행 가능한 정답 브랜치에서 다룹니다.
`main`은 공통 계약과 가이드를 제공하고, `10-answer`는 Docker Compose 실행부터 운영 배포까지 포함하는 유일한 실행 브랜치입니다.

## 범위와 브랜치

| 용도 | 브랜치 |
| --- | --- |
| 공통 계약과 가이드 | `main` |
| 09·10 통합 정답과 운영 배포 | `10-answer` |

별도의 `09-implementation`, `09-answer`, `10-implementation` 브랜치는 사용하지 않습니다.
코드를 직접 작성하는 실습은 별도 폴더에서 진행하고, 이 레포에서는 `10-answer`를 실행·분석합니다.

| 시퀀스 | `10-answer`에서 확인할 계약 |
| --- | --- |
| 09 Docker Runtime | `app.jar`, Dockerfile, 운영 profile, MySQL·Redis·app Compose |
| 10 CI/CD | 태그 gate, SHA 이미지 게시, EC2 배포, readiness 검증과 rollback |

이번 단계는 EC2의 `8080` 포트로 Spring Boot를 직접 확인하는 데까지 다룹니다.
Nginx, 도메인, HTTPS와 인증서 자동 갱신은 후속 단계로 미룹니다.

## 운영 배포 계약

운영 배포는 `10-answer`에 포함된 커밋에 `deploy-vX.Y.Z` 형식의 annotated tag를 push할 때만 시작합니다.

```text
10-answer commit
  -> deploy-vX.Y.Z tag push
  -> test + bootJar
  -> commit-SHA image가 없으면 build, 있으면 revision 확인 후 재사용
  -> Docker Hub commit-SHA image + release tag alias 게시
  -> GitHub production 설정으로 runtime .env 생성
  -> EC2에 Compose와 배포 스크립트 전송
  -> MySQL + Redis 유지, app만 exact SHA image로 교체
  -> health + image + revision + readiness 검증
```

태그는 배포 시작점이지만 EC2가 실제로 실행하는 이미지는 다음과 같은 40자리 commit SHA tag입니다.

```text
docker.io/<DOCKERHUB_USERNAME>/aandi-deployment-runtime-lab:<40-character-commit-sha>
```

`deploy-v1.0.0` 같은 release tag는 사람이 배포본을 찾기 위한 별칭입니다.
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
├── deploy/compose.prod.yaml
└── scripts/
    ├── ensure-compose.sh
    ├── deploy.sh
    └── check-deploy.sh
```

| 서비스 | 이미지와 역할 | 외부 포트 | 데이터 |
| --- | --- | --- | --- |
| `app` | exact SHA Spring Boot image | `8080` | 없음 |
| `mysql` | `mysql:8.4` | 노출하지 않음 | `aandi-mysql-data` named volume |
| `redis` | `redis:7.4` | 노출하지 않음 | 캐시이므로 별도 volume 없음 |

`app`은 MySQL과 Redis가 healthy가 된 뒤 시작합니다.
재배포할 때 MySQL·Redis와 MySQL volume은 유지하고 `app`만 새 SHA 이미지로 교체합니다.
배포 명령 자체가 실패하면 이전 `.env`와 이미지 정보로 복구를 시도합니다.
verify 실패 후 되돌릴 때는 정상 commit에 새로운 배포 tag를 만듭니다.

## EC2 사전 준비

배포 전에 다음 조건을 만족해야 합니다.

- EC2 인스턴스가 실행 중이고 `EC2_HOST`가 현재 public IP 또는 DNS를 가리켜야 합니다.
- 배포 사용자의 home이 `/home/<EC2_USERNAME>`이어야 합니다.
- Docker Engine이 설치되어 실행 중이어야 합니다.
- 배포 사용자가 Docker daemon을 사용할 수 있거나 passwordless `sudo docker`를 실행할 수 있어야 합니다.
- `curl`과 `sha256sum`을 사용할 수 있어야 합니다. Compose plugin은 workflow가 checksum을 확인해 준비합니다.
- EC2에서 Docker Hub와 GitHub로 나가는 HTTPS 통신이 가능해야 합니다.
- Security Group은 SSH용 `22`와 현재 직접 접속용 `8080`만 필요한 범위에 열어야 합니다.
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

다음 URL Variables는 선택 사항입니다. 비워 두면 workflow가 `http://<EC2_HOST>:8080`을 기준으로 만듭니다.

| 이름 | 기본값으로 생성되는 runtime 값 |
| --- | --- |
| `PROD_FRONTEND_URL` | `APP_FRONTEND_URL=http://<EC2_HOST>:8080/realtime-demo.html` |
| `PROD_PASSWORD_RESET_URL` | `APP_PASSWORD_RESET_URL=http://<EC2_HOST>:8080/auth-demo.html` |
| `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=http://<EC2_HOST>:8080` |

실제 비밀번호, token, private key는 `.env.example`이나 Git에 커밋하지 않습니다.
필수 production 값은 빈 문자열일 수 없고 줄바꿈이나 작은따옴표(`'`)를 포함할 수 없습니다.

## runtime `.env` 환경변수 계약

[`.env.example`](./.env.example)은 로컬 검증과 운영 runtime 파일이 공유하는 변수 이름의 기준입니다.
운영 `.env`는 workflow가 권한 `600`으로 만들며 EC2에서 출력하거나 커밋하지 않습니다.

| runtime 변수 | 운영 배포에서 만드는 방법 | 필수 계약 |
| --- | --- | --- |
| `APP_IMAGE` | Docker Hub 경로 + tag 대상 commit SHA | 40자리 SHA tag 또는 digest |
| `SPRING_PROFILES_ACTIVE` | workflow 고정값 `prod` | `prod` |
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
| `APP_FRONTEND_URL` | `PROD_FRONTEND_URL` 또는 EC2 기본 URL | `http://` URL, HTTPS는 후속 적용 |
| `APP_PASSWORD_RESET_URL` | `PROD_PASSWORD_RESET_URL` 또는 EC2 기본 URL | `http://` URL, HTTPS는 후속 적용 |
| `APP_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` 또는 EC2 기본 origin | 현재 `8080` origin |
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

## 최초 태그 배포

아래 예시는 첫 운영 버전을 `deploy-v1.0.0`으로 배포합니다.

```bash
git switch 10-answer
git fetch --prune --tags origin
git pull --ff-only origin 10-answer

./gradlew clean test bootJar
test -f build/libs/app.jar
git status --short

git push origin 10-answer
git tag -a deploy-v1.0.0 -m "Deploy v1.0.0"
git show --stat deploy-v1.0.0
git push origin deploy-v1.0.0
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
git tag -a deploy-v1.0.1 -m "Deploy v1.0.1"
git show --stat deploy-v1.0.1
git push origin deploy-v1.0.1
```

원격에 push하기 전 로컬 태그를 잘못 만들었다면 다음처럼 지운 뒤 새로 만들 수 있습니다.

```bash
git tag -d deploy-v1.0.1
```

원격에 push한 배포 태그는 삭제하거나 같은 이름으로 다시 만들지 않습니다.

## 이전 버전으로 rollback 배포

이전 태그를 옮기지 않고 정상 동작했던 커밋에 더 높은 새 배포 태그를 붙입니다.
다음 예시는 `deploy-v1.0.0`의 커밋을 `deploy-v1.0.2`로 다시 배포합니다.

```bash
git fetch --prune --tags origin
git switch 10-answer
git pull --ff-only origin 10-answer

ROLLBACK_SHA="$(git rev-list -n 1 deploy-v1.0.0)"
git merge-base --is-ancestor "$ROLLBACK_SHA" origin/10-answer

git tag -a deploy-v1.0.2 "$ROLLBACK_SHA" \
  -m "Deploy v1.0.2: rollback to deploy-v1.0.0"
git show --stat deploy-v1.0.2
git push origin deploy-v1.0.2
```

`deploy-v1.0.0`은 실제로 정상 동작했던 태그로, `deploy-v1.0.2`는 아직 사용하지 않은 새 버전으로 바꿉니다.

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
  http://localhost:8080/actuator/health/readiness
```

성공 기준은 다음과 같습니다.

- `.env` 권한이 `600`입니다.
- `aandi-mysql`과 `aandi-redis`가 healthy입니다.
- `aandi-app`이 running입니다.
- 앱 컨테이너의 image와 revision이 태그 대상 commit SHA와 같습니다.
- readiness 요청이 성공합니다.
- 외부에서 `http://<EC2_HOST>:8080`에 접속할 수 있습니다.

검증 중에도 `.env`, private key, token이나 비밀번호 내용을 출력하거나 공유하지 않습니다.

## Visual Lab과 문서

`main`과 `10-answer`에서는 09·10의 Docker Runtime과 CI/CD 흐름을 정적 화면으로 먼저 확인할 수 있습니다.

- [Visual Lab](./docs/visual-lab/index.html)
- [이론 정리](./docs/theory.md)
- [구현 안내](./docs/implementation.md)
- [체크리스트](./docs/checklist.md)

Nginx reverse proxy, 도메인 연결, `80/443`, TLS 인증서와 HTTPS 전환은 이 배포가 안정화된 다음 단계에서 추가합니다.

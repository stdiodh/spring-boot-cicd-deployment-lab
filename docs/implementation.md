# Docker Runtime과 CI/CD 구현 안내

## 1. 구현 목표

이번 랩의 기준 흐름은 다음과 같습니다.

```text
test + bootJar
  -> Docker image build
  -> Docker Hub SHA tag
  -> production secret으로 runtime env 생성
  -> EC2 exact pull
  -> Compose stack create 또는 app update
  -> health/image/revision/readiness verify
```

EC2에서 source나 JAR를 다시 build하지 않습니다.
Actions가 검증한 source로 만든 image를 그대로 실행하는 것이 핵심입니다.

## 2. 09 runtime 계약 확인

### Step 1. 실행 JAR를 하나로 고정합니다

`build.gradle.kts`에서 `bootJar` 이름을 `app.jar`로 고정하고 plain `jar`를 끕니다.

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

`build/libs`에는 배포할 `app.jar`가 있어야 합니다.

### Step 2. revision이 있는 image를 만듭니다

```bash
docker build \
  --build-arg APP_VERSION=local \
  -t aandi-deployment-runtime-lab:local \
  .
```

Dockerfile은 wildcard가 아니라 `build/libs/app.jar`를 복사합니다.
`.dockerignore`도 이 파일을 build context에 포함해야 합니다.

label 확인:

```bash
docker image inspect \
  --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
  aandi-deployment-runtime-lab:local
```

결과는 `local`이어야 합니다.

### Step 3. 운영 Compose 입력을 확인합니다

`deploy/compose.prod.yaml`의 app image는 환경변수가 없으면 실패해야 합니다.

```bash
image: "${APP_IMAGE:?}"
```

로컬에서는 `.env.example`을 복사해 placeholder를 바꾼 뒤 확인합니다.

```bash
cp .env.example .env
chmod 600 .env
APP_IMAGE=aandi-deployment-runtime-lab:local \
  docker compose --env-file .env -f deploy/compose.prod.yaml config
```

## 3. 10 GitHub 준비

### Step 1. Docker Hub 저장소를 준비합니다

기본 실습은 공개 저장소 `aandi-deployment-runtime-lab`을 사용합니다.
private 저장소에서 EC2 registry 인증까지 다루는 것은 이번 범위 밖입니다.

### Step 2. GitHub Secrets를 등록합니다

Repository Secrets에는 image 게시와 EC2 접속값을 둡니다.

| 이름 | 입력 |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub 사용자명 |
| `DOCKERHUB_TOKEN` | password 대신 사용하는 Docker Hub access token |
| `EC2_HOST` | EC2 주소 |
| `EC2_USERNAME` | SSH 사용자 |
| `EC2_SSH_KEY` | SSH 개인 키 전체 |

GitHub의 `production` Environment에는 애플리케이션 runtime 값을 나눠 등록합니다.

| 종류 | 이름 | 입력 |
| --- | --- | --- |
| Secret | `PROD_DB_PASSWORD` | MySQL 애플리케이션 사용자 비밀번호 |
| Secret | `PROD_MYSQL_ROOT_PASSWORD` | 앱에 전달하지 않는 MySQL root 비밀번호 |
| Secret | `PROD_JWT_SECRET` | 충분히 긴 JWT 서명 키 |
| Secret | `PROD_MAIL_USERNAME` | SMTP 인증 계정 |
| Secret | `PROD_MAIL_PASSWORD` | SMTP 앱 비밀번호 |
| Secret | `PROD_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| Variable | `PROD_DB_USERNAME` | `aandi` |
| Variable | `PROD_MYSQL_DATABASE` | `aandi_lab` |
| Variable | `PROD_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| Optional Variable | `PROD_FRONTEND_URL` | 운영 프런트 URL, 생략하면 EC2 `:8080` 기준 |
| Optional Variable | `PROD_PASSWORD_RESET_URL` | 운영 비밀번호 재설정 URL, 생략하면 EC2 `:8080` 기준 |
| Optional Variable | `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | 허용할 운영 origin, 생략하면 EC2 `:8080` 기준 |

workflow는 `DB_PASSWORD`와 `MYSQL_PASSWORD`를 같은 `PROD_DB_PASSWORD`에서 만들고 root 비밀번호는 분리합니다.
workflow는 `EC2_HOST`를 대상으로 `ssh-keyscan`을 실행해 `known_hosts`를 준비합니다.

### Step 3. 09 EC2 scaffold를 확인합니다

10을 실행하기 전에 EC2에 다음 상태가 있어야 합니다.

- Docker 설치
- Compose plugin 설치와 checksum 검증에 사용할 `curl`, `sha256sum` 설치
- SSH 사용자가 Docker 명령을 실행할 수 있거나 passwordless sudo를 사용할 수 있음
- application `8080` 접근 허용
- MySQL `3306`과 Redis `6379`는 외부 인바운드에서 차단

Compose plugin이 아직 없으면 workflow가 공식 release의 고정 버전을 checksum 검증 후
배포 사용자 계정의 Docker CLI plugin 경로에 설치합니다.
Docker daemon 권한이 없으면 workflow가 passwordless sudo로 사용자를 `docker` 그룹에 추가하고
다음 SSH session에서 권한 적용 여부를 확인합니다.
`docker` 그룹은 root 수준의 Docker 제어 권한을 가지므로 전용 배포 사용자에게만 허용합니다.

EC2 runtime `.env`, MySQL, Redis는 미리 만들지 않습니다.
첫 workflow가 `.env`를 전달하고 Compose로 세 서비스를 생성합니다.

## 4. CI workflow 확인

`.github/workflows/ci.yml`은 `10-answer` 대상 PR과 `10-answer` push에서 다음 명령을 실행합니다.

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

CI는 Docker Hub push나 EC2 SSH를 수행하지 않습니다.
따라서 PR 검증에서는 운영 secret을 사용하지 않습니다.

## 5. deploy workflow 확인

`.github/workflows/deploy.yml`은 `deploy-v<major>.<minor>.<patch>` tag push만 받습니다.
publish 전에 tag commit이 `origin/10-answer`에 포함되는지 확인합니다.

### publish job

1. test와 `bootJar`를 실행합니다.
2. Docker Hub에 로그인합니다.
3. annotated tag가 가리키는 commit을 `RELEASE_SHA`로 해석합니다.
4. `${RELEASE_SHA}` image가 이미 있으면 revision label을 확인하고 그대로 재사용합니다.
5. SHA image가 없을 때만 `APP_VERSION=${RELEASE_SHA}`로 build하고 SHA tag를 push합니다.
6. 같은 image에 `${GITHUB_REF_NAME}` release tag를 추가해 push합니다.

학생이 registry 경계를 직접 읽을 수 있도록 login, build, push는 shell 명령으로 드러냅니다.
token은 명령 인자가 아니라 표준 입력으로 전달합니다.

```bash
printf '%s' "$DOCKERHUB_TOKEN" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin
sha_image="${IMAGE_REPOSITORY}:${RELEASE_SHA}"
release_image="${IMAGE_REPOSITORY}:${GITHUB_REF_NAME}"

if docker pull "$sha_image"; then
  # revision label이 RELEASE_SHA와 같을 때만 기존 artifact를 재사용합니다.
  docker tag "$sha_image" "$release_image"
else
  docker build --build-arg APP_VERSION="$RELEASE_SHA" \
    --build-arg APP_RELEASE="$GITHUB_REF_NAME" \
    --tag "$sha_image" --tag "$release_image" .
  docker push "$sha_image"
fi
docker push "$release_image"
```

### deploy job

1. `production` Secret과 Variable의 필수값을 검사합니다.
2. 값 자체를 출력하지 않고 권한 `600`의 임시 `runtime.env`를 만듭니다.
3. exact SHA `APP_IMAGE`를 주입해 Compose 설정을 먼저 검증합니다.
4. Compose와 설치·배포·점검 script, `runtime.env`를 EC2의 `.env.next`로 복사합니다.
5. EC2에서도 `.env.next`로 Compose 설정을 다시 검증합니다.
6. 기존 `.env`를 `.env.previous`로 보존하고 `.env.next`를 `.env`로 원자적으로 교체합니다.
7. SHA image를 정확히 pull합니다.
8. `up -d --no-recreate mysql redis`로 첫 배포에는 의존 서비스를 만들고 이후에는 보존합니다.
9. `up -d --no-deps app`으로 변경된 app만 교체합니다.

MySQL은 `MYSQL_USER`와 `MYSQL_PASSWORD`로 애플리케이션 전용 계정을 초기화합니다.
MySQL과 Redis의 host port는 열지 않고 app이 Compose service 이름으로 접근합니다.
MySQL named volume에는 고정 이름을 사용하며 배포 script는 `down -v`를 실행하지 않습니다.

### verify job

1. app container가 요청한 SHA image reference를 사용하는지 확인합니다.
2. OCI revision label이 tag 대상 commit SHA인지 확인합니다.
3. DB와 Redis를 포함한 Actuator readiness 응답을 재시도합니다.
4. 실패하면 같은 tag를 이동하지 않고 정상 commit에 새 배포 tag를 만듭니다.

`publish -> deploy -> verify`는 `needs`로 연결되어 앞 단계 실패 시 다음 단계가 열리지 않습니다.
`production-deployment` concurrency는 운영 배포를 직렬화합니다.

## 6. script를 개별 확인하는 방법

실제 pull과 app 갱신은 registry와 Docker가 설치된 EC2가 필요합니다.
workflow가 `.env`를 전달한 뒤 서버에서 같은 인자로 확인할 수 있습니다.

```bash
bash scripts/deploy.sh \
  "$PWD" \
  "docker.io/your-dockerhub-username/aandi-deployment-runtime-lab:commit-sha"
```

검증:

```bash
bash scripts/check-deploy.sh \
  "$PWD" \
  "docker.io/your-dockerhub-username/aandi-deployment-runtime-lab:commit-sha" \
  "commit-sha"
```

실패하면 출력된 Compose 상태와 app log에서 첫 실패 원인을 확인합니다.

## 7. 배포 tag를 만들 때

배포 tag는 `10-answer`에 push된 commit에만 만듭니다.

```bash
git switch 10-answer
git pull --ff-only origin 10-answer
git tag -a deploy-v1.0.0 -m "Deploy v1.0.0"
git push origin deploy-v1.0.0
```

배포 version을 되돌릴 때도 기존 tag를 이동하지 않고 정상 commit에 새 tag를 만듭니다.

다음 계약은 항상 유지합니다.

- test 성공 뒤 image 게시
- SHA tag로 배포
- GitHub runtime 값으로 `.env` 생성과 원자적 교체
- 첫 배포에는 Compose stack 생성, 이후에는 app-only 갱신
- exact image와 revision 검증
- service health와 readiness 실패를 workflow 실패로 처리

## 8. 완료 전 확인

```bash
./gradlew clean test bootJar
bash -n scripts/deploy.sh
bash -n scripts/check-deploy.sh
docker compose --env-file .env.example -f deploy/compose.prod.yaml config
git diff --check
```

Docker Hub push, SSH, 실제 HTTP 검증은 외부 환경이 준비된 workflow 실행으로 확인합니다.

<details>
<summary>멘토용 진행 포인트</summary>

- `10-answer` 안에서 09 runtime 계약을 먼저 확인한 뒤 10 자동화 흐름으로 이동합니다.
- 학생이 `latest`가 아니라 SHA tag를 배포 입력으로 설명하는지 확인합니다.
- annotated deploy tag와 실제 SHA image의 역할을 구분하는지 확인합니다.
- Secret, Variable, EC2 runtime `.env`의 전달 경계를 설명하는지 확인합니다.
- deploy 명령 성공과 service health/image/revision/readiness 검증 성공을 구분하게 합니다.
- 전체 Compose를 내리지 않고 app만 갱신하는 이유를 DB와 Redis 상태 보존에 연결합니다.
- 기존 MySQL volume에서는 Secret만 바꿔도 DB 계정 비밀번호가 자동 회전되지 않음을 설명합니다.

</details>

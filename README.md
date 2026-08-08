# Spring Boot CI/CD Deployment Lab

이 저장소는 A&I 백엔드 시퀀스 10의 HTTPS 배포 실습 저장소입니다.

- `main` 대상 Pull Request에서는 test와 `bootJar`를 확인합니다.
- 최초 배포는 현재 `main`을 수동 실행합니다.
- 이후 `main` push 또는 merge는 자동으로 EC2 배포를 시작합니다.
- 배포에는 Git 태그를 사용하지 않고, `main` commit의 40자리 SHA 이미지만 사용합니다.
- 각 포크는 본인의 Docker Hub, EC2와 도메인을 사용합니다.

## 1. 포크하고 저장소 받기

GitHub에서 이 저장소를 포크한 뒤 `YOUR_GITHUB_ID`를 본인 아이디로 바꿔 실행합니다.

```bash
FORK_OWNER="YOUR_GITHUB_ID"
TARGET="${FORK_OWNER}/spring-boot-cicd-deployment-lab"

git clone "https://github.com/${TARGET}.git"
cd spring-boot-cicd-deployment-lab
git remote add upstream https://github.com/stdiodh/spring-boot-cicd-deployment-lab.git
git switch main
```

연결 상태를 확인합니다.

```bash
git remote -v
git branch --show-current
git tag --list
```

브랜치는 `main`이어야 하며, 배포용 Git 태그는 필요하지 않습니다.

## 2. 한 번만 준비할 것

1. Docker Hub에 공개 저장소 `aandi-cicd-deployment-lab`을 만듭니다.
2. EC2를 준비하고 Docker Engine을 실행합니다.
3. 본인 도메인의 모든 A 레코드를 EC2 public IPv4로 연결하고 AAAA 레코드는 제거합니다.
4. Security Group에서 `80`, `443`을 열고 `8080`, `3306`, `6379`는 열지 않습니다. SSH `22`는 필요한 출발지에만 허용합니다.
5. 포크의 Actions를 활성화합니다.
6. 포크에 `production` Environment를 만들고 아래 설정을 등록합니다.

포크에는 원본 저장소의 Actions 설정, Secrets, Environment와 Variables가 복사되지 않습니다.
실제 비밀번호, token과 private key는 파일에 쓰거나 Git에 commit하지 않습니다.

### Repository Secrets

| 이름 | 값 |
| --- | --- |
| `DOCKERHUB_USERNAME` | 본인 Docker Hub 사용자명 |
| `DOCKERHUB_TOKEN` | 본인 Docker Hub access token |
| `EC2_HOST` | 본인 EC2 public IPv4 또는 host |
| `EC2_USERNAME` | EC2 SSH 사용자 |
| `EC2_SSH_KEY` | EC2 SSH private key 전체 내용 |

### `production` Environment Secrets

| 이름 | 값 |
| --- | --- |
| `PROD_DB_PASSWORD` | 애플리케이션 DB 사용자 비밀번호 |
| `PROD_MYSQL_ROOT_PASSWORD` | MySQL root 비밀번호 |
| `PROD_JWT_SECRET` | 32바이트 이상의 JWT secret |
| `PROD_MAIL_USERNAME` | 운영 mail 계정 |
| `PROD_MAIL_PASSWORD` | 운영 mail 비밀번호 |
| `PROD_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### `production` Environment Variables

| 이름 | 값 |
| --- | --- |
| `PROD_DB_USERNAME` | 애플리케이션 DB 사용자명 |
| `PROD_MYSQL_DATABASE` | MySQL database 이름 |
| `PROD_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `PROD_DOMAIN` | `YOUR_DOMAIN` 형식의 소문자 도메인 |
| `PROD_CERTBOT_EMAIL` | 인증서 운영 연락 이메일 |

아래 Variables는 선택 사항입니다. 비워 두면 `https://YOUR_DOMAIN`을 기준으로 만듭니다.

- `PROD_FRONTEND_URL`
- `PROD_PASSWORD_RESET_URL`
- `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS`

Actions 활성화와 `production` Environment 생성은 명령으로도 할 수 있습니다.

```bash
gh api --method PUT "repos/${TARGET}/actions/permissions" -F enabled=true
gh api --method PUT "repos/${TARGET}/environments/production"
```

설정을 등록한 뒤 이름이 빠지지 않았는지 확인합니다.

```bash
gh secret list --repo "$TARGET"
gh secret list --repo "$TARGET" --env production
gh variable list --repo "$TARGET" --env production
```

## 3. 배포 전 확인

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
bash -n scripts/*.sh
docker compose --env-file .env.example -f deploy/compose.prod.yaml config --quiet
git diff --check
git status --short
```

## 4. 최초 배포

설정을 모두 등록한 뒤 현재 `main`을 한 번 수동 배포합니다.

```bash
gh workflow run deploy.yml --repo "$TARGET" --ref main
gh run list --repo "$TARGET" --workflow deploy.yml --limit 5
```

첫 배포에는 이전 snapshot이 없어 자동 복구가 불가능할 수 있습니다.
실패하면 Actions에서 처음 실패한 단계를 확인한 뒤 같은 명령을 다시 실행합니다.

## 5. 배포 확인

`YOUR_DOMAIN`을 본인의 실제 운영 도메인으로 바꿉니다.

```bash
DOMAIN="YOUR_DOMAIN"

curl --fail --show-error \
  "https://${DOMAIN}/actuator/health/readiness"

curl --head "http://${DOMAIN}/"
```

첫 요청이 성공하고 두 번째 요청이 같은 도메인의 HTTPS 주소로 이동하면 배포가 완료된 것입니다.

## 6. 원본 변경 가져오기

포크를 원본 최신 `main`과 맞춘 뒤 push하면 자동 CD가 시작됩니다.

```bash
git switch main
git fetch upstream --prune --no-tags
git merge --ff-only upstream/main
./gradlew clean test bootJar
git push origin main
```

## 7. 되돌리기

문제가 있는 commit을 삭제하지 않고 revert한 뒤 `main`에 push합니다.

```bash
git switch main
git pull --ff-only origin main
git log --oneline -10
git revert BAD_COMMIT_SHA
git push origin main
```

마지막 push가 되돌린 source의 새 SHA 이미지로 자동 배포를 시작합니다.

## 자세한 설명

- [환경변수 예시](./.env.example)
- [이론 정리](./docs/theory.md)
- [workflow와 배포 script 구현](./docs/implementation.md)
- [전체 점검 항목](./docs/checklist.md)
- [Visual Lab](./docs/visual-lab/index.html)

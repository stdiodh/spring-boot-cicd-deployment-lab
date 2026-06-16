# Docker/Runtime과 CI/CD 이론 정리

## 1. 로컬에서는 되는데 서버에서는 왜 실패할까?

`./gradlew bootRun`으로 로컬 실행이 성공해도 서버 실행이 바로 보장되지는 않습니다.
서버에는 JDK 버전, DB 주소, Redis 주소, JWT secret, OAuth/SMTP 값, 실행 profile이 다를 수 있습니다.

배포는 코드를 복사하는 일이 아니라 실행할 산출물과 환경값을 함께 맞추는 일입니다.

## 2. 배경: 실행 단위와 운영 설정을 분리해야 합니다

Spring Boot 애플리케이션은 jar로 빌드됩니다.
Dockerfile은 그 jar를 컨테이너 안에서 같은 명령으로 실행하게 만듭니다.

운영 설정은 코드에 고정하지 않습니다.
`application-prod.yaml`은 어떤 환경변수가 필요한지 정의하고, 실제 값은 `.env`와 GitHub Secrets에서 주입합니다.

CI/CD는 이 과정을 반복 가능한 순서로 묶습니다.
현재 workflow는 단일 `deploy` job 안에서 test/build, release bundle 생성, EC2 업로드, 서버 재기동, 로그 확인 step을 순서대로 실행합니다.
단계가 별도 job으로 나뉘지 않아도 첫 실패 step을 읽을 수 있어야 합니다.

## 3. 선택한 방식

이 레포는 두 시퀀스를 함께 다룹니다.

- `09`: jar, Dockerfile, compose, profile로 런타임을 정리합니다.
- `10`: workflow, secret, release bundle, EC2 deploy, 로그 확인으로 배포 자동화를 정리합니다.

## 4. 핵심 코드로 연결하기

실제 파일 경로는 아래와 같습니다.

- `Dockerfile`: `build/libs/*.jar`를 컨테이너 안의 `app.jar`로 복사하고 Java 명령으로 실행합니다.
- `src/main/resources/application-prod.yaml`: 운영 DB, Redis, mail, OAuth2, JWT 값을 환경변수로 받습니다.
- `.github/workflows/deploy.yml`: 테스트, jar 빌드, release bundle 생성, EC2 업로드, 컨테이너 재기동을 연결합니다.
- `deploy/compose.prod.yaml`: EC2에서 앱과 의존 서비스를 띄우는 운영 compose 파일입니다.

왜 이 코드를 보는지 먼저 정리합니다.
배포 실패는 jar 빌드, release bundle 생성, 환경변수, 컨테이너 기동, 로그 확인 중 어디서든 발생할 수 있습니다.

```dockerfile
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

이 코드는 빌드 산출물인 jar를 컨테이너 실행 단위로 바꾸는 문제를 해결합니다.
서버는 프로젝트 소스 전체가 아니라 컨테이너 이미지 안의 `app.jar`를 실행합니다.

## 5. 실행/테스트 결과로 확인할 것

```bash
./gradlew test bootJar
docker build -t aandi-deployment-runtime-lab:local .
docker compose up -d
```

CI/CD에서는 workflow의 첫 실패 step을 확인합니다.
배포 뒤에는 workflow의 `Deploy on EC2` step에서 `docker compose ps`와 `docker logs --tail 50 aandi-app` 출력으로 실제 기동 여부를 봅니다.

## 6. 한계와 다음 개선 방향

이번 레포는 EC2와 Docker Compose 기반의 기본 배포 흐름을 다룹니다.
무중단 배포, rollback, observability, Kubernetes, IaC는 별도 운영 심화 주제입니다.
다음 시퀀스에서는 이미 만든 코드와 문서를 다시 읽고 리팩토링 기준을 세웁니다.

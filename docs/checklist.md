# Docker/Runtime과 CI/CD 체크리스트

## 수업 전 확인

- [ ] 오늘 시퀀스가 `09`인지 `10`인지 확인했습니다.
- [ ] 해당 `NN-implementation` 브랜치에서 시작했습니다.
- [ ] `./gradlew test bootJar`를 실행했습니다.

## 09 Docker/Runtime 확인

- [ ] `Dockerfile`이 jar를 `app.jar`로 복사합니다.
- [ ] `ENTRYPOINT`가 `java -jar /app/app.jar`를 실행합니다.
- [ ] `application-prod.yaml`이 운영 값을 환경변수로 받습니다.
- [ ] `deploy/compose.prod.yaml`이 앱과 의존 서비스를 실행합니다.

## 10 CI/CD 확인

- [ ] `.github/workflows/deploy.yml`이 test, build, upload, deploy 순서를 가집니다.
- [ ] 민감한 값은 GitHub Secrets에서 받습니다.
- [ ] `scripts/deploy.sh`가 서버 배포 순서를 담당합니다.
- [ ] `scripts/check-deploy.sh`가 compose 상태, 로그, HTTP 응답을 확인합니다.

## 마무리 확인

- [ ] 실패한 workflow step을 먼저 읽었습니다.
- [ ] 컨테이너 로그로 기동 여부를 확인했습니다.
- [ ] `NN-implementation..NN-answer` diff를 비교했습니다.

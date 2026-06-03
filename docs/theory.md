# 이론 정리

## 1. 왜 이 개념이 필요한가

수동 배포는 작업자가 기억하는 순서에 의존합니다. 테스트를 빼먹거나, 로그 확인을 생략하거나, 오래된 파일을 서버에 남겨둘 수 있습니다.

이번 answer 브랜치는 workflow와 script로 build, test, deploy, verify 단계를 고정하고, 실패한 단계 이후 작업이 이어지지 않도록 만든 비교 기준입니다.

## 2. 기존 방식의 한계

배포 명령을 손으로 반복하면 순서가 흔들립니다. 테스트가 실패했는데도 배포로 넘어가거나, 배포 명령은 끝났지만 애플리케이션이 죽어 있는 상황을 놓칠 수 있습니다.

자동화는 빠른 실행만을 위한 장치가 아닙니다. 실패 차단 지점과 성공 판정 기준을 파일로 남기는 장치입니다.

## 3. 이번 시퀀스에서 선택한 접근

answer 구현의 흐름은 아래와 같습니다.

1. `ci.yml`이 build와 test를 먼저 확인합니다.
2. `deploy.yml`의 build job이 release bundle을 만듭니다.
3. deploy job이 artifact를 내려받아 EC2에 업로드하고 `deploy.sh`를 실행합니다.
4. verify job이 `check-deploy.sh`를 실행해 상태, 로그, HTTP 응답을 확인합니다.
5. job 의존성으로 실패한 단계 이후의 작업을 막습니다.

## 4. 핵심 개념

### CI

코드를 합치거나 배포하기 전에 build와 test를 반복해서 확인하는 흐름입니다. 이번 코드에서는 `.github/workflows/ci.yml`이 이 역할을 맡습니다.

### CD

검증된 결과를 실행 환경으로 전달하는 흐름입니다. 이번 코드에서는 `.github/workflows/deploy.yml`과 `scripts/deploy.sh`가 이 역할을 나눠 맡습니다.

### workflow

언제 어떤 순서로 작업을 실행할지 정의한 자동화 파일입니다. job 의존성과 artifact 전달 흐름을 표현합니다.

### script

서버에서 실제로 실행할 명령을 담은 파일입니다. workflow가 길어지지 않도록 실제 배포 작업과 검증 작업을 분리합니다.

### artifact

build 결과물과 배포에 필요한 파일 묶음입니다. 검증된 결과만 다음 단계로 넘기는 기준이 됩니다.

### verify

배포 직후 실제로 애플리케이션이 살아 있는지 확인하는 단계입니다. 컨테이너 상태, 로그, HTTP 응답을 함께 확인합니다.

## 5. 짧은 예제와 해설

answer workflow는 build, deploy, verify job을 나누고 `needs`로 순서를 연결합니다.

```yaml
deploy:
  needs: build

verify:
  needs: deploy
```

서버에서 실제 재배포는 `scripts/deploy.sh`가 맡고, 배포 후 확인은 `scripts/check-deploy.sh`가 맡습니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml up -d
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

이 구조는 "배포 명령 실행"과 "정상 기동 확인"을 분리해 자동화의 성공 기준을 더 분명하게 만듭니다.

## 6. 다음 구현으로 연결되는 지점

answer 비교 후에는 아래 질문으로 구현을 설명할 수 있어야 합니다.

- build/test가 실패하면 deploy가 실행되지 않나요?
- release bundle에는 어떤 파일이 들어가나요?
- deploy script와 verify script는 책임이 어떻게 다른가요?
- HTTP 응답 확인 실패는 왜 workflow 실패로 봐야 하나요?

다음 시퀀스에서는 자동화가 지켜주는 동작을 바탕으로 코드 구조와 테스트 기반 리팩토링을 다룹니다.

<details>
<summary>멘토용 설명 포인트</summary>

- starter와 비교할 때 YAML 문법보다 job 의존성과 실패 차단 지점을 먼저 설명하게 합니다.
- deploy와 verify를 나눈 이유를 운영 성공 판정 기준으로 연결합니다.
- secret 값 자체가 아니라 secret 이름과 주입 위치만 확인하게 합니다.

</details>

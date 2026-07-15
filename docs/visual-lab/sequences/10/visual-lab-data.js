window.visualLabData = {
  "kind": "sequence",
  "sequence": "10",
  "title": "CI/CD Deployment",
  "subtitle": "Automation and operations flow",
  "goal": "실습 시작 상태의 build, deploy, verify 뼈대와 TODO를 읽고 artifact 전달, 배포, 검증 책임의 목표 경계를 이해합니다.",
  "problem": "사람이 매번 같은 배포 명령을 손으로 반복하면 순서가 흔들리고 실패 기준이 누락될 수 있습니다.",
  "workbench": {
    "kind": "pipeline",
    "title": "배포가 통과하거나 멈추는 과정",
    "instruction": "현재 TODO와 원격 heredoc blocker를 먼저 구분하고, 이를 고친 뒤 각 실패가 다음 job을 차단하는 목표 흐름을 확인하세요.",
    "visual": {
      "src": "../../assets/diagrams/10-pipeline-gates.svg",
      "alt": "TODO를 완성하고 heredoc 종료 경계를 수정했을 때 build가 artifact를 만들고 deploy가 서버를 갱신한 뒤 verify가 상태·로그·HTTP 응답을 확인하는 목표 파이프라인 게이트",
      "caption": "세 job은 실습 목표입니다. 시작 상태의 TODO와 들여쓰기된 ENV 종료자를 고치고 실제 run 증거를 얻기 전에는 pipeline 통과를 단정하지 않습니다."
    },
    "terms": [
      { "term": "job", "meaning": "CI/CD workflow 안에서 하나의 책임을 수행하는 실행 단위" },
      { "term": "artifact", "meaning": "build job이 만들고 다음 job으로 전달하는 검증된 배포 파일" },
      { "term": "needs", "meaning": "이전 job 성공을 다음 job의 실행 조건으로 연결하는 의존 선언" },
      { "term": "verify", "meaning": "배포 명령 이후 실제 서비스 상태를 증거로 확인하는 별도 단계" }
    ],
    "comparison": {
      "label": "명령 실행과 서비스 검증",
      "left": {
        "title": "deploy command",
        "body": "release 파일을 배치하고 애플리케이션 container를 갱신하는 작업입니다. 명령 종료는 중간 상태입니다."
      },
      "right": {
        "title": "서비스 확인 완료",
        "body": "compose 상태와 애플리케이션 로그를 관찰하고 HTTP health check가 성공한 상태입니다. ps와 log 내용을 별도로 판정하는 script는 아닙니다."
      }
    },
    "nodes": {
      "git-trigger": {
        "label": "Git trigger",
        "icon": "person",
        "kind": "trigger",
        "role": "push 또는 수동 실행으로 workflow 시작",
        "boundary": "Source event"
      },
      "github-actions": {
        "label": "GitHub Actions",
        "icon": "pipeline",
        "kind": "orchestrator",
        "role": "job 순서와 needs gate 관리",
        "boundary": "Workflow",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "build-job": {
        "label": "build job",
        "icon": "gate",
        "kind": "job gate",
        "role": "test, bootJar, artifact upload TODO를 가진 목표 gate",
        "boundary": "Build job",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "release-bundle": {
        "label": "release-bundle",
        "icon": "artifact",
        "kind": "artifact",
        "role": "job 사이에서 전달되는 검증된 배포 파일",
        "boundary": "Artifact transfer"
      },
      "deploy-job": {
        "label": "deploy job",
        "icon": "gate",
        "kind": "job gate",
        "role": "artifact download와 EC2 갱신 TODO를 가진 목표 gate",
        "boundary": "Deploy job",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "secret-references": {
        "label": "Secret references",
        "icon": "security",
        "kind": "protected config",
        "role": "repository에는 참조만 두고 원격 .env에는 실제 값을 materialize",
        "boundary": "Trust boundary"
      },
      "ec2-host": {
        "label": "EC2 host",
        "icon": "host",
        "kind": "runtime host",
        "role": "release bundle을 받아 배포 script 실행",
        "boundary": "Remote runtime"
      },
      "deploy-script": {
        "label": "scripts/deploy.sh",
        "icon": "tool",
        "kind": "deployment script",
        "role": "app image build와 compose 갱신을 채워야 하는 TODO script",
        "boundary": "Remote runtime",
        "codePointIds": [
          "inline-deploy-steps"
        ]
      },
      "app-container": {
        "label": "Application container",
        "icon": "runtime",
        "kind": "runtime instance",
        "role": "갱신된 애플리케이션 실행 단위",
        "boundary": "Remote runtime"
      },
      "verify-job": {
        "label": "verify job",
        "icon": "gate",
        "kind": "verification gate",
        "role": "deploy 통과 뒤 서비스 증거 확인",
        "boundary": "Verify job",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "verify-script": {
        "label": "scripts/check-deploy.sh",
        "icon": "test",
        "kind": "verification script",
        "role": "compose 상태·로그 출력 관찰과 HTTP 성공 확인",
        "boundary": "배포 확인 경계",
        "codePointIds": [
          "inline-deploy-steps"
        ]
      },
      "http-response": {
        "label": "HTTP response",
        "icon": "response",
        "kind": "runtime evidence",
        "role": "애플리케이션 응답 가능 여부",
        "boundary": "응답 확인 경계"
      },
      "workflow-result": {
        "label": "Workflow result",
        "icon": "evidence",
        "kind": "decision evidence",
        "role": "build, deploy, verify의 최종 판정",
        "boundary": "Workflow result"
      },
      "build-failure": {
        "label": "Build failure",
        "icon": "evidence",
        "kind": "failure evidence",
        "role": "test 또는 bootJar의 첫 실패",
        "boundary": "Build job"
      },
      "deploy-failure": {
        "label": "Deploy failure",
        "icon": "evidence",
        "kind": "failure evidence",
        "role": "서버 파일 전달 또는 app 갱신 실패",
        "boundary": "Deploy job"
      },
      "heredoc-boundary": {
        "label": ".env heredoc 종료 경계",
        "icon": "evidence",
        "kind": "shell parsing boundary",
        "role": "들여쓰기된 ENV가 종료자로 인식되지 않아 뒤 명령을 .env에 포함",
        "boundary": "원격 shell"
      },
      "verify-failure": {
        "label": "배포 검증 실패",
        "icon": "evidence",
        "kind": "failure evidence",
        "role": "docker 명령 오류 또는 HTTP health check 실패",
        "boundary": "Verify job"
      }
    },
    "scenarios": [
      {
        "id": "pipeline-verified",
        "label": "TODO·heredoc 수정 후 검증 목표",
        "flowId": "build-deploy-verify",
        "tone": "recovered",
        "prompt": "workflow와 script TODO를 채우고 들여쓰기 없는 heredoc 종료자 또는 `printf` 방식으로 원격 `.env` 생성을 고쳤다고 가정합니다. 어디까지 관찰해야 성공을 판단할지 예측합니다.",
        "observationTitle": "검증된 artifact가 deploy를 거쳐 runtime evidence로 닫히는 경로",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "workflow success를 구성하는 마지막 증거를 적어보세요.",
          "hint": "build와 deploy뿐 아니라 ps·log와 HTTP health가 필요합니다."
        },
        "prediction": {
          "prompt": "어느 gate까지 통과해야 배포 성공으로 판단할 수 있을까요?",
          "options": [
            { "id": "build", "label": "build job 성공" },
            { "id": "deploy", "label": "deploy 스크립트 종료" },
            { "id": "verify", "label": "ps·log 관찰 후 HTTP health check 성공" }
          ],
          "answer": "verify",
          "explanation": "artifact 전달과 서버 갱신은 중간 상태입니다. 실제 서비스 증거를 확인하는 verify가 최종 gate입니다."
        },
        "route": [
          "Push / workflow_dispatch",
          "build job",
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job",
          "check-deploy.sh",
          "HTTP response"
        ],
        "diagram": {
          "caption": "현재 실행 결과가 아니라 수정 후 목표 흐름입니다. needs gate, artifact 전달, deploy, runtime 검증이 실제 run에서 모두 통과해야 workflow가 성공합니다.",
          "lanes": [
            {
              "id": "workflow-orchestration",
              "label": "workflow 시작 → job 의존성",
              "description": "job의 성공 상태가 다음 needs gate를 여는 조건입니다.",
              "steps": [
                {
                  "from": "git-trigger",
                  "to": "github-actions",
                  "verb": "workflow 시작",
                  "payload": "push | workflow_dispatch",
                  "kind": "request",
                  "effect": {
                    "kind": "gate",
                    "subject": "workflow trigger",
                    "before": "GitHub Actions workflow는 event를 기다리는 상태",
                    "after": "push 또는 `workflow_dispatch` event가 build job을 시작함"
                  },
                  "evidenceScope": "code"
                },
                {
                  "from": "github-actions",
                  "to": "build-job",
                  "verb": "build 실행",
                  "payload": "./gradlew test bootJar",
                  "kind": "call",
                  "codePointIds": [
                    "workflow-stages"
                  ],
                  "effect": {
                    "kind": "verify",
                    "subject": "build artifact",
                    "before": "source checkout 뒤 test result와 jar가 없음",
                    "after": "build job이 test 통과 여부와 executable jar 생성을 결정함"
                  },
                  "evidenceScope": "test"
                },
                {
                  "from": "build-job",
                  "to": "release-bundle",
                  "verb": "artifact 업로드",
                  "payload": "release-bundle",
                  "kind": "transform",
                  "effect": {
                    "kind": "persist",
                    "subject": "`release-bundle`",
                    "before": "jar와 배포 파일이 build runner filesystem에만 있음",
                    "after": "Actions artifact storage에 `release-bundle`이 저장됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "release-bundle",
                  "to": "deploy-job",
                  "verb": "artifact 다운로드",
                  "payload": "needs: build passed",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "`release-bundle`",
                    "before": "deploy runner에는 build job의 release 파일이 없음",
                    "after": "build 성공 뒤 deploy runner에 `release-bundle`이 내려옴"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "deploy-job",
                  "to": "verify-job",
                  "verb": "verify gate 개방",
                  "payload": "needs: deploy passed",
                  "kind": "call",
                  "concept": "실패 차단 gate",
                  "effect": {
                    "kind": "gate",
                    "subject": "verify job",
                    "before": "deploy job이 끝나지 않아 verify job은 pending임",
                    "after": "deploy exit code 0 뒤 verify job이 runnable 상태가 됨"
                  },
                  "evidenceScope": "code"
                }
              ]
            },
            {
              "id": "remote-deploy",
              "label": "artifact 전달 → EC2 갱신",
              "description": "수정 후 deploy job은 bundle을 SCP로 배치하고 secret 값을 원격 `.env`에 기록한 뒤 app 갱신 script를 실행합니다.",
              "steps": [
                {
                  "from": "deploy-job",
                  "to": "ec2-host",
                  "verb": "전송과 원격 실행",
                  "payload": "SCP release-bundle + SSH command",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "deployment bundle",
                    "before": "release 파일이 Actions runner에만 있음",
                    "after": "SCP로 EC2 release directory에 bundle이 복사되고 SSH command가 시작됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "secret-references",
                  "to": "ec2-host",
                  "verb": "운영 설정 주입",
                  "payload": "GitHub Secrets 참조 → EC2 .env 실제 값",
                  "kind": "config",
                  "check": "repository와 log에는 값을 노출하지 않되, 원격 `.env`에는 실제 값이 기록됩니다. 현재 workflow는 파일 권한을 별도로 강화하지 않습니다.",
                  "effect": {
                    "kind": "transfer",
                    "subject": "secret values",
                    "before": "repository와 release bundle에는 운영 secret 값 대신 참조만 있음",
                    "after": "workflow shell이 GitHub Secrets 실제 값을 EC2 `.env` 파일에 materialize함"
                  },
                  "evidenceScope": "code"
                },
                {
                  "from": "ec2-host",
                  "to": "deploy-script",
                  "verb": "script 실행",
                  "payload": "bash scripts/deploy.sh",
                  "kind": "call",
                  "codePointIds": [
                    "inline-deploy-steps"
                  ],
                  "effect": {
                    "kind": "transfer",
                    "subject": "deploy command",
                    "before": "EC2 release directory에 bundle과 `.env`가 준비됨",
                    "after": "EC2 shell이 `scripts/deploy.sh`를 실행함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "deploy-script",
                  "to": "app-container",
                  "verb": "app 갱신",
                  "payload": "docker build + compose up -d",
                  "kind": "transform",
                  "check": "DB와 Redis를 불필요하게 내리는 흐름으로 해석하지 않습니다.",
                  "effect": {
                    "kind": "transform",
                    "subject": "app container",
                    "before": "EC2에 이전 app image 또는 container가 있음",
                    "after": "새 image build와 `compose up -d` 뒤 app container가 교체됨"
                  },
                  "evidenceScope": "runtime"
                }
              ]
            },
            {
              "id": "runtime-verification",
              "label": "process 증거 → HTTP 검증",
              "description": "배포 명령 종료와 서비스 정상 판정을 분리합니다.",
              "steps": [
                {
                  "from": "verify-job",
                  "to": "verify-script",
                  "verb": "원격 검증 실행",
                  "payload": "bash scripts/check-deploy.sh",
                  "kind": "call",
                  "effect": {
                    "kind": "verify",
                    "subject": "verify script",
                    "before": "deploy script는 끝났지만 서비스 success는 정해지지 않음",
                    "after": "EC2 shell이 `scripts/check-deploy.sh`를 실행함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "app-container",
                  "verb": "상태와 로그 확인",
                  "payload": "docker compose ps + docker logs",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "container evidence",
                    "before": "app container의 running state와 startup outcome을 모름",
                    "after": "`compose ps`와 `docker logs`가 container state와 startup failure를 출력함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "http-response",
                  "verb": "응답 확인",
                  "payload": "curl http://localhost:8080/",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "HTTP health",
                    "before": "Spring process가 port 8080에 응답하는지 모름",
                    "after": "`curl --fail` exit code가 HTTP endpoint의 사용 가능 여부를 나타냄"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "http-response",
                  "to": "workflow-result",
                  "verb": "성공 판정",
                  "payload": "ps·log output observed + HTTP health check passed",
                  "kind": "response",
                  "effect": {
                    "kind": "verify",
                    "subject": "workflow success",
                    "before": "ps·log·HTTP evidence가 모두 수집된 상태",
                    "after": "container running과 health check 통과가 함께 확인돼 workflow가 success가 됨"
                  },
                  "evidenceScope": "runtime"
                }
              ]
            }
          ]
        },
        "snapshot": [
          {
            "label": "Workflow",
            "value": "build · deploy · verify 통과",
            "tone": "recovered"
          },
          {
            "label": "성공 증거",
            "value": "ps·log 출력 · HTTP health check",
            "tone": "recovered"
          }
        ],
        "evidence": "TODO와 heredoc을 고친 실제 run에서 artifact 전달, deploy script 실행, compose·log 출력, `curl --fail` 결과를 각각 확인해야 합니다.",
        "outcome": "현재 저장소가 이미 통과했다고 말하지 않습니다. 수정 후에도 runtime 출력과 HTTP health check가 성공해야 workflow를 성공으로 판정합니다."
      },
      {
        "id": "pipeline-build-failed",
        "label": "test·bootJar 실패",
        "flowId": "build-deploy-verify",
        "tone": "blocked",
        "prompt": "테스트 또는 bootJar가 실패했을 때 deploy가 실행되는지 확인합니다.",
        "observationTitle": "build 실패가 artifact와 deploy job을 막는 경로",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "build gate 실패 뒤 실행되지 않는 job과 artifact를 적어보세요.",
          "hint": "`release-bundle`이 없고 `needs` 조건 때문에 deploy가 열리지 않습니다."
        },
        "prediction": {
          "prompt": "build가 실패하면 deploy job은 어떻게 될까요?",
          "options": [
            { "id": "continue", "label": "실패한 artifact로 계속 진행" },
            { "id": "skip", "label": "needs 조건 때문에 실행하지 않음" },
            { "id": "verify", "label": "verify만 먼저 실행" }
          ],
          "answer": "skip",
          "explanation": "검증된 artifact가 없으므로 needs로 연결된 deploy와 verify는 시작되지 않아야 합니다."
        },
        "route": [
          "Push / workflow_dispatch",
          "build job",
          "Artifact",
          "deploy job",
          "verify job"
        ],
        "diagram": {
          "caption": "build job이 실패하면 artifact가 없고 needs gate가 deploy와 verify를 blocked 상태로 남깁니다.",
          "lanes": [
            {
              "id": "build-blocked",
              "label": "build 실패 → deploy 차단",
              "description": "처음 실패한 build step에서 원인 분석을 시작합니다.",
              "steps": [
                {
                  "from": "git-trigger",
                  "to": "github-actions",
                  "verb": "workflow 시작",
                  "payload": "push | workflow_dispatch",
                  "kind": "request",
                  "effect": {
                    "kind": "gate",
                    "subject": "workflow trigger",
                    "before": "GitHub Actions workflow는 event를 기다리는 상태",
                    "after": "push 또는 `workflow_dispatch` event가 build job을 시작함"
                  },
                  "evidenceScope": "code"
                },
                {
                  "from": "github-actions",
                  "to": "build-job",
                  "verb": "test와 build 실행",
                  "payload": "./gradlew test bootJar",
                  "kind": "call",
                  "effect": {
                    "kind": "verify",
                    "subject": "build gate",
                    "before": "trigger 뒤 release artifact 생성 가능 여부가 정해지지 않음",
                    "after": "test와 `bootJar` exit code가 build job의 pass·fail을 결정함"
                  },
                  "evidenceScope": "test"
                },
                {
                  "from": "build-job",
                  "to": "build-failure",
                  "verb": "첫 실패 기록",
                  "payload": "test 또는 bootJar failure",
                  "kind": "failure",
                  "check": "실패한 step과 log를 먼저 확인합니다.",
                  "effect": {
                    "kind": "gate",
                    "subject": "build job",
                    "before": "test 또는 `bootJar`가 non-zero exit code로 끝남",
                    "after": "`release-bundle`이 생기지 않고 deploy job은 skipped가 됨"
                  },
                  "evidenceScope": "test"
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "release-bundle",
              "reason": "build가 실패해 artifact를 업로드하지 못했습니다."
            },
            {
              "label": "deploy job",
              "reason": "needs: build 조건이 충족되지 않아 blocked 상태입니다."
            },
            {
              "label": "verify job",
              "reason": "deploy가 실행되지 않았으므로 검증도 시작되지 않습니다."
            }
          ]
        },
        "snapshot": [
          {
            "label": "첫 실패",
            "value": "build 실패 · deploy 차단",
            "tone": "blocked"
          },
          {
            "label": "Artifact",
            "value": "생성되지 않음",
            "tone": "blocked"
          }
        ],
        "evidence": "build와 test가 실패하면 artifact가 만들어지지 않고 `needs`로 연결된 다음 job은 진행되지 않아야 합니다.",
        "outcome": "처음 실패한 build step을 원인 분석의 출발점으로 삼습니다.",
        "stopAfter": 1
      },
      {
        "id": "pipeline-deploy-failed",
        "label": "원격 .env heredoc 미종료",
        "flowId": "workflow-step-responsibility",
        "tone": "blocked",
        "prompt": "현재 가이드와 완성 예시의 원격 `.env` 작성 구간에서 종료자 `ENV` 앞에 공백이 남습니다. shell이 실제로 실행하는 범위를 확인합니다.",
        "observationTitle": "들여쓰기된 ENV가 닫히지 않아 deploy 명령이 .env에 삼켜지는 경로",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "workflow job 상태와 실제 deploy script 실행을 분리하는 증거를 적어보세요.",
          "hint": "heredoc 종료자는 들여쓰기 없이 전달돼야 하며 job green만으로 원격 command 실행을 보장하지 않습니다."
        },
        "prediction": {
          "prompt": "들여쓰기된 `ENV` 뒤의 deploy command는 어떻게 처리될까요?",
          "options": [
            { "id": "build", "label": "정상적으로 별도 실행" },
            { "id": "deploy", "label": ".env 내용으로 소비되어 실행 안 됨" },
            { "id": "verify", "label": "자동으로 권한까지 강화" }
          ],
          "answer": "deploy",
          "explanation": "공백이 남은 `ENV`는 heredoc 종료자가 아닙니다. 뒤의 chmod와 deploy.sh 호출이 `.env` 입력으로 소비될 수 있어 실제 app 갱신이 재현되지 않습니다."
        },
        "route": [
          "build job",
          "Artifact",
          "deploy job",
          "cat > .env <<ENV",
          "들여쓰기된 ENV",
          "deploy.sh line swallowed"
        ],
        "diagram": {
          "caption": "artifact와 SSH 연결이 준비돼도 heredoc이 닫히지 않으면 뒤의 deploy.sh 줄이 `.env` 내용이 됩니다. SSH가 0으로 끝날 가능성도 있어 job 상태만으로 성공을 판정할 수 없습니다.",
          "lanes": [
            {
              "id": "deploy-blocked",
              "label": "artifact 전달 → 원격 shell parsing blocker",
              "description": "검증된 bundle이 있어도 원격 `.env` 생성 문법이 deploy script 실행보다 먼저 닫혀야 합니다.",
              "steps": [
                {
                  "from": "build-job",
                  "to": "release-bundle",
                  "verb": "artifact 업로드",
                  "payload": "release-bundle",
                  "kind": "transform",
                  "effect": {
                    "kind": "persist",
                    "subject": "`release-bundle`",
                    "before": "jar와 배포 파일이 build runner filesystem에만 있음",
                    "after": "Actions artifact storage에 `release-bundle`이 저장됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "release-bundle",
                  "to": "deploy-job",
                  "verb": "artifact 다운로드",
                  "payload": "needs: build passed",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "`release-bundle`",
                    "before": "deploy runner에는 build job의 release 파일이 없음",
                    "after": "build 성공 뒤 deploy runner에 `release-bundle`이 내려옴"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "deploy-job",
                  "to": "ec2-host",
                  "verb": "전송과 원격 실행",
                  "payload": "SCP + SSH",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "deployment bundle",
                    "before": "release 파일이 Actions runner에만 있음",
                    "after": "SCP로 EC2 release directory에 bundle이 복사되고 SSH command가 시작됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "ec2-host",
                  "to": "heredoc-boundary",
                  "verb": ".env 작성 시작",
                  "payload": "cat > .env <<ENV",
                  "kind": "config",
                  "effect": {
                    "kind": "transfer",
                    "subject": "원격 `.env` heredoc",
                    "before": "EC2 release directory에 운영 `.env`가 아직 완성되지 않음",
                    "after": "remote shell이 `ENV` 종료자를 기다리며 이후 줄을 `.env` 입력으로 읽음"
                  },
                  "evidenceScope": "code"
                },
                {
                  "from": "heredoc-boundary",
                  "to": "deploy-failure",
                  "verb": "들여쓰기된 종료자 무시",
                  "payload": "  ENV + chmod + deploy.sh lines",
                  "kind": "failure",
                  "check": "종료자를 들여쓰기 없이 전달하거나 `printf`로 바꾼 뒤 command trace를 확인합니다.",
                  "effect": {
                    "kind": "gate",
                    "subject": "remote deploy command",
                    "before": "`ENV` 앞 공백 때문에 heredoc이 닫히지 않음",
                    "after": "chmod와 deploy.sh 줄이 `.env` 내용으로 소비되어 app 갱신 command가 실행되지 않음"
                  },
                  "evidenceScope": "code"
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "scripts/deploy.sh 실행",
              "reason": "해당 줄이 닫히지 않은 `.env` heredoc 내용으로 소비됩니다."
            },
            {
              "label": "실제 app 갱신 증거",
              "reason": "SSH step이 0으로 끝날 수도 있으므로 job 상태와 별개로 command 실행이 확인되지 않습니다."
            }
          ]
        },
        "snapshot": [
          {
            "label": "Deploy",
            "value": "deploy.sh 실행 안 됨",
            "tone": "blocked"
          },
          {
            "label": "job 상태",
            "value": "green 가능 · 실제 배포 미확인",
            "tone": "blocked"
          }
        ],
        "evidence": "release 배치는 workflow의 SCP가 담당합니다. 현재 원격 heredoc은 deploy.sh 실행 줄을 `.env`에 포함할 수 있어 app image build와 Compose 갱신 증거가 없습니다.",
        "outcome": "job green 가능성과 실제 배포 성공을 분리하고 heredoc 종료 방식과 원격 command trace를 먼저 고칩니다.",
        "stopAfter": 3
      },
      {
        "id": "pipeline-verify-failed",
        "label": "deploy 후 HTTP 응답 없음",
        "flowId": "workflow-step-responsibility",
        "tone": "warning",
        "prompt": "app container 갱신 명령은 끝났지만 `curl --fail` HTTP 확인이 성공하지 않았습니다. 현재 상태를 예측합니다.",
        "observationTitle": "app 갱신 명령 뒤 health 증거가 없어 성공 판정이 멈추는 경로",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "deploy가 끝났어도 완료로 볼 수 없는 조건을 적어보세요.",
          "hint": "첫 실패한 ps, log, curl 항목과 runtime log를 연결하세요."
        },
        "prediction": {
          "prompt": "deploy는 끝났지만 HTTP 확인이 실패했습니다. 현재 상태는 무엇일까요?",
          "options": [
            { "id": "complete", "label": "배포 완료" },
            { "id": "rollback", "label": "자동 rollback 완료" },
            { "id": "unverified", "label": "갱신됐지만 정상 여부는 미확인" }
          ],
          "answer": "unverified",
          "explanation": "파일 전달과 container 갱신만으로 서비스 정상 상태를 보장하지 않습니다. verify 실패 증거를 해결해야 합니다."
        },
        "route": [
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job",
          "check-deploy.sh",
          "배포 성공 판정"
        ],
        "diagram": {
          "caption": "container 갱신이 끝나도 compose 상태, log, HTTP 증거 중 하나가 실패하면 배포 성공 판정을 보류합니다.",
          "lanes": [
            {
              "id": "verify-warning",
              "label": "deploy 통과 → verify 실패",
              "description": "deploy 완료와 서비스 정상 상태를 서로 다른 gate로 봅니다.",
              "steps": [
                {
                  "from": "release-bundle",
                  "to": "deploy-job",
                  "verb": "배포 입력 전달",
                  "payload": "release-bundle",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "`release-bundle`",
                    "before": "artifact storage에 검증된 bundle이 있음",
                    "after": "deploy job workspace에 같은 bundle이 복원됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "deploy-job",
                  "to": "app-container",
                  "verb": "app 갱신 완료",
                  "payload": "scripts/deploy.sh",
                  "kind": "transform",
                  "effect": {
                    "kind": "transform",
                    "subject": "app container",
                    "before": "deploy runner가 bundle을 EC2로 보냈지만 container 상태는 이전 값",
                    "after": "deploy script 종료 뒤 app container가 새 image를 가리킴"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "deploy-job",
                  "to": "verify-job",
                  "verb": "verify gate 개방",
                  "payload": "needs: deploy passed",
                  "kind": "call",
                  "effect": {
                    "kind": "gate",
                    "subject": "verify job",
                    "before": "deploy job이 끝나지 않아 verify job은 pending임",
                    "after": "deploy exit code 0 뒤 verify job이 runnable 상태가 됨"
                  },
                  "evidenceScope": "code"
                },
                {
                  "from": "verify-job",
                  "to": "verify-script",
                  "verb": "증거 수집",
                  "payload": "compose ps output + logs + curl --fail",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "runtime evidence",
                    "before": "app 갱신 명령만 끝나 HTTP 사용 가능 여부는 모름",
                    "after": "verify script가 ps output·startup log·`curl --fail` exit code를 모음"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "verify-failure",
                  "verb": "성공 판정 중단",
                  "payload": "docker command error or HTTP health check failure",
                  "kind": "failure",
                  "check": "실패한 첫 검증 항목과 runtime log를 연결합니다.",
                  "effect": {
                    "kind": "gate",
                    "subject": "verify job",
                    "before": "deploy는 통과했지만 ps·log·health 중 하나가 실패함",
                    "after": "첫 docker command error 또는 health failure에서 workflow가 failed가 됨"
                  },
                  "evidenceScope": "runtime"
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "Workflow success",
              "reason": "verify 증거가 모두 통과하지 않아 배포 완료로 확정하지 않습니다."
            }
          ]
        },
        "snapshot": [
          {
            "label": "Verify",
            "value": "compose · log · HTTP 증거 부족",
            "tone": "warning"
          },
          {
            "label": "배포 성공 판정",
            "value": "보류",
            "tone": "warning"
          }
        ],
        "evidence": "check-deploy.sh는 docker 명령 오류 없이 ps·log 출력을 보여주고, `curl --fail`이 성공해야 0으로 종료합니다. 로그 내용의 정상 여부를 자동 판정하지는 않습니다.",
        "outcome": "실행 파일 전달은 끝났지만 서비스 정상 여부가 확인되지 않았으므로 배포 완료로 보지 않습니다.",
        "stopAfter": 5
      }
    ]
  },
  "repo": {
    "name": "spring-boot-deployment-runtime-lab",
    "path": "spring-boot-deployment-runtime-lab"
  },
  "defaultSequence": "10",
  "actors": [
    {
      "id": "developer",
      "label": "개발자",
      "kind": "person"
    },
    {
      "id": "actions",
      "label": "GitHub Actions",
      "kind": "ci"
    },
    {
      "id": "build",
      "label": "Deploy Workflow",
      "kind": "ci"
    },
    {
      "id": "deploy",
      "label": "Upload/Deploy Steps",
      "kind": "ci"
    },
    {
      "id": "infra",
      "label": "EC2 Runtime",
      "kind": "infra"
    },
    {
      "id": "app",
      "label": "Running App",
      "kind": "server"
    }
  ],
  "flows": [
    {
      "id": "build-deploy-verify",
      "title": "test -> build -> upload -> deploy 흐름",
      "summary": "자동화의 핵심은 성공 경로뿐 아니라 실패하면 다음 단계로 넘어가지 않는 차단 경로입니다.",
      "mermaid": "sequenceDiagram\n  actor Developer\n  participant Build as build job\n  participant Deploy as deploy job\n  participant Verify as verify job\n  participant Server as Runtime server\n  Developer->>Build: push or workflow_dispatch\n  Build->>Build: test, bootJar, artifact upload\n  Build->>Deploy: release artifact\n  Deploy->>Server: deploy.sh\n  Deploy->>Verify: needs deploy\n  Verify->>Server: check-deploy.sh\n  Server-->>Verify: compose, log, HTTP result",
      "steps": [
        {
          "order": 1,
          "actor": "Developer",
          "input": "Push event",
          "owner": "GitHub Actions",
          "action": "workflow를 시작합니다.",
          "output": "Deploy workflow",
          "note": "자동화는 변경 이벤트를 기준으로 같은 순서를 반복합니다.",
          "id": "build-deploy-verify-step-1",
          "from": "Developer",
          "to": "GitHub Actions",
          "message": "workflow를 시작합니다.",
          "messageKind": "request",
          "problem": "Push event",
          "concept": "GitHub Actions",
          "check": "Deploy workflow",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "order": 2,
          "actor": "GitHub Actions",
          "input": "Source code",
          "owner": "Deploy workflow",
          "action": "test와 build를 실행합니다.",
          "output": "Artifact",
          "note": "build가 실패하면 deploy는 실행되지 않아야 합니다.",
          "id": "build-deploy-verify-step-2",
          "from": "GitHub Actions",
          "to": "Deploy workflow",
          "message": "test와 build를 실행합니다.",
          "messageKind": "request",
          "problem": "Source code",
          "concept": "Deploy workflow",
          "check": "Artifact",
          "codePointIds": [
            "inline-deploy-steps",
            "workflow-stages"
          ]
        },
        {
          "order": 3,
          "actor": "Deploy workflow",
          "input": "Artifact",
          "owner": "Upload and deploy steps",
          "action": "release bundle을 서버로 업로드하고 EC2 배포 명령을 실행합니다.",
          "output": "Restarted service",
          "note": "workflow는 원격 실행 순서를 조율합니다.",
          "id": "build-deploy-verify-step-3",
          "from": "Deploy workflow",
          "to": "Upload and deploy steps",
          "message": "release bundle을 서버로 업로드하고 EC2 배포 명령을 실행합니다.",
          "messageKind": "request",
          "problem": "Artifact",
          "concept": "Upload and deploy steps",
          "check": "Restarted service",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "order": 4,
          "actor": "Upload and deploy steps",
          "input": "Running service",
          "owner": "Log check step",
          "action": "compose 상태와 앱 로그로 배포 결과를 확인합니다.",
          "output": "Deployment result",
          "note": "verify 실패는 배포 실패로 봐야 합니다.",
          "id": "build-deploy-verify-step-4",
          "from": "Upload and deploy steps",
          "to": "Log check step",
          "message": "compose 상태와 앱 로그로 배포 결과를 확인합니다.",
          "messageKind": "response",
          "problem": "Running service",
          "concept": "Log check step",
          "check": "Deployment result",
          "codePointIds": [
            "inline-deploy-steps",
            "workflow-stages"
          ]
        }
      ],
      "bandKind": "scenario"
    },
    {
      "id": "workflow-step-responsibility",
      "title": "배포와 검증 script 책임 흐름",
      "summary": "이번 시퀀스는 workflow가 순서를 조율하고 deploy.sh와 check-deploy.sh가 서버 작업을 나눠 맡습니다.",
      "steps": [
        {
          "order": 1,
          "actor": "Workflow",
          "input": "Artifact and secrets",
          "owner": "deploy.sh",
          "action": "release 파일을 배치하고 애플리케이션 컨테이너를 갱신합니다.",
          "output": "Runtime update",
          "note": "workflow는 원격 실행을 조율하고 서버 재기동 책임은 deploy.sh에 둡니다.",
          "id": "workflow-step-responsibility-step-1",
          "from": "Workflow",
          "to": "deploy.sh",
          "message": "release 파일을 배치하고 애플리케이션 컨테이너를 갱신합니다.",
          "messageKind": "request",
          "problem": "Artifact and secrets",
          "concept": "deploy.sh",
          "check": "Runtime update",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "order": 2,
          "actor": "Workflow",
          "input": "Runtime endpoint",
          "owner": "check-deploy.sh",
          "action": "배포 후 compose 상태, 앱 로그, HTTP 응답을 확인합니다.",
          "output": "Pass or fail",
          "note": "배포 완료 기준은 명령 종료가 아니라 서비스 확인입니다.",
          "id": "workflow-step-responsibility-step-2",
          "from": "Workflow",
          "to": "check-deploy.sh",
          "message": "배포 후 compose 상태, 앱 로그, HTTP 응답을 확인합니다.",
          "messageKind": "request",
          "problem": "Runtime endpoint",
          "concept": "check-deploy.sh",
          "check": "Pass or fail",
          "codePointIds": [
            "inline-deploy-steps",
            "workflow-stages"
          ]
        },
        {
          "order": 3,
          "actor": "GitHub Actions",
          "input": "Step result",
          "owner": "Workflow status",
          "action": "실패한 step을 기준으로 전체 결과를 실패 처리합니다.",
          "output": "Action result",
          "note": "처음 실패한 단계가 원인 분석의 출발점입니다.",
          "id": "workflow-step-responsibility-step-3",
          "from": "GitHub Actions",
          "to": "Workflow status",
          "message": "실패한 step을 기준으로 전체 결과를 실패 처리합니다.",
          "messageKind": "error",
          "problem": "Step result",
          "concept": "Workflow status",
          "check": "Action result",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "id": "workflow-step-responsibility-check-4",
          "order": 4,
          "actor": "Workflow status",
          "owner": "확인 지점",
          "from": "Workflow status",
          "to": "확인 지점",
          "message": "결과와 실패 지점을 확인합니다.",
          "messageKind": "response",
          "problem": "구현 후 실제로 어느 지점이 통과했는지 확인해야 합니다.",
          "concept": "배포 결과 검증",
          "action": "문서의 확인 명령이나 화면에서 결과를 검증합니다.",
          "check": "성공 흐름과 실패 흐름을 말로 설명합니다.",
          "note": "Visual Lab은 코드를 대신 완성하지 않고 확인 지점을 고정합니다.",
          "codePointIds": [
            "inline-deploy-steps"
          ]
        }
      ],
      "bandKind": "scenario"
    }
  ],
  "flow": [
    {
      "id": "build-deploy-verify-step-1",
      "label": "GitHub Actions",
      "problem": "Push event",
      "concept": "GitHub Actions",
      "action": "workflow를 시작합니다.",
      "check": "Deploy workflow",
      "codePointIds": [
        "workflow-stages",
        "inline-deploy-steps"
      ]
    },
    {
      "id": "build-deploy-verify-step-2",
      "label": "Deploy workflow",
      "problem": "Source code",
      "concept": "Deploy workflow",
      "action": "test와 build를 실행합니다.",
      "check": "Artifact",
      "codePointIds": [
        "inline-deploy-steps",
        "workflow-stages"
      ]
    },
    {
      "id": "build-deploy-verify-step-3",
      "label": "Upload and deploy steps",
      "problem": "Artifact",
      "concept": "Upload and deploy steps",
      "action": "release bundle을 서버로 업로드하고 EC2 배포 명령을 실행합니다.",
      "check": "Restarted service",
      "codePointIds": [
        "workflow-stages",
        "inline-deploy-steps"
      ]
    },
    {
      "id": "build-deploy-verify-step-4",
      "label": "Log check step",
      "problem": "Running service",
      "concept": "Log check step",
      "action": "compose 상태와 앱 로그로 배포 결과를 확인합니다.",
      "check": "Deployment result",
      "codePointIds": [
        "inline-deploy-steps",
        "workflow-stages"
      ]
    }
  ],
  "codePoints": [
    {
      "id": "workflow-stages",
      "title": "실습 시작 workflow는 deploy가 build를 기다리는 뼈대를 제공합니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    env:\n      RELEASE_DIR: /home/${{ secrets.EC2_USERNAME }}/aandi-deployment-runtime-lab\n      APP_IMAGE: aandi-deployment-runtime-lab:latest\n    steps:\n      - name: Download release artifact\n        # TODO 4. build job이 올린 artifact를 다시 내려받으세요.",
      "explanation": "실습 시작 파일의 실제 발췌입니다. `needs: build`는 있지만 artifact download와 뒤의 원격 작업은 TODO라서 완성 pipeline 증거가 아닙니다.",
      "check": "TODO를 채운 실제 run에서 build 실패가 deploy를 막는지 확인합니다."
    },
    {
      "id": "inline-deploy-steps",
      "title": "현재 가이드의 들여쓰기된 ENV는 원격 deploy를 막습니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "            MYSQL_DATABASE=${{ secrets.PROD_MYSQL_DATABASE }}\n            MYSQL_ROOT_PASSWORD=${{ secrets.PROD_MYSQL_ROOT_PASSWORD }}\n            ENV\n            docker build -t ${APP_IMAGE} .\n            docker compose --env-file .env -f deploy/compose.prod.yaml up -d\n            docker compose --env-file .env -f deploy/compose.prod.yaml ps\n            docker logs --tail 50 aandi-app\n          EOF",
      "explanation": "현재 가이드 workflow의 실제 발췌입니다. YAML 공통 들여쓰기가 제거돼도 `ENV` 앞 공백이 남아 inner heredoc이 닫히지 않고 뒤 docker 명령이 `.env`로 소비될 수 있습니다.",
      "check": "들여쓰기 없는 종료자나 `printf` 방식으로 수정한 뒤 원격 command trace를 확인합니다."
    }
  ],
  "concepts": [
    {
      "title": "CI는 먼저 멈추는 장치입니다",
      "body": "빌드와 테스트가 실패하면 deploy 단계로 넘어가지 않게 합니다."
    },
    {
      "title": "CD는 검증된 산출물을 실행 환경으로 옮깁니다",
      "body": "배포는 파일 전달과 실행 전환, 상태 확인까지 포함합니다."
    },
    {
      "title": "Verify는 완료 기준입니다",
      "body": "서비스가 실제로 응답하는지 확인해야 배포 성공을 말할 수 있습니다."
    },
    {
      "title": "Secret은 workflow 입력입니다",
      "body": "Workflow YAML에는 `${{ secrets.* }}` 참조만 두지만 실행 시 실제 값은 EC2 `.env`에 기록됩니다. 현재 workflow는 이 파일 권한을 별도로 강화하지 않습니다."
    }
  ],
  "practice": [
    "build가 실패하면 deploy가 실행되지 않아야 하는 이유를 설명할 수 있나요?",
    "artifact가 workflow 단계 사이에서 어떤 역할을 하는지 말할 수 있나요?",
    "release bundle이 서버로 전달되는 이유를 설명할 수 있나요?",
    "배포 후 compose 상태와 앱 로그를 확인해야 하는 이유를 말할 수 있나요?"
  ],
  "mentorHints": [],
  "relatedDocs": [],
  "relatedCode": [],
  "topic": "Automation and operations flow",
  "question": "한 번 성공한 배포 흐름을 어떻게 반복 가능하고 실패에 강하게 만들까?",
  "source": {
    "theory": "../../../theory.md",
    "implementation": "../../../implementation.md",
    "checklist": "../../../checklist.md"
  },
  "why": {
    "problem": "사람이 매번 같은 배포 명령을 손으로 반복하면 순서가 흔들리고 실패 기준이 누락될 수 있습니다.",
    "limits": [
      "build 실패 후 deploy가 이어지면 실패 원인이 더 커집니다.",
      "deploy 명령만 자동화하고 verify를 빼면 서비스 정상 여부를 확인하지 못합니다.",
      "workflow step의 책임이 흐려지면 실패 지점을 읽기 어려워집니다."
    ],
    "choice": "workflow는 test/build, bundle, upload, EC2 deploy, 로그 확인을 step 순서로 고정합니다."
  },
  "overview": [
    "Push",
    "GitHub Actions",
    "Test",
    "Build",
    "Artifact",
    "Upload",
    "EC2 Deploy",
    "Log Check"
  ],
  "responsibilities": [
    {
      "name": "CI workflow",
      "role": "build와 test 기준을 자동으로 확인합니다.",
      "caution": "검증 없이 deploy로 넘어가지 않습니다."
    },
    {
      "name": "Artifact",
      "role": "검증된 빌드 결과물을 다음 단계로 전달합니다.",
      "caution": "source와 실행 산출물을 혼동하지 않습니다."
    },
    {
      "name": "Upload/Deploy steps",
      "role": "release bundle 업로드와 EC2 배포 명령을 실행합니다.",
      "caution": "업로드와 재기동 순서를 바꾸지 않습니다."
    },
    {
      "name": "Log check step",
      "role": "배포 후 compose 상태와 앱 로그를 확인합니다.",
      "caution": "로그 확인을 생략하면 실패한 배포를 놓칠 수 있습니다."
    }
  ],
  "glossary": [
    {
      "term": "CI",
      "meaning": "변경된 코드가 빌드되고 테스트되는지 자동으로 확인하는 흐름입니다.",
      "caution": "실패 후 deploy가 이어지면 안 됩니다."
    },
    {
      "term": "CD",
      "meaning": "검증된 결과물을 실행 환경으로 전달하고 배포하는 흐름입니다.",
      "caution": "전달만으로 서비스 정상 여부가 보장되지는 않습니다."
    },
    {
      "term": "Artifact",
      "meaning": "build job이 만든 배포 가능한 산출물입니다.",
      "caution": "source code와 실행 파일을 구분해야 합니다."
    },
    {
      "term": "Verify",
      "meaning": "배포 후 서비스 상태와 로그를 확인하는 단계입니다.",
      "caution": "컨테이너 상태와 로그를 함께 봅니다."
    },
    {
      "term": "Secret",
      "meaning": "repository의 `${{ secrets.* }}` 참조가 실행 시 실제 값으로 펼쳐져 원격 `.env`에 기록되는 민감한 설정입니다.",
      "caution": "YAML에 참조만 있다는 사실은 EC2 `.env` 권한 보호를 뜻하지 않습니다. 현재 workflow에는 별도 chmod·chown·umask가 없습니다."
    }
  ],
  "practical": [
    {
      "title": "실패 차단이 자동화의 핵심입니다",
      "body": "성공 경로를 빠르게 만드는 것보다 실패 후 다음 단계로 넘어가지 않는 것이 더 중요합니다."
    },
    {
      "title": "workflow와 script 책임을 분리합니다",
      "body": "workflow는 job 순서를 조율하고 deploy.sh와 check-deploy.sh는 서버 갱신과 검증을 각각 맡습니다."
    },
    {
      "title": "verify 없는 deploy는 완료가 아닙니다",
      "body": "프로세스가 올라왔는지, compose 상태와 앱 로그가 정상인지 확인해야 운영 흐름이 끝납니다."
    }
  ],
  "checks": [
    "build가 실패하면 deploy가 실행되지 않아야 하는 이유를 설명할 수 있나요?",
    "artifact가 workflow 단계 사이에서 어떤 역할을 하는지 말할 수 있나요?",
    "release bundle이 서버로 전달되는 이유를 설명할 수 있나요?",
    "배포 후 compose 상태와 앱 로그를 확인해야 하는 이유를 말할 수 있나요?"
  ],
  "next": {
    "id": "11",
    "title": "Refactoring Foundation",
    "reason": "자동화가 변경 후 동작을 확인해주기 시작하면, 다음에는 코드 구조를 작게 정리하며 테스트로 동작 보존을 확인합니다."
  },
  "sourceDocs": []
};

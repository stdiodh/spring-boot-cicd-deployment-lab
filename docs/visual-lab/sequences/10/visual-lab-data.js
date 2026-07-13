window.visualLabData = {
  "kind": "sequence",
  "sequence": "10",
  "title": "CI/CD Deployment",
  "subtitle": "Automation and operations flow",
  "goal": "build, deploy, verify job과 artifact 전달, 배포/검증 스크립트의 책임을 이해합니다.",
  "problem": "사람이 매번 같은 배포 명령을 손으로 반복하면 순서가 흔들리고 실패 기준이 누락될 수 있습니다.",
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
          "note": "로그 확인 단계에서 이상이 보이면 배포 결과를 다시 확인해야 합니다.",
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
      "title": "workflow step 책임 흐름",
      "summary": "현재 기준은 별도 script 없이 workflow step이 빌드, 업로드, 서버 명령, 로그 확인을 순서대로 맡습니다.",
      "steps": [
        {
          "order": 1,
          "actor": "Workflow",
          "input": "Artifact and secrets",
          "owner": "Upload and deploy steps",
          "action": "서버에서 필요한 파일 배치와 재시작 명령을 실행합니다.",
          "output": "Runtime update",
          "note": "현재 레포는 별도 script 파일 대신 workflow step 안에서 서버 명령을 실행합니다.",
          "id": "workflow-step-responsibility-step-1",
          "from": "Workflow",
          "to": "Upload and deploy steps",
          "message": "서버에서 필요한 파일 배치와 재시작 명령을 실행합니다.",
          "messageKind": "request",
          "problem": "Artifact and secrets",
          "concept": "Upload and deploy steps",
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
          "owner": "Log check step",
          "action": "배포 후 compose 상태와 앱 로그를 확인합니다.",
          "output": "Pass or fail",
          "note": "배포 완료 기준은 명령 종료가 아니라 서비스 확인입니다.",
          "id": "workflow-step-responsibility-step-2",
          "from": "Workflow",
          "to": "Log check step",
          "message": "배포 후 compose 상태와 앱 로그를 확인합니다.",
          "messageKind": "request",
          "problem": "Runtime endpoint",
          "concept": "Log check step",
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
          "concept": "Verification",
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
      "title": "Workflow는 build, deploy, verify 책임을 분리합니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "jobs:\n  build:\n    steps:\n      - run: ./gradlew test bootJar\n      - uses: actions/upload-artifact@v4\n  deploy:\n    needs: build\n    steps:\n      - uses: actions/download-artifact@v4\n      - run: bash scripts/deploy.sh\n  verify:\n    needs: deploy\n    steps:\n      - run: bash scripts/check-deploy.sh",
      "explanation": "완성 workflow는 build 산출물을 artifact로 넘기고 deploy와 verify를 `needs`로 연결해 실패 경계를 분리합니다.",
      "check": "실패한 step 이후 작업이 실행되지 않는지 확인합니다."
    },
    {
      "id": "inline-deploy-steps",
      "title": "Deploy on EC2 step이 서버 명령과 로그 확인을 묶습니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "- name: Deploy on EC2\n  run: APP_IMAGE=${APP_IMAGE} bash scripts/deploy.sh ${RELEASE_DIR}\n\n- name: Verify deployment on EC2\n  run: bash scripts/check-deploy.sh ${RELEASE_DIR}",
      "explanation": "현재 레포는 별도 script 파일 없이 workflow step에서 EC2 명령과 로그 확인을 실행합니다.",
      "check": "배포 실패 시 어떤 step 로그를 먼저 볼지 확인합니다."
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
      "body": "서버 접속 정보와 민감한 값은 코드가 아니라 안전한 저장소에서 주입합니다."
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
  "sequences": [
    {
      "id": "10",
      "title": "CI/CD Deployment",
      "topic": "Automation and operations flow",
      "question": "한 번 성공한 배포 흐름을 어떻게 반복 가능하고 실패에 강하게 만들까?",
      "goal": "build, deploy, verify job과 artifact 전달, 배포/검증 스크립트의 책임을 이해합니다.",
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
          "title": "workflow step 책임 흐름",
          "summary": "현재 기준은 별도 script 없이 workflow step이 빌드, 업로드, 서버 명령, 로그 확인을 순서대로 맡습니다.",
          "steps": [
            {
              "order": 1,
              "actor": "Workflow",
              "input": "Artifact and secrets",
              "owner": "Upload and deploy steps",
              "action": "서버에서 필요한 파일 배치와 재시작 명령을 실행합니다.",
              "output": "Runtime update",
              "note": "현재 레포는 별도 script 파일 대신 workflow step 안에서 서버 명령을 실행합니다.",
              "id": "workflow-step-responsibility-step-1",
              "from": "Workflow",
              "to": "Upload and deploy steps",
              "message": "서버에서 필요한 파일 배치와 재시작 명령을 실행합니다.",
              "messageKind": "request",
              "problem": "Artifact and secrets",
              "concept": "Upload and deploy steps",
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
              "owner": "Log check step",
              "action": "배포 후 compose 상태와 앱 로그를 확인합니다.",
              "output": "Pass or fail",
              "note": "배포 완료 기준은 명령 종료가 아니라 서비스 확인입니다.",
              "id": "workflow-step-responsibility-step-2",
              "from": "Workflow",
              "to": "Log check step",
              "message": "배포 후 compose 상태와 앱 로그를 확인합니다.",
              "messageKind": "request",
              "problem": "Runtime endpoint",
              "concept": "Log check step",
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
              "concept": "Verification",
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
          "body": "서버 접속 정보와 민감한 값은 코드가 아니라 안전한 저장소에서 주입합니다."
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
          "meaning": "workflow가 안전하게 주입받는 민감한 설정 값입니다.",
          "caution": "로그나 저장소 파일에 실제 값을 남기지 않습니다."
        }
      ],
      "practical": [
        {
          "title": "실패 차단이 자동화의 핵심입니다",
          "body": "성공 경로를 빠르게 만드는 것보다 실패 후 다음 단계로 넘어가지 않는 것이 더 중요합니다."
        },
        {
          "title": "workflow step 순서를 고정합니다",
          "body": "현재 기준은 별도 script 없이 workflow step 안에서 서버 명령과 로그 확인을 실행합니다."
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
      "sourceDocs": [],
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
      "codePoints": [
        {
          "id": "workflow-stages",
          "title": "Workflow는 build, deploy, verify 책임을 분리합니다",
          "file": ".github/workflows/deploy.yml",
          "language": "yaml",
          "snippet": "jobs:\n  build:\n    steps:\n      - run: ./gradlew test bootJar\n      - uses: actions/upload-artifact@v4\n  deploy:\n    needs: build\n    steps:\n      - uses: actions/download-artifact@v4\n      - run: bash scripts/deploy.sh\n  verify:\n    needs: deploy\n    steps:\n      - run: bash scripts/check-deploy.sh",
          "explanation": "완성 workflow는 build 산출물을 artifact로 넘기고 deploy와 verify를 `needs`로 연결해 실패 경계를 분리합니다.",
          "check": "실패한 step 이후 작업이 실행되지 않는지 확인합니다."
        },
        {
          "id": "inline-deploy-steps",
          "title": "Deploy on EC2 step이 서버 명령과 로그 확인을 묶습니다",
          "file": ".github/workflows/deploy.yml",
          "language": "yaml",
          "snippet": "- name: Deploy on EC2\n  run: APP_IMAGE=${APP_IMAGE} bash scripts/deploy.sh ${RELEASE_DIR}\n\n- name: Verify deployment on EC2\n  run: bash scripts/check-deploy.sh ${RELEASE_DIR}",
          "explanation": "현재 레포는 별도 script 파일 없이 workflow step에서 EC2 명령과 로그 확인을 실행합니다.",
          "check": "배포 실패 시 어떤 step 로그를 먼저 볼지 확인합니다."
        }
      ],
      "problem": "사람이 매번 같은 배포 명령을 손으로 반복하면 순서가 흔들리고 실패 기준이 누락될 수 있습니다."
    }
  ]
};

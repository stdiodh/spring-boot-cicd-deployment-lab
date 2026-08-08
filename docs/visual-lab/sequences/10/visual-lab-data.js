window.visualLabData = {
  "kind": "sequence",
  "sequence": "10",
  "title": "CI/CD + HTTPS Deployment",
  "subtitle": "Main deployment, TLS transition, and rollback",
  "goal": "main의 정확한 GITHUB_SHA가 하나의 SHA image와 HTTPS 진입점으로 이어질 때 첫 실패 gate와 최종 성공 증거를 구분합니다.",
  "problem": "이미지 게시와 원격 명령이 끝나도 DNS, 인증서, proxy, 실행 revision과 외부 HTTPS 응답이 맞지 않으면 운영 배포는 완료가 아닙니다.",
  "workbench": {
    "kind": "pipeline",
    "title": "HTTPS 릴리스의 첫 실패 게이트",
    "instruction": "main ref, DNS·80, 인증서와 새 app 상태를 바꾸며 어디에서 멈추고 무엇이 보존되는지 먼저 예상하세요.",
    "visual": {
      "src": "../../assets/icons/pipeline.svg",
      "alt": "main ref, exact GITHUB_SHA image, DNS와 HTTPS 검증을 잇는 pipeline gate 아이콘",
      "caption": "main 배포는 현재 origin/main과 같은 GITHUB_SHA를 한 개의 image와 staging bundle로 고정하고, DNS·HTTP-01·Nginx·외부 readiness gate를 차례로 통과합니다."
    },
    "terms": [
      {
        "term": "main revision gate",
        "meaning": "배포 직전 GITHUB_SHA가 현재 origin/main의 40자리 commit SHA와 정확히 같은지 확인하는 조건"
      },
      {
        "term": "exact SHA image",
        "meaning": "40자리 commit SHA를 Docker image tag와 revision label에 함께 기록한 image이며 Git tag가 아님"
      },
      {
        "term": "staging bundle",
        "meaning": "현재 runtime을 바꾸기 전에 `.deploy-next`와 `.env.next`에서 검증하는 배포 파일 묶음"
      },
      {
        "term": "HTTP-01",
        "meaning": "인증기관이 도메인의 80번 HTTP 경로에서 token을 읽어 소유권을 확인하는 방식"
      },
      {
        "term": "reverse proxy",
        "meaning": "외부 TLS 요청을 종료하고 Docker network의 `app:8080`으로 전달하는 Nginx 책임"
      },
      {
        "term": "rollback",
        "meaning": "새 release 검증 실패 시 보존한 env, bundle과 image로 이전 runtime을 되살리는 작업"
      },
      {
        "term": "workflow dispatch",
        "meaning": "fork의 최초 설정 뒤 main ref를 명시해 같은 배포 gate를 수동으로 시작하는 GitHub Actions 입력"
      }
    ],
    "comparison": {
      "label": "PR CI와 main CD",
      "left": {
        "title": "main 대상 pull request",
        "body": "test와 bootJar만 실행하며 Docker Hub 게시, SSH와 운영 runtime 변경은 시작하지 않습니다."
      },
      "right": {
        "title": "main push 또는 수동 실행",
        "body": "현재 origin/main과 같은 GITHUB_SHA만 게시·배포하며 Nginx 80·443을 공개하고 app 8080은 Docker network 안에 둡니다."
      }
    },
    "nodes": {
      "release-operator": {
        "label": "Repository maintainer",
        "icon": "person",
        "kind": "release trigger",
        "role": "검토된 main push 또는 main ref 수동 배포와 인프라 준비",
        "boundary": "Main event",
        "systemLayer": "outside"
      },
      "publish-job": {
        "label": "Publish job",
        "icon": "pipeline",
        "kind": "release gate",
        "role": "main ref·GITHUB_SHA 검증, test·bootJar와 image 게시",
        "boundary": "GitHub Actions",
        "systemLayer": "runtime",
        "codePointIds": [
          "main-trigger"
        ]
      },
      "image-registry": {
        "label": "Docker Hub",
        "icon": "external",
        "kind": "image registry",
        "role": "exact SHA image 한 개만 보관",
        "boundary": "Registry",
        "systemLayer": "integration"
      },
      "deploy-job": {
        "label": "Deploy job",
        "icon": "pipeline",
        "kind": "production gate",
        "role": "runtime env 검증, DNS 확인과 EC2 staging 조율",
        "boundary": "GitHub production",
        "systemLayer": "runtime",
        "codePointIds": [
          "dns-gate",
          "staging-validation"
        ]
      },
      "staged-release": {
        "label": ".deploy-next",
        "icon": "artifact",
        "kind": "staged deployment artifact",
        "role": "Compose, Nginx, scripts와 `.env.next`를 현재 runtime과 격리",
        "boundary": "Staging boundary",
        "systemLayer": "runtime",
        "codePointIds": [
          "staging-validation"
        ]
      },
      "dns-service": {
        "label": "DNS resolver",
        "icon": "external",
        "kind": "name resolution service",
        "role": "운영 도메인의 IPv4와 EC2 target 일치 여부 제공",
        "boundary": "Public DNS",
        "systemLayer": "integration",
        "codePointIds": [
          "dns-gate"
        ]
      },
      "ec2-host": {
        "label": "EC2 host",
        "icon": "host",
        "kind": "runtime host",
        "role": "현재 bundle과 새 staging bundle을 분리해 보관",
        "boundary": "Remote runtime",
        "systemLayer": "runtime"
      },
      "deploy-script": {
        "label": "deploy.sh",
        "icon": "tool",
        "kind": "deployment script",
        "role": "상태 서비스 보존, 인증서 준비와 app image 교체",
        "boundary": "Runtime transition",
        "systemLayer": "runtime",
        "codePointIds": [
          "certificate-bootstrap"
        ]
      },
      "nginx-http": {
        "label": "Nginx :80",
        "icon": "api",
        "kind": "HTTP challenge endpoint",
        "role": "webroot token 공개 후 일반 요청은 HTTPS로 전환",
        "boundary": "Public HTTP",
        "systemLayer": "interface",
        "codePointIds": [
          "certificate-bootstrap"
        ]
      },
      "acme-ca": {
        "label": "ACME CA",
        "icon": "external",
        "kind": "certificate authority",
        "role": "도메인의 HTTP-01 token을 외부 80에서 확인",
        "boundary": "Certificate trust",
        "systemLayer": "integration"
      },
      "certbot": {
        "label": "Certbot",
        "icon": "security",
        "kind": "certificate client",
        "role": "최초 발급과 주기적 갱신 수행",
        "boundary": "ACME client",
        "systemLayer": "integration",
        "codePointIds": [
          "certificate-bootstrap"
        ]
      },
      "certificate-volume": {
        "label": "letsencrypt volume",
        "icon": "config",
        "kind": "certificate state",
        "role": "fullchain과 private key를 app release와 별도로 보존",
        "boundary": "Persistent TLS state",
        "systemLayer": "resource"
      },
      "nginx-https": {
        "label": "Nginx :443",
        "icon": "api",
        "kind": "TLS reverse proxy",
        "role": "TLS 종료, forwarded·WebSocket header와 app proxy",
        "boundary": "Public HTTPS",
        "systemLayer": "interface",
        "codePointIds": [
          "https-proxy"
        ]
      },
      "app-container": {
        "label": "Spring Boot app",
        "icon": "runtime",
        "kind": "application runtime",
        "role": "Docker network의 8080에서 exact SHA image 실행",
        "boundary": "Container runtime",
        "systemLayer": "runtime"
      },
      "state-services": {
        "label": "MySQL · Redis",
        "icon": "database",
        "kind": "state services",
        "role": "재배포 중 container와 MySQL named volume 보존",
        "boundary": "Persistent runtime",
        "systemLayer": "resource"
      },
      "verify-job": {
        "label": "Verify job",
        "icon": "pipeline",
        "kind": "deployment verification gate",
        "role": "원격 검증과 외부 HTTPS readiness 실행",
        "boundary": "GitHub Actions",
        "systemLayer": "runtime",
        "codePointIds": [
          "verify-and-rollback"
        ]
      },
      "verify-script": {
        "label": "check-deploy.sh",
        "icon": "test",
        "kind": "runtime verifier",
        "role": "health, image, revision, redirect와 TLS readiness 판정",
        "boundary": "Runtime evidence",
        "systemLayer": "runtime",
        "codePointIds": [
          "verify-and-rollback"
        ]
      },
      "external-client": {
        "label": "Actions runner",
        "icon": "client",
        "kind": "external HTTPS client",
        "role": "EC2 밖에서 인증서 검증을 켠 readiness 요청",
        "boundary": "External network",
        "systemLayer": "outside"
      },
      "security-group": {
        "label": "EC2 Security Group",
        "icon": "security",
        "kind": "network access policy",
        "role": "외부 80·443만 공개하고 app 8080은 차단",
        "boundary": "Public ingress",
        "systemLayer": "runtime"
      },
      "previous-release": {
        "label": "Previous runtime",
        "icon": "runtime",
        "kind": "rollback target",
        "role": "보존된 env, bundle과 image로 이전 서비스 복구",
        "boundary": "Rollback boundary",
        "systemLayer": "runtime",
        "codePointIds": [
          "verify-and-rollback"
        ]
      },
      "dns-failure": {
        "label": "DNS gate failure",
        "icon": "evidence",
        "kind": "DNS failure gate",
        "role": "A record 불일치 또는 IPv6 설정을 첫 실패로 기록",
        "boundary": "Before SSH",
        "systemLayer": "runtime",
        "codePointIds": [
          "dns-gate"
        ]
      },
      "acme-failure": {
        "label": "HTTP-01 failure",
        "icon": "evidence",
        "kind": "certificate failure gate",
        "role": "외부 80에서 challenge token을 읽지 못한 상태",
        "boundary": "Before app update",
        "systemLayer": "integration",
        "codePointIds": [
          "certificate-bootstrap"
        ]
      },
      "runtime-failure": {
        "label": "Runtime verify failure",
        "icon": "evidence",
        "kind": "deployment failure gate",
        "role": "새 image 또는 HTTPS readiness 불일치를 rollback 입력으로 전달",
        "boundary": "After app update",
        "systemLayer": "runtime",
        "codePointIds": [
          "verify-and-rollback"
        ]
      },
      "workflow-result": {
        "label": "Workflow result",
        "icon": "evidence",
        "kind": "release decision",
        "role": "새 release의 최종 성공 또는 실패 기록",
        "boundary": "Deployment result",
        "systemLayer": "runtime"
      }
    },
    "scenarios": [
      {
        "id": "fresh-https-release",
        "label": "main 반영 · DNS/80 준비",
        "flowId": "release-to-https",
        "tone": "recovered",
        "prompt": "인증서는 아직 없고 운영 도메인의 IPv4와 외부 80·443이 새 EC2를 향합니다. 검토된 commit을 main에 반영해 배포 workflow가 시작됐습니다.",
        "observationTitle": "main부터 외부 HTTPS까지의 세 gate",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "image 게시와 HTTPS 배포 성공을 가르는 마지막 증거를 자기 말로 적어보세요.",
          "hint": "EC2 밖의 TLS 요청과 실행 image·revision을 함께 봅니다."
        },
        "prediction": {
          "prompt": "어느 증거까지 확인해야 새 release를 성공으로 기록할 수 있을까요?",
          "options": [
            {
              "id": "published",
              "label": "SHA image가 registry에 게시됨"
            },
            {
              "id": "proxied",
              "label": "Nginx가 443에서 시작됨"
            },
            {
              "id": "externally-ready",
              "label": "exact revision과 외부 HTTPS readiness가 모두 맞음"
            }
          ],
          "answer": "externally-ready",
          "explanation": "image와 Nginx 기동은 중간 상태입니다. 실행 image·revision과 인증서를 검증하는 외부 HTTPS readiness가 모두 맞아야 합니다."
        },
        "route": [
          "main ref · GITHUB_SHA",
          "Publish job",
          "Exact SHA image",
          ".deploy-next",
          "DNS · HTTP-01",
          "Nginx :443",
          "External HTTPS readiness",
          "Workflow success"
        ],
        "diagram": {
          "caption": "현재 origin/main과 같은 GITHUB_SHA가 exact SHA image와 staging bundle로 고정되고, 외부 HTTPS readiness까지 통과해야 workflow가 성공합니다.",
          "lanes": [
            {
              "id": "release-path",
              "label": "Release · main → SHA → staging",
              "description": "source revision을 image와 EC2의 격리된 배포 입력으로 고정합니다.",
              "nextLaneIds": [
                "https-transition",
                "verify-success"
              ],
              "steps": [
                {
                  "from": "release-operator",
                  "to": "publish-job",
                  "verb": "main 배포 시작",
                  "payload": "refs/heads/main · GITHUB_SHA",
                  "kind": "request",
                  "effect": {
                    "kind": "transfer",
                    "subject": "배포 branch ref",
                    "before": "main 반영 또는 수동 실행 전",
                    "after": "workflow가 main ref와 event의 GITHUB_SHA를 읽음"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "main-trigger"
                  ]
                },
                {
                  "from": "publish-job",
                  "to": "publish-job",
                  "verb": "main revision gate 판정",
                  "payload": "refs/heads/main · GITHUB_SHA · origin/main",
                  "kind": "compare",
                  "concept": "현재 main source revision 고정",
                  "effect": {
                    "kind": "gate",
                    "subject": "deployment SHA output",
                    "before": "event SHA가 현재 원격 main과 같은지 판정되지 않음",
                    "after": "GITHUB_SHA와 origin/main이 같은 40자리 commit SHA로 확인됨"
                  },
                  "evidenceScope": "code",
                  "codePointIds": [
                    "main-trigger"
                  ]
                },
                {
                  "from": "publish-job",
                  "to": "image-registry",
                  "verb": "test·build·push",
                  "payload": ":40자리 SHA image 하나",
                  "kind": "persist",
                  "effect": {
                    "kind": "persist",
                    "subject": "registry image",
                    "before": "이번 commit의 배포 image가 registry에 없음",
                    "after": "GITHUB_SHA Docker tag와 같은 revision label을 가진 image 하나가 게시됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "publish-job",
                  "to": "deploy-job",
                  "verb": "production gate 개방",
                  "payload": "needs: publish · GITHUB_SHA",
                  "kind": "call",
                  "effect": {
                    "kind": "gate",
                    "subject": "deploy job",
                    "before": "publish 결과가 없어 production job은 pending임",
                    "after": "SHA image 게시 뒤 deploy job이 exact image reference를 조립함"
                  },
                  "evidenceScope": "code"
                },
                {
                  "from": "deploy-job",
                  "to": "staged-release",
                  "verb": "배포 입력 staging",
                  "payload": "Compose · Nginx templates · scripts · .env.next",
                  "kind": "persist",
                  "effect": {
                    "kind": "persist",
                    "subject": "EC2 staging directory",
                    "before": "EC2에는 현재 bundle과 runtime `.env`만 있음",
                    "after": "새 파일이 `.deploy-next`와 mode 600 `.env.next`에 격리됨"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "staging-validation"
                  ]
                },
                {
                  "from": "staged-release",
                  "to": "deploy-script",
                  "verb": "검증 후 복구 가능한 설치",
                  "payload": "compose config + previous snapshot + env swap",
                  "kind": "transform",
                  "effect": {
                    "kind": "preserve",
                    "subject": "현재와 이전 배포 bundle",
                    "before": "새 Compose 입력은 staging에 있고 현재 runtime은 그대로임",
                    "after": "config 통과 파일만 설치되고 이전 env·bundle은 rollback용으로 보존됨"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "staging-validation"
                  ]
                },
                {
                  "from": "deploy-script",
                  "to": "app-container",
                  "verb": "exact image 교체",
                  "payload": "pull app + up --no-deps --force-recreate",
                  "kind": "transform",
                  "effect": {
                    "kind": "transform",
                    "subject": "aandi-app container",
                    "before": "container가 이전 image reference를 실행함",
                    "after": "container가 요청한 40자리 SHA image와 revision label을 실행함"
                  },
                  "evidenceScope": "runtime"
                }
              ]
            },
            {
              "id": "https-transition",
              "label": "HTTPS transition · DNS → ACME → proxy",
              "description": "도메인 소유권과 인증서 상태를 app image 교체와 분리해 확인합니다.",
              "nextLaneIds": [
                "verify-success"
              ],
              "steps": [
                {
                  "from": "deploy-job",
                  "to": "dns-service",
                  "verb": "도메인 target 확인",
                  "payload": "PROD_DOMAIN A/AAAA ↔ EC2_HOST IPv4",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "운영 DNS 집합",
                    "before": "도메인이 배포 EC2와 같은 주소인지 확인되지 않음",
                    "after": "A record 전체가 EC2 IPv4와 같고 AAAA record가 없음을 확인함"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "dns-gate"
                  ]
                },
                {
                  "from": "deploy-script",
                  "to": "nginx-http",
                  "verb": "challenge endpoint 시작",
                  "payload": "http.conf.template · port 80 · webroot volume",
                  "kind": "config",
                  "effect": {
                    "kind": "transform",
                    "subject": "Nginx bootstrap config",
                    "before": "사용 가능한 인증서와 HTTP-01 endpoint가 없음",
                    "after": "80번에서 challenge path만 제공하고 일반 요청은 503으로 닫힘"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "certificate-bootstrap"
                  ]
                },
                {
                  "from": "certbot",
                  "to": "acme-ca",
                  "verb": "인증서 요청",
                  "payload": "domain · email · webroot HTTP-01",
                  "kind": "request",
                  "effect": {
                    "kind": "transfer",
                    "subject": "ACME order",
                    "before": "해당 도메인의 발급 order가 없음",
                    "after": "인증기관이 도메인과 challenge token을 검증 대상으로 가짐"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "certificate-bootstrap"
                  ]
                },
                {
                  "from": "acme-ca",
                  "to": "nginx-http",
                  "verb": "HTTP-01 token 조회",
                  "payload": "GET /.well-known/acme-challenge/<token> :80",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "도메인 소유권 증거",
                    "before": "인증기관이 token 내용을 읽지 못한 상태",
                    "after": "공개 DNS와 80번 경로를 통해 webroot token이 일치함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "certbot",
                  "to": "certificate-volume",
                  "verb": "인증서 저장",
                  "payload": "fullchain.pem + privkey.pem",
                  "kind": "persist",
                  "effect": {
                    "kind": "persist",
                    "subject": "letsencrypt named volume",
                    "before": "도메인 certificate 파일이 없음",
                    "after": "24시간 이상 유효한 fullchain과 private key가 persistent volume에 있음"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "certificate-bootstrap"
                  ]
                },
                {
                  "from": "certificate-volume",
                  "to": "nginx-https",
                  "verb": "TLS config 활성화",
                  "payload": "https.conf.template · certificate read-only mount",
                  "kind": "config",
                  "effect": {
                    "kind": "transform",
                    "subject": "공개 진입점",
                    "before": "80번 challenge endpoint만 실행 중임",
                    "after": "80은 HTTPS로 이동하고 443은 도메인 인증서로 TLS를 종료함"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "https-proxy"
                  ]
                },
                {
                  "from": "nginx-https",
                  "to": "app-container",
                  "verb": "HTTPS 요청 proxy",
                  "payload": "Host · X-Forwarded-* · WebSocket upgrade",
                  "kind": "request",
                  "effect": {
                    "kind": "transfer",
                    "subject": "외부 요청 위치",
                    "before": "client 요청은 Nginx 443에서 TLS 종료됨",
                    "after": "같은 요청이 Docker network의 `app:8080`에 forwarded header와 함께 도착함"
                  },
                  "evidenceScope": "code",
                  "codePointIds": [
                    "https-proxy"
                  ]
                }
              ]
            },
            {
              "id": "verify-success",
              "label": "Verify + decision · runtime → external HTTPS",
              "description": "컨테이너 명령 종료가 아니라 실행 identity와 외부 TLS 응답을 최종 증거로 사용합니다.",
              "steps": [
                {
                  "from": "verify-job",
                  "to": "verify-script",
                  "verb": "원격 검증 실행",
                  "payload": "expected image · GITHUB_SHA · domain",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "배포 기대값",
                    "before": "deploy job은 끝났지만 실행 상태가 판정되지 않음",
                    "after": "검증 script가 exact image, revision과 domain을 입력으로 받음"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "verify-and-rollback"
                  ]
                },
                {
                  "from": "verify-script",
                  "to": "state-services",
                  "verb": "상태 서비스 health 확인",
                  "payload": "mysql healthy + redis healthy",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "Compose state services",
                    "before": "MySQL과 Redis의 health status를 모름",
                    "after": "두 service 모두 Docker health `healthy`임"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "app-container",
                  "verb": "실행 identity 확인",
                  "payload": "running · image ref · image ID · OCI revision",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "aandi-app 실행 identity",
                    "before": "새 container가 요청한 source를 실행하는지 모름",
                    "after": "Config.Image, image ID와 revision label이 기대 SHA와 모두 같음"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "nginx-https",
                  "verb": "redirect·TLS readiness 확인",
                  "payload": "HTTP 301 target + HTTPS readiness 2xx",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "EC2 내부 공개 진입점",
                    "before": "Nginx health와 도메인 응답이 확인되지 않음",
                    "after": "HTTP가 같은 domain의 HTTPS로 이동하고 readiness가 인증서 검증과 함께 성공함"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "verify-and-rollback"
                  ]
                },
                {
                  "from": "external-client",
                  "to": "nginx-https",
                  "verb": "EC2 밖 readiness 요청",
                  "payload": "GET https://<domain>/actuator/health/readiness",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "외부 네트워크 증거",
                    "before": "EC2 내부 curl만 성공한 상태",
                    "after": "Actions runner가 public DNS와 유효한 TLS chain으로 readiness 2xx를 받음"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "workflow-result",
                  "verb": "release 성공 기록",
                  "payload": "health + exact revision + redirect + external HTTPS",
                  "kind": "response",
                  "effect": {
                    "kind": "verify",
                    "subject": "deployment result",
                    "before": "각 runtime 증거가 개별적으로 수집됨",
                    "after": "모든 필수 증거가 일치해 workflow가 success로 종료됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "security-group",
                  "to": "nginx-https",
                  "verb": "공개 port 제한 확인",
                  "payload": "public :80/:443 · app :8080 internal only",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "EC2 public ingress",
                    "before": "Security Group과 Compose port 공개 범위를 함께 확인하지 않음",
                    "after": "외부에는 80·443만 열리고 app 8080은 Docker network에서만 접근됨"
                  },
                  "evidenceScope": "manual",
                  "check": "Security Group의 80·443과 Compose의 app expose, Nginx ports를 함께 확인합니다."
                }
              ]
            }
          ]
        },
        "snapshot": [
          {
            "label": "실행 image",
            "value": "40자리 SHA ref · 같은 revision label",
            "tone": "recovered"
          },
          {
            "label": "공개 진입점",
            "value": "80 redirect · 443 TLS · app:8080 내부",
            "tone": "recovered"
          },
          {
            "label": "최종 증거",
            "value": "외부 HTTPS readiness 2xx",
            "tone": "recovered"
          },
          {
            "label": "최종 인바운드",
            "value": "80·443만 공개 · app 8080 내부",
            "tone": "recovered"
          }
        ],
        "evidence": "workflow main revision gate, registry SHA image, EC2 container identity, 외부 HTTPS readiness와 80·443 공개 범위를 순서대로 확인합니다.",
        "outcome": "현재 main의 exact source가 app 내부 8080에서 실행되고 외부 80·443을 통한 HTTPS 응답까지 맞아야 배포가 끝납니다."
      },
      {
        "id": "dns-target-mismatch",
        "label": "도메인 주소 불일치",
        "flowId": "https-failure-gates",
        "tone": "blocked",
        "prompt": "운영 도메인의 A record 집합이 EC2 target IPv4와 다르거나 IPv4-only 배포에 AAAA record가 남아 있습니다.",
        "observationTitle": "SSH 전에 닫히는 DNS gate",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "DNS 오류가 EC2 runtime을 바꾸기 전에 멈춰야 하는 이유를 적어보세요.",
          "hint": "인증기관과 사용자 모두 도메인을 따라 공개 진입점을 찾습니다."
        },
        "prediction": {
          "prompt": "이 조건에서 처음 실행되지 않아야 할 원격 작업은 무엇일까요?",
          "options": [
            {
              "id": "publish",
              "label": "SHA image 게시"
            },
            {
              "id": "ssh",
              "label": "staging bundle SSH 업로드"
            },
            {
              "id": "verify",
              "label": "외부 HTTPS readiness만 생략"
            }
          ],
          "answer": "ssh",
          "explanation": "publish 결과는 이미 있지만 deploy job의 DNS 검증이 실패합니다. bundle과 `.env.next`를 보내기 전에 workflow가 중단됩니다."
        },
        "route": [
          "Published SHA image",
          "Deploy job",
          "DNS comparison",
          "DNS gate failure",
          "SSH staging",
          "EC2 runtime"
        ],
        "diagram": {
          "caption": "deploy job이 도메인과 EC2의 주소 집합을 비교해 불일치를 찾고, SSH staging과 runtime 변경을 시작하지 않습니다.",
          "lanes": [
            {
              "id": "dns-blocked",
              "label": "HTTPS prerequisite · DNS comparison",
              "description": "public name resolution이 배포 target과 같은지 원격 접속 전에 판정합니다.",
              "steps": [
                {
                  "from": "publish-job",
                  "to": "deploy-job",
                  "verb": "production gate 개방",
                  "payload": "published exact SHA image",
                  "kind": "call",
                  "effect": {
                    "kind": "gate",
                    "subject": "deploy job",
                    "before": "publish job의 결과를 기다리는 상태",
                    "after": "GITHUB_SHA를 받은 deploy job이 runtime prerequisite 검사를 시작함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "deploy-job",
                  "to": "dns-service",
                  "verb": "주소 집합 조회",
                  "payload": "domain IPv4/IPv6 + EC2_HOST IPv4",
                  "kind": "request",
                  "effect": {
                    "kind": "transfer",
                    "subject": "DNS lookup 결과",
                    "before": "workflow가 실제 A·AAAA record를 모름",
                    "after": "domain과 target의 IPv4 집합 및 domain IPv6 집합을 가짐"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "dns-gate"
                  ]
                },
                {
                  "from": "dns-service",
                  "to": "dns-failure",
                  "verb": "DNS gate 거부",
                  "payload": "A mismatch 또는 unexpected AAAA",
                  "kind": "failure",
                  "effect": {
                    "kind": "gate",
                    "subject": "remote deployment path",
                    "before": "도메인 주소가 EC2 target과 다름",
                    "after": "deploy job이 non-zero로 끝나 SSH와 EC2 변경이 차단됨"
                  },
                  "evidenceScope": "runtime",
                  "check": "workflow의 DNS error와 원격 bundle 미전송 상태를 확인합니다.",
                  "codePointIds": [
                    "dns-gate"
                  ]
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": ".deploy-next와 .env.next 업로드",
              "reason": "DNS gate가 Configure SSH보다 먼저 실패했습니다."
            },
            {
              "label": "Nginx · Certbot · app 교체",
              "reason": "원격 배포 script가 실행되지 않아 현재 EC2 runtime은 그대로입니다."
            },
            {
              "label": "HTTPS readiness verify",
              "reason": "deploy job이 실패해 needs 조건이 충족되지 않습니다."
            }
          ]
        },
        "snapshot": [
          {
            "label": "첫 실패",
            "value": "DNS address set comparison",
            "tone": "blocked"
          },
          {
            "label": "EC2 변경",
            "value": "SSH 전 · 변경 없음",
            "tone": "blocked"
          },
          {
            "label": "공개 ingress",
            "value": "80·443만 사용 · runtime 변경 없음",
            "tone": "recovered"
          }
        ],
        "evidence": "deploy job의 DNS error와 Configure SSH 이후 step의 skipped 상태가 이 gate의 범위입니다.",
        "outcome": "공개 도메인이 배포 target과 일치하지 않으면 원격 runtime을 건드리지 않고 먼저 DNS를 고칩니다.",
        "stopAfter": 3
      },
      {
        "id": "port-80-closed",
        "label": "DNS 정상 · 외부 80 차단",
        "flowId": "https-failure-gates",
        "tone": "blocked",
        "prompt": "도메인의 IPv4는 EC2와 같고 사용 가능한 인증서는 없지만 Security Group 또는 방화벽이 외부 80을 막고 있습니다.",
        "observationTitle": "app 교체 전에 실패하는 HTTP-01",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "인증서 실패 뒤 기존 app image가 유지되는 경계를 적어보세요.",
          "hint": "`compose pull app`보다 먼저 실행되는 HTTP challenge를 봅니다."
        },
        "prediction": {
          "prompt": "인증기관이 80번 challenge에 닿지 못하면 새 app은 어떻게 될까요?",
          "options": [
            {
              "id": "updated",
              "label": "인증서 없이 먼저 새 app으로 교체"
            },
            {
              "id": "unchanged",
              "label": "app 교체 전 중단하고 기존 image 유지"
            },
            {
              "id": "self-signed",
              "label": "자동으로 자체 서명 인증서 사용"
            }
          ],
          "answer": "unchanged",
          "explanation": "사용 가능한 인증서를 먼저 확보한 뒤 app을 pull·recreate합니다. HTTP-01 실패는 application update flag가 켜지기 전이라 기존 app을 유지합니다."
        },
        "route": [
          "DNS pass",
          ".deploy-next installed",
          "MySQL · Redis preserved",
          "Nginx HTTP challenge",
          "ACME public :80 request",
          "HTTP-01 failure",
          "Previous runtime restored",
          "New app update"
        ],
        "diagram": {
          "caption": "DNS 검증과 staging은 통과하지만 인증기관의 80번 요청이 막혀 certificate 발급이 실패하고, 새 app 교체 전에 이전 runtime 구성을 되돌립니다.",
          "lanes": [
            {
              "id": "acme-prerequisite",
              "label": "Release prerequisite · DNS → staging",
              "description": "원격 certificate 요청 전까지 통과한 준비 단계를 구분합니다.",
              "nextLaneIds": [
                "acme-blocked"
              ],
              "steps": [
                {
                  "from": "deploy-job",
                  "to": "dns-service",
                  "verb": "도메인 target 확인",
                  "payload": "domain A records = EC2 IPv4",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "DNS prerequisite",
                    "before": "도메인 주소가 배포 target과 같은지 모름",
                    "after": "A record가 EC2 IPv4와 같고 AAAA record가 없음"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "dns-gate"
                  ]
                },
                {
                  "from": "deploy-job",
                  "to": "staged-release",
                  "verb": "배포 입력 staging",
                  "payload": "Nginx templates · scripts · mode 600 .env.next",
                  "kind": "persist",
                  "effect": {
                    "kind": "persist",
                    "subject": "EC2 staging bundle",
                    "before": "현재 배포 파일만 EC2에 있음",
                    "after": "새 구성은 `.deploy-next`와 `.env.next`에서 검증됨"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "staging-validation"
                  ]
                },
                {
                  "from": "staged-release",
                  "to": "deploy-script",
                  "verb": "배포 script 시작",
                  "payload": "exact image · domain · certificate email",
                  "kind": "call",
                  "effect": {
                    "kind": "preserve",
                    "subject": "rollback inputs",
                    "before": "현재 env와 bundle만 설치되어 있음",
                    "after": "이전 env·bundle을 복사한 뒤 새 runtime 전환을 시작함"
                  },
                  "evidenceScope": "runtime"
                }
              ]
            },
            {
              "id": "acme-blocked",
              "label": "HTTPS transition · HTTP-01 blocked",
              "description": "bootstrap Nginx와 외부 80 사이에서 처음 끊긴 증거를 확인합니다.",
              "steps": [
                {
                  "from": "deploy-script",
                  "to": "nginx-http",
                  "verb": "challenge endpoint 시작",
                  "payload": "port 80 + /.well-known/acme-challenge/",
                  "kind": "config",
                  "effect": {
                    "kind": "transform",
                  "subject": "aandi-nginx bootstrap",
                    "before": "도메인 인증서를 읽는 HTTPS config를 시작할 수 없음",
                    "after": "HTTP 전용 config가 local health를 통과하고 token 경로를 기다림"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "certificate-bootstrap"
                  ]
                },
                {
                  "from": "certbot",
                  "to": "acme-ca",
                  "verb": "HTTP-01 order 요청",
                  "payload": "domain · webroot token",
                  "kind": "request",
                  "effect": {
                    "kind": "transfer",
                    "subject": "ACME validation target",
                    "before": "인증기관이 challenge URL을 조회하지 않음",
                    "after": "인증기관이 public domain의 80번 token URL을 조회하려 함"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "certificate-bootstrap"
                  ]
                },
                {
                  "from": "acme-ca",
                  "to": "acme-failure",
                  "verb": "public challenge 도달 실패",
                  "payload": "TCP :80 blocked · token unavailable",
                  "kind": "failure",
                  "effect": {
                    "kind": "gate",
                    "subject": "certificate files",
                    "before": "fullchain과 private key 발급에 HTTP-01 proof가 필요함",
                    "after": "인증기관이 token을 읽지 못해 certificate files가 생성되지 않음"
                  },
                  "evidenceScope": "runtime",
                  "check": "Certbot error와 외부 80 인바운드 설정을 함께 확인합니다."
                },
                {
                  "from": "acme-failure",
                  "to": "deploy-script",
                  "verb": "app update 차단",
                  "payload": "certbot non-zero before compose pull app",
                  "kind": "failure",
                  "effect": {
                    "kind": "gate",
                    "subject": "application update flag",
                    "before": "APPLICATION_UPDATE_STARTED 값이 0임",
                    "after": "deploy trap이 새 image pull과 app recreate를 실행하지 않음"
                  },
                  "evidenceScope": "code",
                  "codePointIds": [
                    "certificate-bootstrap"
                  ]
                },
                {
                  "from": "deploy-script",
                  "to": "previous-release",
                  "verb": "bootstrap 구성 정리",
                  "payload": "previous env · previous bundle · existing app",
                  "kind": "transform",
                  "effect": {
                    "kind": "preserve",
                    "subject": "기존 application runtime",
                    "before": "HTTP challenge Nginx가 잠시 실행되고 새 env·bundle이 설치됨",
                    "after": "이전 env·bundle을 복원하고 기존 app image는 교체하지 않음"
                  },
                  "evidenceScope": "runtime"
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "fullchain.pem과 privkey.pem",
              "reason": "인증기관이 공개 80번의 token을 읽지 못해 발급되지 않습니다."
            },
            {
              "label": "새 exact SHA app 교체",
              "reason": "certificate usability gate가 `compose pull app`보다 먼저 실패합니다."
            },
            {
              "label": "Nginx 443과 verify job",
              "reason": "TLS config로 전환되지 못해 deploy job이 실패합니다."
            }
          ]
        },
        "snapshot": [
          {
            "label": "첫 실패",
            "value": "ACME public :80 reachability",
            "tone": "blocked"
          },
          {
            "label": "app image",
            "value": "기존 reference 유지",
            "tone": "recovered"
          },
          {
            "label": "상태 volume",
            "value": "MySQL · certificate named volume 삭제 없음",
            "tone": "recovered"
          },
          {
            "label": "공개 ingress",
            "value": "80 차단이 인증서 발급을 막음",
            "tone": "blocked"
          }
        ],
        "evidence": "Certbot HTTP-01 error, app container의 기존 image reference와 deploy log의 application update 이전 중단을 확인합니다.",
        "outcome": "외부 80은 HTTP 서비스 공개 목적이 아니라 최초 인증과 갱신 가능성을 위해 먼저 열려 있어야 합니다.",
        "stopAfter": 6
      },
      {
        "id": "readiness-failure-rollback",
        "label": "새 app readiness 실패",
        "flowId": "verify-and-rollback",
        "tone": "warning",
        "prompt": "이전 HTTPS 배포 snapshot이 있는 상태에서 새 exact SHA app의 readiness가 실패합니다. 이전 env·bundle·image와 인증서 volume은 보존돼 있습니다.",
        "observationTitle": "검증 실패 뒤 infra rollback 경계",
        "theoryRef": "../../../theory.md#seq-10",
        "reflection": {
          "prompt": "rollback 성공과 새 release 성공이 왜 같은 판정이 아닌지 적어보세요.",
          "hint": "복구된 사용자 상태와 시도한 release의 결과를 분리합니다."
        },
        "prediction": {
          "prompt": "이전 HTTPS readiness가 복구되면 이번 workflow 결과는 무엇일까요?",
          "options": [
            {
              "id": "success",
              "label": "rollback이 성공했으므로 새 release도 성공"
            },
            {
              "id": "failed-restored",
              "label": "새 release는 실패, 이전 runtime은 복구"
            },
            {
              "id": "volumes-reset",
              "label": "DB와 인증서 volume을 삭제하고 재시작"
            }
          ],
          "answer": "failed-restored",
          "explanation": "rollback은 기존 서비스 가용성을 되살리지만 새 release의 readiness 실패를 성공으로 바꾸지 않습니다. verify script는 끝까지 non-zero로 종료합니다."
        },
        "route": [
          "New exact SHA app",
          "Verify job",
          "HTTPS readiness failure",
          "Previous env · bundle · image",
          "Previous HTTP readiness",
          "Workflow failed"
        ],
        "diagram": {
          "caption": "새 app image가 실행된 뒤 HTTPS readiness가 실패하면 이전 HTTPS bundle과 image를 복원하고 상태 volume은 보존하지만, 시도한 release는 실패로 남습니다.",
          "lanes": [
            {
              "id": "release-applied",
              "label": "Release · 새 runtime 적용",
              "description": "rollback이 필요한 시점을 app image 교체 이후로 한정합니다.",
              "nextLaneIds": [
                "verify-failed",
                "infra-rollback"
              ],
              "steps": [
                {
                  "from": "staged-release",
                  "to": "deploy-script",
                  "verb": "검증된 bundle 설치",
                  "payload": "new env · Compose · Nginx · scripts",
                  "kind": "transform",
                  "effect": {
                    "kind": "preserve",
                    "subject": "rollback inputs",
                    "before": "현재 HTTPS runtime이 설치되어 있음",
                    "after": "이전 env·bundle·image marker를 보존하고 새 bundle을 설치함"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "staging-validation"
                  ]
                },
                {
                  "from": "deploy-script",
                  "to": "app-container",
                  "verb": "새 app recreate",
                  "payload": "exact SHA image",
                  "kind": "transform",
                  "effect": {
                    "kind": "transform",
                    "subject": "aandi-app container",
                    "before": "이전 SHA image가 실행 중임",
                    "after": "새 40자리 SHA image container가 Docker network에서 실행 중임"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "certificate-volume",
                  "to": "nginx-https",
                  "verb": "HTTPS 진입점 활성화",
                  "payload": "domain certificate + proxy config",
                  "kind": "config",
                  "effect": {
                    "kind": "transform",
                    "subject": "host 공개 port",
                    "before": "Nginx 80·443이 이전 app image를 proxy함",
                    "after": "Nginx 80·443은 유지되고 app 8080이 새 image의 내부 endpoint를 제공함"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "https-proxy"
                  ]
                }
              ]
            },
            {
              "id": "verify-failed",
              "label": "Verify · HTTPS readiness 실패",
              "description": "실행 identity와 실제 application readiness를 별도 증거로 판정합니다.",
              "nextLaneIds": [
                "infra-rollback"
              ],
              "steps": [
                {
                  "from": "verify-job",
                  "to": "verify-script",
                  "verb": "검증 기대값 전달",
                  "payload": "exact image · revision · domain",
                  "kind": "call",
                  "effect": {
                    "kind": "transfer",
                    "subject": "verify inputs",
                    "before": "새 runtime은 시작했지만 성공 여부를 모름",
                    "after": "check script가 image와 HTTPS origin을 판정 기준으로 가짐"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "verify-and-rollback"
                  ]
                },
                {
                  "from": "verify-script",
                  "to": "app-container",
                  "verb": "image identity 통과",
                  "payload": "running · image ref · image ID · revision",
                  "kind": "compare",
                  "effect": {
                    "kind": "verify",
                    "subject": "새 app identity",
                    "before": "container가 새 image로 시작했다는 사실만 있음",
                    "after": "요청한 SHA image와 OCI revision이 실행 container에서 일치함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "nginx-https",
                  "verb": "readiness 재시도",
                  "payload": "HTTPS /actuator/health/readiness",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "application readiness response",
                    "before": "TLS 진입점과 image identity는 확인됨",
                    "after": "제한된 재시도 동안 readiness 2xx를 받지 못함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "nginx-https",
                  "to": "runtime-failure",
                  "verb": "새 release 거부",
                  "payload": "HTTPS readiness non-zero",
                  "kind": "failure",
                  "effect": {
                    "kind": "gate",
                    "subject": "deployment attempt",
                    "before": "새 container는 실행 중이나 readiness가 실패함",
                    "after": "workflow success가 차단되고 rollback 함수가 호출됨"
                  },
                  "evidenceScope": "runtime",
                  "check": "첫 실패 항목과 app log를 rollback 전에 확인합니다.",
                  "codePointIds": [
                    "verify-and-rollback"
                  ]
                }
              ]
            },
            {
              "id": "infra-rollback",
              "label": "Rollback · 이전 runtime 복구",
              "description": "이전 HTTPS bundle을 되살리면서 MySQL과 인증서 volume을 삭제하지 않습니다.",
              "steps": [
                {
                  "from": "runtime-failure",
                  "to": "previous-release",
                  "verb": "rollback 시작",
                  "payload": ".env.previous + .deploy.previous + .previous-image",
                  "kind": "transform",
                  "effect": {
                    "kind": "transform",
                    "subject": "배포 파일과 app image reference",
                    "before": "실패한 HTTPS bundle과 새 SHA image가 현재 값임",
                    "after": "이전 HTTPS env·bundle과 image reference가 현재 값으로 복원됨"
                  },
                  "evidenceScope": "runtime",
                  "codePointIds": [
                    "verify-and-rollback"
                  ]
                },
                {
                  "from": "previous-release",
                  "to": "state-services",
                  "verb": "상태 서비스 보존",
                  "payload": "up --no-recreate mysql redis",
                  "kind": "persist",
                  "effect": {
                    "kind": "preserve",
                    "subject": "MySQL data와 Redis process",
                    "before": "새 app 검증이 실패했지만 상태 service는 실행 중임",
                    "after": "container와 MySQL named volume을 삭제하지 않고 healthy 상태를 재확인함"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "previous-release",
                  "to": "app-container",
                  "verb": "이전 app 복원",
                  "payload": "pull previous image + force-recreate app",
                  "kind": "transform",
                  "effect": {
                    "kind": "transform",
                    "subject": "aandi-app container",
                    "before": "readiness에 실패한 새 SHA image가 실행 중임",
                    "after": "보존한 이전 image reference의 app container가 실행 중임"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "previous-release",
                  "to": "certificate-volume",
                  "verb": "TLS state 보존",
                  "payload": "named volume retained · proxy containers removed",
                  "kind": "persist",
                  "effect": {
                    "kind": "preserve",
                    "subject": "letsencrypt named volume",
                    "before": "첫 HTTPS 시도에서 certificate files가 저장됨",
                    "after": "이전 HTTPS bundle로 돌아가도 certificate volume은 삭제되지 않음"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "verify-script",
                  "to": "app-container",
                  "verb": "이전 HTTPS readiness 확인",
                  "payload": "GET https://<domain>/actuator/health/readiness",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "rollback service availability",
                    "before": "이전 image container가 다시 시작됨",
                    "after": "Nginx를 통한 이전 HTTPS readiness가 2xx로 복구됨"
                  },
                  "evidenceScope": "runtime"
                },
                {
                  "from": "external-client",
                  "to": "nginx-https",
                  "verb": "이전 외부 HTTPS 경로 확인",
                  "payload": "GET https://<domain>/actuator/health/readiness",
                  "kind": "request",
                  "effect": {
                    "kind": "verify",
                    "subject": "rollback ingress",
                    "before": "EC2 내부의 이전 readiness만 복구됨",
                    "after": "유지한 443 경로로 외부에서도 이전 HTTPS runtime에 접근 가능함"
                  },
                  "evidenceScope": "manual"
                },
                {
                  "from": "verify-script",
                  "to": "workflow-result",
                  "verb": "시도한 release 실패 기록",
                  "payload": "rollback ready + original verify non-zero",
                  "kind": "response",
                  "effect": {
                    "kind": "verify",
                    "subject": "deployment result",
                    "before": "이전 사용자 경로는 복구됐지만 새 release는 readiness에 실패함",
                    "after": "rollback 상태와 별개로 workflow가 failed로 종료됨"
                  },
                  "evidenceScope": "code",
                  "codePointIds": [
                    "verify-and-rollback"
                  ]
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "새 release의 Workflow success",
              "reason": "rollback이 성공해도 원래 HTTPS readiness 실패는 그대로 남습니다."
            },
            {
              "label": "새 SHA image 유지",
              "reason": "외부 HTTPS readiness가 성공하지 않아 이전 image reference로 되돌립니다."
            }
          ]
        },
        "snapshot": [
          {
            "label": "새 release",
            "value": "HTTPS readiness 실패",
            "tone": "blocked"
          },
          {
            "label": "이전 runtime",
            "value": "HTTPS readiness 복구",
            "tone": "recovered"
          },
          {
            "label": "지속 상태",
            "value": "MySQL · certificate volume 보존",
            "tone": "recovered"
          },
          {
            "label": "외부 rollback 경로",
            "value": "443 HTTPS readiness 복구",
            "tone": "recovered"
          }
        ],
        "evidence": "check script의 첫 HTTPS readiness failure, 이전 image recreation과 HTTPS readiness 복구, 마지막 non-zero exit를 순서대로 확인합니다.",
        "outcome": "rollback은 장애 범위를 줄이는 복구 동작이며 검증에 실패한 새 release를 성공으로 바꾸지 않습니다."
      }
    ]
  },
  "repo": {
    "name": "spring-boot-cicd-deployment-lab",
    "path": "spring-boot-cicd-deployment-lab"
  },
  "defaultSequence": "10",
  "actors": [
    {
      "id": "operator",
      "label": "Repository maintainer",
      "kind": "person"
    },
    {
      "id": "actions",
      "label": "GitHub Actions",
      "kind": "ci"
    },
    {
      "id": "registry",
      "label": "Docker Hub",
      "kind": "external"
    },
    {
      "id": "dns",
      "label": "Public DNS",
      "kind": "external"
    },
    {
      "id": "ec2",
      "label": "EC2 runtime",
      "kind": "infra"
    },
    {
      "id": "nginx",
      "label": "Nginx",
      "kind": "server"
    },
    {
      "id": "certbot",
      "label": "Certbot",
      "kind": "security"
    },
    {
      "id": "app",
      "label": "Spring Boot app",
      "kind": "server"
    }
  ],
  "flows": [
    {
      "id": "release-to-https",
      "title": "main에서 HTTPS success까지",
      "summary": "source identity, certificate trust와 runtime evidence를 서로 다른 gate로 고정합니다.",
      "steps": [
        {
          "id": "release-to-https-step-1",
          "order": 1,
          "from": "Repository maintainer",
          "to": "Publish job",
          "message": "main ref와 exact GITHUB_SHA를 검증합니다.",
          "messageKind": "request",
          "problem": "main이 아닌 ref나 이미 뒤처진 event SHA가 운영 배포를 시작하면 검토한 최신 source와 EC2가 어긋날 수 있습니다.",
          "concept": "Exact main revision gate",
          "action": "refs/heads/main과 GITHUB_SHA, 현재 origin/main을 정확히 비교합니다.",
          "check": "workflow의 main 검증 step과 40자리 deployment SHA output을 확인합니다.",
          "codePointIds": [
            "main-trigger"
          ]
        },
        {
          "id": "release-to-https-step-2",
          "order": 2,
          "from": "Publish job",
          "to": "Docker Hub",
          "message": "GITHUB_SHA image 하나만 게시합니다.",
          "messageKind": "request",
          "problem": "가변 별칭이나 여러 image 이름은 EC2가 실행할 source identity를 흐릴 수 있습니다.",
          "concept": "Exact SHA image",
          "action": "full commit SHA Docker tag와 같은 OCI revision을 가진 image 하나만 push합니다.",
          "check": "registry image의 full SHA 이름과 revision label을 비교합니다."
        },
        {
          "id": "release-to-https-step-3",
          "order": 3,
          "from": "Deploy job",
          "to": "EC2 staging",
          "message": "새 runtime 입력을 현재 release와 격리합니다.",
          "messageKind": "request",
          "problem": "검증하지 않은 env나 Compose 파일이 현재 runtime을 바로 덮으면 rollback 입력도 잃을 수 있습니다.",
          "concept": "Staging and atomic install",
          "action": "`.deploy-next`와 `.env.next`를 검증하고 이전 bundle을 보존합니다.",
          "check": "Compose config, file mode 600과 previous snapshot을 확인합니다.",
          "codePointIds": [
            "staging-validation"
          ]
        },
        {
          "id": "release-to-https-step-4",
          "order": 4,
          "from": "Certbot",
          "to": "Nginx",
          "message": "HTTP-01 proof 뒤 TLS 진입점을 엽니다.",
          "messageKind": "request",
          "problem": "인증서 파일이 없는데 HTTPS config를 먼저 시작하면 Nginx가 기동하지 못합니다.",
          "concept": "HTTP bootstrap before TLS",
          "action": "80번 webroot로 인증서를 발급한 뒤 443 config로 전환합니다.",
          "check": "certificate files와 Nginx config health를 확인합니다.",
          "codePointIds": [
            "certificate-bootstrap",
            "https-proxy"
          ]
        },
        {
          "id": "release-to-https-step-5",
          "order": 5,
          "from": "Verify job",
          "to": "Public HTTPS",
          "message": "exact revision과 외부 readiness를 판정합니다.",
          "messageKind": "response",
          "problem": "원격 명령 종료만으로는 실행 source와 사용자 경로의 정상 상태를 알 수 없습니다.",
          "concept": "Runtime and external evidence",
          "action": "health, image identity, redirect와 외부 TLS readiness를 모두 확인합니다.",
          "check": "check script와 Actions runner curl이 모두 성공했는지 확인합니다.",
          "codePointIds": [
            "verify-and-rollback"
          ]
        },
        {
          "id": "release-to-https-step-6",
          "order": 6,
          "from": "Repository maintainer",
          "to": "EC2 Security Group",
          "message": "외부 80·443과 내부 app 8080 경계를 확인합니다.",
          "messageKind": "response",
          "problem": "app 8080을 host에 공개하면 TLS와 Nginx 정책을 우회하는 별도 진입점이 생깁니다.",
          "concept": "Public and internal port boundary",
          "action": "Security Group에는 80·443만 열고 app 8080은 Compose network에만 둡니다.",
          "check": "Nginx ports와 app expose, Security Group 인바운드를 함께 확인합니다."
        }
      ]
    },
    {
      "id": "https-failure-gates",
      "title": "DNS와 HTTP-01 첫 실패 gate",
      "summary": "실패 위치에 따라 EC2를 전혀 바꾸지 않거나 app image 교체 전에 bootstrap 구성만 되돌립니다.",
      "steps": [
        {
          "id": "https-failure-gates-step-1",
          "order": 1,
          "from": "Deploy job",
          "to": "Public DNS",
          "message": "도메인과 EC2 주소를 비교합니다.",
          "messageKind": "request",
          "problem": "도메인이 다른 host를 가리키면 certificate와 사용자 요청이 배포 EC2에 도착하지 않습니다.",
          "concept": "DNS prerequisite",
          "action": "A record 집합과 IPv4-only 조건을 SSH 전에 확인합니다.",
          "check": "DNS failure에서 원격 step이 skipped인지 확인합니다.",
          "codePointIds": [
            "dns-gate"
          ]
        },
        {
          "id": "https-failure-gates-step-2",
          "order": 2,
          "from": "Deploy script",
          "to": "Nginx HTTP",
          "message": "인증서가 없으면 80번 challenge endpoint를 시작합니다.",
          "messageKind": "request",
          "problem": "TLS config는 certificate files가 생긴 뒤에만 유효합니다.",
          "concept": "Certificate bootstrap",
          "action": "HTTP template과 webroot volume으로 임시 Nginx를 시작합니다.",
          "check": "Nginx health와 challenge path를 확인합니다.",
          "codePointIds": [
            "certificate-bootstrap"
          ]
        },
        {
          "id": "https-failure-gates-step-3",
          "order": 3,
          "from": "ACME CA",
          "to": "Public port 80",
          "message": "HTTP-01 token 도달 여부를 판정합니다.",
          "messageKind": "error",
          "problem": "DNS가 맞아도 외부 80이 닫히면 인증기관은 webroot token을 읽지 못합니다.",
          "concept": "Public reachability gate",
          "action": "Certbot error와 Security Group 80 인바운드를 연결해 확인합니다.",
          "check": "certificate files가 생성되지 않았는지 확인합니다."
        },
        {
          "id": "https-failure-gates-step-4",
          "order": 4,
          "from": "Deploy script",
          "to": "Previous runtime",
          "message": "app update 이전 실패를 정리합니다.",
          "messageKind": "response",
          "problem": "certificate 실패가 기존 사용자 경로까지 불필요하게 바꾸면 장애 범위가 커집니다.",
          "concept": "Pre-update recovery",
          "action": "이전 env·bundle을 복원하고 기존 app image를 유지합니다.",
          "check": "deploy log와 app image reference가 바뀌지 않았는지 확인합니다."
        }
      ]
    },
    {
      "id": "verify-and-rollback",
      "title": "runtime verify와 infra rollback",
      "summary": "새 release 검증 실패와 이전 서비스 복구를 서로 다른 결과로 기록합니다.",
      "steps": [
        {
          "id": "verify-and-rollback-step-1",
          "order": 1,
          "from": "Verify job",
          "to": "Running stack",
          "message": "service health와 실행 identity를 확인합니다.",
          "messageKind": "request",
          "problem": "container running만으로는 DB, Redis와 source revision 일치를 알 수 없습니다.",
          "concept": "Exact runtime identity",
          "action": "health, image ref, image ID와 OCI revision을 비교합니다.",
          "check": "기대 SHA와 네 가지 실행 증거가 모두 같은지 확인합니다."
        },
        {
          "id": "verify-and-rollback-step-2",
          "order": 2,
          "from": "Verify script",
          "to": "Nginx HTTPS",
          "message": "redirect와 readiness를 제한 시간 동안 재시도합니다.",
          "messageKind": "request",
          "problem": "image identity가 맞아도 application dependency가 준비되지 않을 수 있습니다.",
          "concept": "HTTPS readiness",
          "action": "인증서 검증을 끄지 않고 readiness 2xx와 HTTP redirect를 확인합니다.",
          "check": "첫 non-zero 검증 항목과 app log를 확인합니다."
        },
        {
          "id": "verify-and-rollback-step-3",
          "order": 3,
          "from": "Runtime failure",
          "to": "Previous release",
          "message": "이전 env, bundle과 image를 복원합니다.",
          "messageKind": "error",
          "problem": "실패한 app을 그대로 두면 사용자의 기존 정상 경로도 잃습니다.",
          "concept": "Infrastructure rollback",
          "action": "previous snapshot으로 app과 공개 진입점을 되돌립니다.",
          "check": "이전 image reference가 다시 실행되는지 확인합니다.",
          "codePointIds": [
            "verify-and-rollback"
          ]
        },
        {
          "id": "verify-and-rollback-step-4",
          "order": 4,
          "from": "Previous release",
          "to": "Persistent state",
          "message": "DB와 certificate volume을 보존합니다.",
          "messageKind": "response",
          "problem": "release rollback이 장기 상태를 삭제하면 복구가 더 큰 데이터 손실을 만듭니다.",
          "concept": "State preservation",
          "action": "MySQL·Redis는 no-recreate로 두고 named volume을 삭제하지 않습니다.",
          "check": "MySQL data와 letsencrypt volume이 남았는지 확인합니다."
        },
        {
          "id": "verify-and-rollback-step-5",
          "order": 5,
          "from": "Verify script",
          "to": "Workflow result",
          "message": "복구와 release 결과를 따로 기록합니다.",
          "messageKind": "response",
          "problem": "rollback 성공을 새 release 성공으로 해석하면 실패한 변경이 배포 완료로 남습니다.",
          "concept": "Attempt result",
          "action": "이전 readiness를 확인한 뒤에도 원래 검증 실패로 종료합니다.",
          "check": "workflow가 failed이고 이전 서비스만 ready인지 확인합니다.",
          "codePointIds": [
            "verify-and-rollback"
          ]
        }
      ]
    }
  ],
  "flow": [
    {
      "id": "release-to-https-step-1",
      "label": "Exact main gate",
      "problem": "운영 배포 시작점을 명시적으로 고정해야 합니다.",
      "concept": "Main ref and exact GITHUB_SHA",
      "action": "main ref와 현재 origin/main의 40자리 SHA를 비교합니다.",
      "check": "deployment SHA output을 확인합니다.",
      "codePointIds": [
        "main-trigger"
      ]
    },
    {
      "id": "release-to-https-step-2",
      "label": "Exact SHA image",
      "problem": "registry와 EC2가 같은 source를 실행해야 합니다.",
      "concept": "Immutable release identity",
      "action": "SHA tag와 revision label을 맞춥니다.",
      "check": "image ID와 OCI revision을 비교합니다."
    },
    {
      "id": "release-to-https-step-3",
      "label": "HTTPS bootstrap",
      "problem": "certificate 없이 TLS config를 시작할 수 없습니다.",
      "concept": "DNS and HTTP-01",
      "action": "80번 webroot proof 뒤 443을 활성화합니다.",
      "check": "certificate files와 Nginx health를 확인합니다.",
      "codePointIds": [
        "dns-gate",
        "certificate-bootstrap"
      ]
    },
    {
      "id": "release-to-https-step-4",
      "label": "Runtime verify",
      "problem": "배포 명령 종료는 서비스 정상 증거가 아닙니다.",
      "concept": "Image and HTTPS evidence",
      "action": "exact revision, redirect와 readiness를 확인합니다.",
      "check": "원격 script와 외부 curl을 함께 봅니다.",
      "codePointIds": [
        "verify-and-rollback"
      ]
    },
    {
      "id": "release-to-https-step-5",
      "label": "Public ingress boundary",
      "problem": "app 8080이 외부에 열리면 HTTPS 진입점과 검증을 우회할 수 있습니다.",
      "concept": "Nginx public ports and internal app port",
      "action": "외부에는 80·443만 열고 app 8080은 Docker network 안에 둡니다.",
      "check": "Security Group과 Compose port 계약을 함께 확인합니다."
    }
  ],
  "codePoints": [
    {
      "id": "main-trigger",
      "title": "운영 배포는 main push와 main ref 수동 실행에서만 시작됩니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "on:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\nconcurrency:\n  group: spring-boot-cicd-deployment-lab-production\n  cancel-in-progress: false",
      "explanation": "main push는 자동 배포를 시작하고 workflow_dispatch는 main ref로 같은 gate를 수동 실행합니다. 고정 concurrency는 같은 저장소의 production 변경을 직렬화합니다.",
      "check": "publish 직전 GITHUB_SHA가 현재 origin/main과 같은 40자리 SHA인지 확인해야 합니다."
    },
    {
      "id": "dns-gate",
      "title": "원격 파일 전송 전에 도메인과 EC2 주소 집합을 비교합니다",
      "file": ".github/workflows/deploy.yml",
      "language": "python",
      "snippet": "if not domain_ipv4 or not target_ipv4:\n    print(\"::error::PROD_DOMAIN or EC2_HOST did not resolve to IPv4.\")\n    raise SystemExit(1)\nif domain_ipv4 != target_ipv4:\n    print(\"::error::Every PROD_DOMAIN A record must match the EC2 deployment target.\")\n    raise SystemExit(1)\nif domain_ipv6:\n    print(\"::error::PROD_DOMAIN must not publish AAAA records for this IPv4-only deployment.\")\n    raise SystemExit(1)",
      "explanation": "이 비교가 실패하면 Configure SSH와 staging upload가 열리지 않아 현재 EC2 runtime을 그대로 둡니다.",
      "check": "workflow error와 이후 remote step의 skipped 상태를 확인합니다."
    },
    {
      "id": "staging-validation",
      "title": "새 배포 파일은 `.deploy-next`와 `.env.next`에서 먼저 검증합니다",
      "file": ".github/workflows/deploy.yml",
      "language": "bash",
      "snippet": "chmod 600 .env.next\ngrep -Fxq \"APP_IMAGE='${app_image}'\" .env.next\ngrep -Fxq \"APP_DOMAIN='${app_domain}'\" .env.next\ngrep -Fxq \"CERTBOT_EMAIL='${certbot_email}'\" .env.next\nbash -n \\\n  \"${next_bundle}/scripts/ensure-compose.sh\" \\\n  \"${next_bundle}/scripts/deploy.sh\" \\\n  \"${next_bundle}/scripts/check-deploy.sh\"\nenv -u APP_IMAGE docker compose \\\n  --env-file .env.next \\\n  -f \"${next_bundle}/deploy/compose.prod.yaml\" \\\n  config --quiet",
      "explanation": "새 env와 Compose가 유효한 경우에만 현재 파일로 설치하고, 기존 env와 bundle은 rollback 입력으로 보존합니다.",
      "check": "`.env.next` mode 600, Compose config와 previous snapshot 생성 순서를 확인합니다."
    },
    {
      "id": "certificate-bootstrap",
      "title": "인증서가 없으면 HTTP 전용 Nginx를 먼저 열고 Certbot을 실행합니다",
      "file": "scripts/deploy.sh",
      "language": "bash",
      "snippet": "BOOTSTRAP_NGINX_STARTED=1\nNGINX_TEMPLATE=http.conf.template \\\n  compose up -d --no-deps --force-recreate nginx\nwait_for_healthy_service nginx\n\necho \"Requesting the initial TLS certificate for $APP_DOMAIN...\"\ncompose run --rm --no-deps --entrypoint certbot certbot certonly \\\n  --non-interactive \\\n  --agree-tos \\\n  --no-eff-email \\\n  --email \"$CERTBOT_EMAIL\" \\\n  --webroot \\",
      "explanation": "HTTP-01 proof와 certificate usability가 확인되기 전에는 새 app image를 pull하거나 HTTPS config로 전환하지 않습니다.",
      "check": "Nginx bootstrap health, Certbot log와 persistent volume의 certificate files를 확인합니다."
    },
    {
      "id": "https-proxy",
      "title": "외부 TLS 요청은 header 정보를 유지한 채 내부 app으로 전달됩니다",
      "file": "deploy/nginx/https.conf.template",
      "language": "nginx",
      "snippet": "proxy_pass http://app:8080;\nproxy_http_version 1.1;\nproxy_set_header Host $host;\nproxy_set_header X-Real-IP $remote_addr;\nproxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\nproxy_set_header X-Forwarded-Host $host;\nproxy_set_header X-Forwarded-Proto https;\nproxy_set_header Upgrade $http_upgrade;\nproxy_set_header Connection $connection_upgrade;\nproxy_read_timeout 65s;",
      "explanation": "app의 8080은 host port가 아니라 Docker network endpoint이며 Spring Boot는 forwarded header로 외부 HTTPS origin을 해석합니다.",
      "check": "Compose의 app expose와 Nginx 80·443 ports, proxy header를 함께 확인합니다."
    },
    {
      "id": "verify-and-rollback",
      "title": "rollback이 성공해도 실패한 release의 결과는 성공으로 바꾸지 않습니다",
      "file": "scripts/check-deploy.sh",
      "language": "bash",
      "snippet": "if verify_deployment; then\n  echo \"Deployment verified: $APP_IMAGE ($APP_VERSION)\"\n  exit 0\nfi\n\necho \"Deployment verification failed; attempting rollback when possible.\" >&2\nif ! rollback; then\n  echo \"Rollback was unavailable or unsuccessful.\" >&2\nfi\n\n# A successful rollback does not make the attempted deployment successful.\nexit 1",
      "explanation": "이전 service readiness 복구는 사용자의 가용성을 되살리는 증거이고, 새 release의 검증 결과는 원래 non-zero로 남습니다.",
      "check": "이전 image와 readiness 복구 뒤에도 verify job이 failed인지 확인합니다."
    }
  ],
  "concepts": [
    {
      "title": "Release identity는 SHA로 고정합니다",
      "body": "Compose는 GITHUB_SHA Docker image 하나만 실행하며 이 image tag는 Git tag가 아닙니다."
    },
    {
      "title": "TLS 전환은 certificate bootstrap을 가집니다",
      "body": "DNS와 외부 80에서 HTTP-01을 통과한 뒤 certificate files를 가진 Nginx 443을 시작합니다."
    },
    {
      "title": "Verify는 배포 명령보다 넓습니다",
      "body": "service health, exact image identity, redirect와 외부 HTTPS readiness를 함께 판정합니다."
    },
    {
      "title": "Rollback은 시도 결과를 지우지 않습니다",
      "body": "이전 runtime을 복구해도 실패한 새 release는 workflow 실패로 기록합니다."
    }
  ],
  "practice": [
    "full commit SHA Docker image가 Git tag가 아닌 이유를 설명할 수 있나요?",
    "DNS 검증과 외부 80이 각각 어느 HTTPS gate에 필요한지 말할 수 있나요?",
    "외부에는 왜 80·443만 열고 app 8080은 Docker network 안에 두어야 하나요?",
    "rollback 성공과 새 release 성공을 분리해 말할 수 있나요?"
  ],
  "mentorHints": [],
  "relatedDocs": [],
  "relatedCode": [],
  "topic": "Main deployment, HTTPS transition, and rollback",
  "question": "main의 GITHUB_SHA를 어디까지 확인해야 HTTPS 운영 배포 성공이라고 말할 수 있을까?",
  "source": {
    "theory": "../../../theory.md",
    "implementation": "../../../implementation.md",
    "checklist": "../../../checklist.md"
  },
  "why": {
    "problem": "image 게시, certificate 준비와 application readiness는 서로 다른 경계에서 실패합니다.",
    "limits": [
      "도메인 주소가 다르면 SSH 전에 배포를 멈춰야 합니다.",
      "인증서가 없으면 HTTPS config보다 HTTP-01 endpoint가 먼저 필요합니다.",
      "새 image가 실행돼도 readiness가 실패하면 이전 runtime을 복구해야 합니다."
    ],
    "choice": "main revision, DNS·ACME, Nginx와 runtime verify를 독립 gate로 두고 first failure 뒤의 작업을 차단합니다."
  },
  "overview": [
    "Main ref and GITHUB_SHA",
    "Exact SHA image",
    "Staging bundle",
    "DNS and HTTP-01",
    "Nginx HTTPS",
    "Runtime verify",
    "Public 80·443 only",
    "Rollback"
  ],
  "responsibilities": [
    {
      "name": "Publish job",
      "role": "main ref와 source revision을 검증하고 exact SHA image 하나를 게시합니다.",
      "caution": "GITHUB_SHA가 현재 origin/main과 다르면 image를 게시하지 않습니다."
    },
    {
      "name": "Deploy job and script",
      "role": "runtime env, DNS, staging bundle, certificate와 app 교체 순서를 고정합니다.",
      "caution": "certificate usability 전에는 새 app을 교체하지 않습니다."
    },
    {
      "name": "Nginx and Certbot",
      "role": "HTTP-01, TLS 종료, proxy와 certificate 갱신 수명주기를 맡습니다.",
      "caution": "app image rollback과 certificate volume을 같은 수명으로 다루지 않습니다."
    },
    {
      "name": "Verify job",
      "role": "실행 identity와 외부 HTTPS readiness를 최종 성공 증거로 확인합니다.",
      "caution": "rollback 성공을 시도한 release의 성공으로 바꾸지 않으며 최초 snapshot이 없으면 자동 복구할 수 없습니다."
    }
  ],
  "glossary": [
    {
      "term": "A record",
      "meaning": "도메인 이름을 IPv4 주소로 연결하는 DNS record입니다.",
      "caution": "현재 단일 IPv4 배포에서는 domain의 주소 집합이 EC2 target과 같아야 합니다."
    },
    {
      "term": "HTTP-01",
      "meaning": "인증기관이 공개 80번의 token 경로를 읽어 도메인 제어권을 확인합니다.",
      "caution": "DNS가 맞아도 외부 80이 막히면 최초 발급과 필요한 갱신이 실패합니다."
    },
    {
      "term": "Forwarded header",
      "meaning": "proxy 앞의 원래 host, scheme과 client 정보를 app에 전달합니다.",
      "caution": "Spring Boot가 이를 반영하지 않으면 HTTPS 뒤에서 잘못된 origin을 만들 수 있습니다."
    },
    {
      "term": "Readiness",
      "meaning": "현재 application이 DB·Redis를 포함해 요청을 받을 준비가 됐는지 나타냅니다.",
      "caution": "container running이나 명령 종료만으로 readiness를 대신하지 않습니다."
    }
  ],
  "practical": [
    {
      "title": "첫 실패 gate부터 봅니다",
      "body": "main revision, DNS, HTTP-01, image identity와 readiness 중 처음 non-zero가 된 증거를 원인 분석의 시작점으로 둡니다."
    },
    {
      "title": "공개 port와 내부 port를 분리합니다",
      "body": "Security Group은 80·443만 공개하고 Spring Boot 8080은 처음부터 Compose network 안의 Nginx proxy target으로만 사용합니다."
    },
    {
      "title": "장기 상태는 release와 함께 지우지 않습니다",
      "body": "MySQL data와 certificate named volume은 app image 교체와 rollback에서 보존합니다."
    }
  ],
  "checks": [
    "full commit SHA Docker image가 Git tag가 아닌 이유를 설명할 수 있나요?",
    "DNS 검증과 외부 80이 각각 어느 HTTPS gate에 필요한지 말할 수 있나요?",
    "외부에는 왜 80·443만 열고 app 8080은 Docker network 안에 두어야 하나요?",
    "rollback 성공과 새 release 성공을 분리해 말할 수 있나요?"
  ],
  "next": {
    "id": "11",
    "title": "Refactoring Foundation",
    "reason": "HTTPS 배포 gate가 변경 뒤 실행 증거를 고정하면, 다음에는 테스트와 함께 구조를 작게 정리합니다."
  },
  "sourceDocs": []
};

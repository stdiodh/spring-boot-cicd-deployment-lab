window.visualLabData = {
  "kind": "hub",
  "sequence": "09-10",
  "title": "Deployment Runtime Visual Lab",
  "description": "Spring Boot 실행 단위와 CI/CD 자동화 흐름을 시퀀스별로 탐색합니다.",
  "repo": {
    "name": "spring-boot-deployment-runtime-lab",
    "path": "spring-boot-deployment-runtime-lab"
  },
  "visualLabPath": "docs/visual-lab/index.html",
  "visualLabHubPath": "docs/visual-lab/index.html",
  "flow": [
    {
      "id": "seq-09",
      "label": "09 Docker/Runtime",
      "problem": "로컬에서만 실행되는 애플리케이션은 운영 환경에서 같은 방식으로 재현되기 어렵습니다.",
      "concept": "bootJar, Docker image, container, profile, environment variable",
      "action": "jar를 이미지로 묶고 container runtime에서 설정과 로그를 확인합니다.",
      "check": "빌드 성공, 컨테이너 실행, 환경변수 주입, 로그 확인을 분리합니다."
    },
    {
      "id": "seq-10",
      "label": "10 CI/CD Deployment",
      "problem": "사람이 같은 배포 명령을 반복하면 순서가 흔들리고 실패 차단 기준이 약해집니다.",
      "concept": "workflow, artifact, deploy script, verify",
      "action": "build, deploy, verify 단계를 자동화하고 실패하면 다음 단계로 넘어가지 않게 합니다.",
      "check": "어떤 단계가 실패하면 어디서 멈추는지 설명합니다."
    }
  ],
  "sequences": [
    {
      "sequence": "09",
      "id": "09",
      "title": "Docker/Runtime",
      "topic": "Deployment and runtime environment",
      "href": "./sequences/09/index.html",
      "summary": "내 로컬에서 되던 Spring Boot 앱을 운영 실행 단위로 어떻게 묶을까?"
    },
    {
      "sequence": "10",
      "id": "10",
      "title": "CI/CD Deployment",
      "topic": "Automation and operations flow",
      "href": "./sequences/10/index.html",
      "summary": "한 번 성공한 배포 흐름을 어떻게 반복 가능하고 실패에 강하게 만들까?"
    }
  ]
};

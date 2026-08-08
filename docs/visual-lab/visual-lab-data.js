window.visualLabData = {
  "kind": "hub",
  "sequence": "10",
  "title": "CI/CD Visual Lab",
  "description": "main의 현재 commit을 exact SHA image로 게시하고 HTTPS 운영 환경에 검증·복구하는 흐름을 탐색합니다.",
  "repo": {
    "name": "spring-boot-cicd-deployment-lab",
    "path": "spring-boot-cicd-deployment-lab"
  },
  "visualLabPath": "docs/visual-lab/index.html",
  "visualLabHubPath": "docs/visual-lab/index.html",
  "flow": [
    {
      "id": "seq-10",
      "label": "10 CI/CD Deployment",
      "problem": "main의 검증된 commit과 운영 EC2가 실행하는 image가 다르면 배포 결과를 재현하기 어렵습니다.",
      "concept": "main gate, exact GITHUB_SHA image, HTTPS verify, automatic rollback",
      "action": "main ref와 SHA를 확인하고 image 게시, DNS·HTTPS 배포와 검증을 순서대로 자동화합니다.",
      "check": "어떤 gate가 실패하면 어디서 멈추고 어떤 이전 상태를 복구하는지 설명합니다."
    }
  ],
  "sequences": [
    {
      "sequence": "10",
      "id": "10",
      "title": "CI/CD Deployment",
      "topic": "Automation and operations flow",
      "href": "./sequences/10/index.html",
      "summary": "main의 정확한 commit을 어떻게 한 개의 SHA image와 검증된 HTTPS runtime으로 연결할까?"
    }
  ]
};

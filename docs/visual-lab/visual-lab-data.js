window.visualLabData = {
  sequence: "09",
  title: "Docker/Runtime",
  goal: "로컬 실행과 컨테이너 실행이 어떤 설정과 산출물을 공유하고 달라지는지 본다.",
  implementationBranch: "09-implementation",
  concepts: [
    {
      name: "Jar",
      description: "Spring Boot 애플리케이션을 실행 가능한 파일로 묶은 결과물이다.",
    },
    {
      name: "Dockerfile",
      description: "애플리케이션을 컨테이너 이미지로 만드는 절차를 적은 파일이다.",
    },
    {
      name: "Profile",
      description: "local, prod처럼 실행 환경별 설정을 나누는 기준이다.",
    },
    {
      name: "Environment Variable",
      description: "비밀값과 환경별 값을 코드 밖에서 주입하는 방법이다.",
    },
  ],
  flow: [
    {
      id: "build",
      title: "애플리케이션을 빌드한다",
      actor: "Gradle",
      target: "Boot Jar",
      description: "테스트를 통과한 뒤 실행 가능한 jar 파일을 만든다.",
      checkpoint: "빌드 결과와 테스트 성공 여부를 함께 확인한다.",
    },
    {
      id: "image",
      title: "컨테이너 이미지를 만든다",
      actor: "Docker",
      target: "Image",
      description: "Dockerfile이 jar와 런타임 환경을 이미지로 묶는다.",
      checkpoint: "이미지에 불필요한 로컬 파일이나 비밀값이 들어가지 않는지 확인한다.",
    },
    {
      id: "config",
      title: "환경 설정을 주입한다",
      actor: "Runtime",
      target: "Spring Profile",
      description: "profile과 환경 변수로 DB 주소, 포트, 비밀값을 분리한다.",
      checkpoint: "민감한 값이 문서나 이미지에 직접 들어가지 않았는지 확인한다.",
    },
    {
      id: "compose",
      title: "의존 서비스를 함께 띄운다",
      actor: "Docker Compose",
      target: "App + Database",
      description: "애플리케이션과 DB 같은 런타임 의존성을 한 번에 실행한다.",
      checkpoint: "컨테이너 간 hostname과 포트가 로컬 실행과 어떻게 다른지 확인한다.",
    },
    {
      id: "verify",
      title: "로그와 헬스체크를 본다",
      actor: "Operator",
      target: "Runtime Logs",
      description: "컨테이너 로그와 API 응답으로 애플리케이션이 정상 기동했는지 검증한다.",
      checkpoint: "기동 실패 시 profile, 환경 변수, DB 연결 순서로 확인한다.",
    },
  ],
  checkpoints: [
    "로컬 실행 명령과 컨테이너 실행 명령의 차이를 설명할 수 있다.",
    "Dockerfile에 비밀값을 넣지 않는다.",
    "프로필과 환경 변수로 실행 환경을 분리한다.",
    "실습은 09-implementation 브랜치에서 시작한다.",
  ],
};

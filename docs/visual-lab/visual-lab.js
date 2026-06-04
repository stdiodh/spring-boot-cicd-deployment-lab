(function () {
  const data = window.visualLabData || {};
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const sections = [
    ["overview", "Overview"],
    ["why", "Why"],
    ["mental-model", "Before / After"],
    ["flow", "Flow"],
    ["code", "Code Points"],
    ["object-flow", "Object Flow"],
    ["responsibilities", "Responsibilities"],
    ["concepts", "Concepts"],
    ["terminology", "Terminology"],
    ["practical", "Practical Points"],
    ["references", "References"],
    ["checklist", "Checklist"],
    ["next", "Next"],
  ];

  const state = {
    sequenceId: "",
    flowIndex: 0,
    stepIndex: 0,
    isPlaying: false,
    speedIndex: 0,
    timerId: 0,
  };

  const playbackSpeeds = [
    { label: "1x", ms: 2400 },
    { label: "1.5x", ms: 1600 },
    { label: "2x", ms: 1000 },
  ];

  const actorKindLabels = {
    person: "사람",
    client: "클라이언트",
    browser: "브라우저",
    "external-auth": "외부 인증",
    server: "서버",
    logic: "서버 로직",
    db: "DB",
    cache: "Cache",
    queue: "Queue",
    mail: "SMTP",
    ci: "CI/CD",
    infra: "Infra",
  };

  const officialReferences = {
    "00": [
      { label: "MDN HTTP", href: "https://developer.mozilla.org/docs/Web/HTTP", reason: "HTTP 메서드, 상태 코드, 요청/응답 기본기를 확인합니다." },
      { label: "MDN JSON", href: "https://developer.mozilla.org/docs/Learn/JavaScript/Objects/JSON", reason: "JSON body와 응답 구조를 읽는 기준입니다." },
      { label: "Git Documentation", href: "https://git-scm.com/doc", reason: "clone, branch, commit 흐름을 공식 문서로 확인합니다." },
    ],
    "01": [
      { label: "Spring Web MVC", href: "https://docs.spring.io/spring-framework/reference/web/webmvc.html", reason: "Controller와 HTTP 요청 매핑 흐름의 기준 문서입니다." },
      { label: "Spring Boot Reference", href: "https://docs.spring.io/spring-boot/index.html", reason: "Spring Boot 애플리케이션 구조와 실행 기준입니다." },
    ],
    "02": [
      { label: "Spring Data JPA", href: "https://docs.spring.io/spring-data/jpa/reference/", reason: "Repository 기반 DB 접근 흐름을 확인합니다." },
      { label: "Spring Boot Data Access", href: "https://docs.spring.io/spring-boot/reference/data/index.html", reason: "Spring Boot의 데이터 접근 설정 기준입니다." },
      { label: "MySQL Documentation", href: "https://dev.mysql.com/doc/", reason: "MySQL 저장소와 SQL 기본 동작의 공식 기준입니다." },
    ],
    "03": [
      { label: "Spring Validation", href: "https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html", reason: "Bean Validation 연동과 검증 흐름을 확인합니다." },
      { label: "Jakarta Bean Validation", href: "https://jakarta.ee/specifications/bean-validation/", reason: "검증 annotation의 표준 기준입니다." },
    ],
    "04": [
      { label: "Spring Security", href: "https://docs.spring.io/spring-security/reference/", reason: "인증 필터와 보호 API 흐름을 확인합니다." },
      { label: "JWT RFC 7519", href: "https://www.rfc-editor.org/rfc/rfc7519", reason: "JWT claim과 token 형식의 표준 문서입니다." },
    ],
    "05": [
      { label: "Spring Security OAuth2 Client", href: "https://docs.spring.io/spring-security/reference/servlet/oauth2/login/index.html", reason: "OAuth2 login과 provider profile 처리 기준입니다." },
      { label: "Spring Email", href: "https://docs.spring.io/spring-framework/reference/integration/email.html", reason: "Spring 기반 메일 발송 흐름을 확인합니다." },
      { label: "Google Identity", href: "https://developers.google.com/identity", reason: "Google OAuth profile과 identity 흐름의 공식 기준입니다." },
    ],
    "06": [
      { label: "JUnit 5", href: "https://junit.org/junit5/docs/current/user-guide/", reason: "테스트 구조와 assertion 기준입니다." },
      { label: "Spring Boot Testing", href: "https://docs.spring.io/spring-boot/reference/testing/", reason: "Spring Boot 테스트 설정과 범위를 확인합니다." },
      { label: "Mockito", href: "https://site.mockito.org/", reason: "mock 기반 service 테스트의 공식 참고입니다." },
    ],
    "07": [
      { label: "Redis Documentation", href: "https://redis.io/docs/latest/", reason: "Redis key-value 저장과 TTL 기준입니다." },
      { label: "Spring Data Redis", href: "https://docs.spring.io/spring-data/redis/reference/", reason: "RedisTemplate과 Spring Redis 연동 기준입니다." },
      { label: "Spring Cache", href: "https://docs.spring.io/spring-framework/reference/integration/cache.html", reason: "캐시 추상화와 cache-aside 사고를 비교합니다." },
    ],
    "08": [
      { label: "Spring WebSocket", href: "https://docs.spring.io/spring-framework/reference/web/websocket.html", reason: "WebSocket과 STOMP 설정 기준입니다." },
      { label: "MDN WebSocket", href: "https://developer.mozilla.org/docs/Web/API/WebSocket", reason: "브라우저 WebSocket API의 공식 참고입니다." },
    ],
    "09": [
      { label: "Docker Documentation", href: "https://docs.docker.com/", reason: "image, container, compose 실행 단위 기준입니다." },
      { label: "Spring Boot Container Images", href: "https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html", reason: "Spring Boot 애플리케이션 컨테이너화 기준입니다." },
    ],
    "10": [
      { label: "GitHub Actions", href: "https://docs.github.com/actions", reason: "workflow, job, artifact, secret 사용 기준입니다." },
      { label: "Spring Boot Gradle Plugin", href: "https://docs.spring.io/spring-boot/gradle-plugin/index.html", reason: "bootJar와 Gradle 빌드 기준입니다." },
    ],
    "11": [
      { label: "Spring Boot Testing", href: "https://docs.spring.io/spring-boot/reference/testing/", reason: "리팩터링 전후 동작 보존을 확인하는 테스트 기준입니다." },
      { label: "Spring Validation", href: "https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html", reason: "검증 책임 분리 기준입니다." },
    ],
    "12": [
      { label: "RabbitMQ Documentation", href: "https://www.rabbitmq.com/docs", reason: "exchange, queue, routing key 기준입니다." },
      { label: "Spring AMQP", href: "https://docs.spring.io/spring-amqp/reference/", reason: "RabbitTemplate과 listener 설정 기준입니다." },
      { label: "Spring Application Events", href: "https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events", reason: "Spring 이벤트 사고와 메시징을 비교합니다." },
    ],
  };

  function normalizeSequences() {
    if (Array.isArray(data.sequences) && data.sequences.length > 0) {
      return data.sequences;
    }

    if (data.kind === "sequence") {
      return [
        {
          id: data.sequence || "NN",
          title: data.title || "Visual Lab",
          question: data.problem || data.goal || "이 시퀀스의 흐름을 어떻게 설명할 수 있을까요?",
          goal: data.goal || "핵심 흐름을 단계별로 확인합니다.",
          why: {
            problem: data.problem,
          },
          overview: data.overview || [],
          actors: data.actors || [],
          flows: data.flows || [],
          codePoints: data.codePoints || [],
          concepts: data.concepts || [],
          checks: data.practice || data.checks || [],
          next: data.next || {},
        },
      ];
    }

    return [
      {
        id: data.sequence || "NN",
        title: data.title || "Visual Lab",
        question: data.problem || data.goal || "이 시퀀스의 흐름을 어떻게 설명할 수 있을까요?",
        goal: data.goal || "핵심 흐름을 단계별로 확인합니다.",
        overview: (data.flow || []).map((step) => step.label || step.id).filter(Boolean),
        flows: [
          {
            id: "main-flow",
            title: "학습 흐름",
            summary: data.problem || data.goal || "준비된 학습 흐름을 확인합니다.",
            steps: (data.flow || []).map((step, index) => ({
              order: index + 1,
              actor: step.label || "Step",
              input: step.problem || "",
              owner: step.concept || "",
              action: step.action || "",
              output: step.check || "",
              note: step.concept || "",
            })),
          },
        ],
        concepts: data.concepts || [],
        checks: data.practice || [],
      },
    ];
  }

  const sequences = normalizeSequences();

  function getHashSequenceId() {
    const match = window.location.hash.match(/^#seq-([0-9]{2})$/);
    return match ? match[1] : "";
  }

  function findSequence(id) {
    return sequences.find((sequence) => sequence.id === id) || sequences[0];
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = text;
    }
    return element;
  }

  function appendText(parent, tagName, className, text) {
    if (!text) {
      return null;
    }
    const element = createElement(tagName, className, text);
    parent.appendChild(element);
    return element;
  }

  function makeSection(id, eyebrow, title, lede) {
    const section = createElement("section", "doc-section");
    section.id = id;
    const heading = createElement("div", "section-heading");
    heading.append(
      createElement("p", "eyebrow", eyebrow),
      createElement("h2", "", title)
    );
    section.appendChild(heading);
    appendText(section, "p", "lede", lede);
    return section;
  }

  function makeLink(label, href) {
    const anchor = createElement("a", "source-link", label);
    anchor.href = href;
    return anchor;
  }

  function normalizeActorKind(kind) {
    const value = String(kind || "").trim().toLowerCase();
    if (value === "user" || value === "human") return "person";
    if (value === "web" || value === "frontend") return "client";
    if (value === "auth" || value === "oauth" || value === "external") return "external-auth";
    if (value === "service" || value === "internal" || value === "component") return "logic";
    if (value === "database" || value === "mysql" || value === "postgres") return "db";
    if (value === "redis") return "cache";
    if (value === "broker" || value === "event") return "queue";
    if (value === "smtp" || value === "email") return "mail";
    if (value === "cicd" || value === "pipeline") return "ci";
    if (actorKindLabels[value]) return value;
    return "logic";
  }

  function inferActorKind(name) {
    const value = String(name || "").toLowerCase();
    if (/user|사용자|student|client/.test(value)) return value.includes("client") ? "client" : "person";
    if (/browser|postman|swagger|frontend|client|브라우저/.test(value)) return "client";
    if (/google|oauth|external|provider/.test(value)) return "external-auth";
    if (/controller|api|server/.test(value)) return "server";
    if (/service|handler|filter|validation|repository|dto|entity|response|fixture|mock/.test(value)) return "logic";
    if (/mysql|db|database|table|repository/.test(value)) return "db";
    if (/redis|cache|ttl/.test(value)) return "cache";
    if (/queue|rabbit|broker|event|consumer|publisher/.test(value)) return "queue";
    if (/mail|smtp|email/.test(value)) return "mail";
    if (/github|actions|workflow|ci|deploy|verify/.test(value)) return "ci";
    if (/docker|container|runtime|infra|ec2|compose|jar/.test(value)) return "infra";
    return "logic";
  }

  function actorKey(actor) {
    return String(actor.id || actor.label || actor.name || "").toLowerCase();
  }

  function actorLabel(actor) {
    return actor.label || actor.name || actor.id || "Actor";
  }

  function actorMeta(value, declaredActors) {
    const key = String(value || "").toLowerCase();
    const found = declaredActors.find((actor) => actorKey(actor) === key || String(actorLabel(actor)).toLowerCase() === key);
    if (found) {
      return {
        id: found.id || actorLabel(found),
        label: actorLabel(found),
        kind: normalizeActorKind(found.kind),
      };
    }
    return {
      id: value || "actor",
      label: value || "Actor",
      kind: inferActorKind(value),
    };
  }

  function collectActors(sequence, flow) {
    const declared = Array.isArray(sequence.actors) ? sequence.actors : [];
    const actors = [];
    const seen = new Set();

    function add(value) {
      const meta = actorMeta(value, declared);
      const key = String(meta.id || meta.label).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        actors.push(meta);
      }
    }

    declared.forEach((actor) => add(actor.id || actor.label || actor.name));
    (flow.steps || []).forEach((step) => {
      add(step.from || step.actor);
      add(step.to || step.owner);
    });

    return actors;
  }

  function inferMessageKind(flow, step) {
    const raw = String(step.messageKind || step.kind || flow.messageKind || "").toLowerCase();
    if (["request", "response", "event", "error"].includes(raw)) return raw;
    const text = `${flow.title || ""} ${step.action || ""} ${step.output || ""}`.toLowerCase();
    if (/fail|error|예외|실패|invalid/.test(text)) return "error";
    if (/event|publish|consume|broadcast|queue|메시지|이벤트/.test(text)) return "event";
    if (/response|return|응답|결과|output/.test(text)) return "response";
    return "request";
  }

  function getCodePoints(sequence) {
    return Array.isArray(sequence.codePoints) ? sequence.codePoints : [];
  }

  function normalizeSnippet(snippet) {
    return String(snippet || "").trim();
  }

  function makeCodePointCard(codePoint, compact) {
    const card = createElement("figure", compact ? "code-point-card is-compact" : "code-point-card");
    const header = createElement("figcaption", "");
    const title = createElement("strong", "", codePoint.title || "핵심 코드 포인트");
    const meta = createElement("span", "", `${codePoint.file || "파일 경로 준비 중"} · ${codePoint.language || "text"}`);
    header.append(title, meta);

    const pre = createElement("pre", "code-box");
    const code = createElement("code", "");
    code.textContent = normalizeSnippet(codePoint.snippet) || "// 핵심 코드 조각을 준비 중입니다.";
    pre.appendChild(code);

    const body = createElement("div", "code-point-body");
    appendText(body, "p", "", codePoint.explanation);
    appendText(body, "p", "code-check", codePoint.check);

    card.append(header, pre, body);
    return card;
  }

  function stepCodePoints(sequence, step) {
    const codePoints = getCodePoints(sequence);
    const ids = Array.isArray(step.codePointIds) ? step.codePointIds : [];
    const selected = ids
      .map((id) => codePoints.find((point) => point.id === id))
      .filter(Boolean);

    if (selected.length > 0) {
      return selected;
    }

    return codePoints.slice(0, 2);
  }

  function currentSequence() {
    return findSequence(state.sequenceId);
  }

  function currentFlow(sequence) {
    const flows = Array.isArray(sequence.flows) ? sequence.flows : [];
    return flows[state.flowIndex] || flows[0] || { title: "학습 흐름", steps: [] };
  }

  function getObjectFlow(sequence) {
    if (Array.isArray(sequence.objectFlow) && sequence.objectFlow.length > 0) {
      return sequence.objectFlow;
    }

    return (sequence.overview || []).map((item, index) => ({
      name: item,
      type: index === 0 ? "Start" : index === (sequence.overview || []).length - 1 ? "Result" : "Boundary",
      layer: index === 0 ? "Input" : index === (sequence.overview || []).length - 1 ? "Output" : "Flow",
    }));
  }

  function getReferences(sequence) {
    if (Array.isArray(sequence.references) && sequence.references.length > 0) {
      return sequence.references;
    }

    return officialReferences[sequence.id] || [];
  }

  function currentSpeed() {
    return playbackSpeeds[state.speedIndex] || playbackSpeeds[0];
  }

  function clearPlaybackTimer() {
    if (state.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = 0;
    }
  }

  function schedulePlayback() {
    clearPlaybackTimer();

    if (!state.isPlaying) {
      return;
    }

    const steps = currentFlow(currentSequence()).steps || [];
    if (state.stepIndex >= steps.length - 1) {
      state.isPlaying = false;
      return;
    }

    state.timerId = window.setTimeout(() => {
      state.stepIndex = Math.min(steps.length - 1, state.stepIndex + 1);
      if (state.stepIndex >= steps.length - 1) {
        state.isPlaying = false;
      }
      render();
    }, currentSpeed().ms);
  }

  function setDocumentTitle(sequence) {
    const repoName = data.repo && data.repo.name ? data.repo.name : "A&I Code Lab";
    document.title = `${sequence.id} ${sequence.title} | ${repoName} Visual Lab`;
  }

  function renderTopbar(root) {
    const topbar = createElement("header", "topbar");
    const inner = createElement("div", "topbar-inner");
    const brand = createElement("div", "brand-lockup");
    brand.append(
      createElement("div", "brand-title", "A&I Code Lab"),
      createElement("div", "brand-subtitle", "Visual Lab")
    );
    const repoName = data.repo && data.repo.name ? data.repo.name : data.title || "Topic Repository";
    const repoGroup = data.sequence ? `Sequence ${data.sequence}` : "Sequence";
    const repo = createElement("div", "repo-label", `${repoName} · ${repoGroup}`);
    inner.append(brand, repo);
    topbar.appendChild(inner);
    root.appendChild(topbar);
  }

  function renderSequenceSwitcher(root) {
    const bar = createElement("nav", "sequence-bar");
    bar.setAttribute("aria-label", "Sequence switcher");
    const switcher = createElement("div", "sequence-switcher");

    sequences.forEach((sequence) => {
      const button = createElement("button", "sequence-tab", `${sequence.id} ${sequence.title}`);
      button.type = "button";
      button.setAttribute("aria-pressed", String(sequence.id === state.sequenceId));
      button.setAttribute("aria-label", `${sequence.id} ${sequence.title} 시퀀스 보기`);
      if (sequence.id === state.sequenceId) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        state.sequenceId = sequence.id;
        state.flowIndex = 0;
        state.stepIndex = 0;
        window.location.hash = `seq-${sequence.id}`;
        render();
      });
      switcher.appendChild(button);
    });

    bar.appendChild(switcher);
    root.appendChild(bar);
  }

  function renderSectionNav(layout) {
    const nav = createElement("nav", "section-nav");
    nav.setAttribute("aria-label", "Section navigation");

    sections.forEach(([id, label], index) => {
      const link = createElement("a", "section-link", label);
      link.href = `#${id}`;
      if (index === 0) {
        link.classList.add("is-active");
      }
      nav.appendChild(link);
    });

    layout.appendChild(nav);
  }

  function renderHero(stack, sequence) {
    const hero = createElement("section", "hero");
    hero.id = "overview";
    hero.append(
      createElement("p", "eyebrow", `Sequence ${sequence.id}`),
      createElement("h1", "", sequence.title || data.title || "Visual Lab")
    );
    appendText(hero, "p", "question", sequence.question);
    appendText(hero, "p", "goal", sequence.goal || data.goal);

    const sourceLinks = createElement("div", "source-links");
    const source = sequence.source || {};
    const sourceItems = [
      ["Theory", source.theory],
      ["Implementation", source.implementation],
      ["Checklist", source.checklist],
    ].filter((item) => item[1]);

    if (sourceItems.length === 0 && Array.isArray(sequence.sourceDocs)) {
      sequence.sourceDocs.forEach((item) => {
        if (item.href && item.label) {
          sourceLinks.appendChild(makeLink(item.label, item.href));
        }
      });
    } else {
      sourceItems.forEach(([label, href]) => sourceLinks.appendChild(makeLink(label, href)));
    }

    if (sourceLinks.childNodes.length > 0) {
      hero.appendChild(sourceLinks);
    }

    stack.appendChild(hero);
  }

  function renderWhy(stack, sequence) {
    const why = sequence.why || {};
    const section = makeSection("why", "Why", "왜 이 시퀀스를 배우는가", why.problem);
    const grid = createElement("div", "card-grid");

    (why.limits || []).forEach((limit, index) => {
      const card = createElement("article", "info-card summary-box");
      card.append(
        createElement("h3", "", `한계 ${index + 1}`),
        createElement("p", "", limit)
      );
      grid.appendChild(card);
    });

    if (why.choice) {
      const card = createElement("article", "info-card summary-box");
      card.append(createElement("h3", "", "이번 선택"), createElement("p", "", why.choice));
      grid.appendChild(card);
    }

    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "문제 배경을 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderMentalModel(stack, sequence) {
    const model = sequence.mentalModel || {};
    const why = sequence.why || {};
    const before = model.before || (why.limits && why.limits[0]) || "기존 방식의 한계를 먼저 확인합니다.";
    const after = model.after || why.choice || "이번 시퀀스에서 선택한 책임 분리 기준을 확인합니다.";
    const section = makeSection("mental-model", "Before / After", "사고방식 전환", "이 시퀀스를 지나며 무엇을 다르게 보게 되는지 비교합니다.");
    const grid = createElement("div", "mental-grid");
    [
      ["Before", before],
      ["After", after],
    ].forEach(([label, text]) => {
      const card = createElement("article", "mental-card");
      card.append(createElement("span", "mental-label", label), createElement("p", "", text));
      grid.appendChild(card);
    });
    section.appendChild(grid);
    stack.appendChild(section);
  }

  function renderOverviewLine(section, sequence) {
    const overview = Array.isArray(sequence.overview) ? sequence.overview : [];
    if (overview.length === 0) {
      section.appendChild(createElement("p", "empty-state", "핵심 흐름을 준비 중입니다."));
      return;
    }

    const line = createElement("div", "overview-line");
    overview.forEach((item, index) => {
      line.appendChild(createElement("span", "overview-node", item));
      if (index < overview.length - 1) {
        line.appendChild(createElement("span", "overview-arrow", "->"));
      }
    });
    section.appendChild(line);
  }

  function renderActorDiagram(parent, flow, sequence) {
    const steps = Array.isArray(flow.steps) ? flow.steps : [];
    if (steps.length === 0) {
      return;
    }

    const actors = collectActors(sequence, flow);

    const panel = createElement("div", "actor-diagram");
    panel.appendChild(createElement("h3", "", "Sequence Diagram"));
    const bandKind = flow.bandKind || (/fail|error|실패|예외/.test(String(flow.title || "").toLowerCase()) ? "case" : "scenario");
    const band = createElement("div", `diagram-band ${bandKind}`, flow.title || "Scenario");
    if (flow.summary) {
      band.setAttribute("title", flow.summary);
    }
    panel.appendChild(band);

    const diagram = createElement("div", "sequence-diagram diagram-board");
    diagram.style.setProperty("--lane-count", String(Math.max(actors.length, 1)));

    const lanes = createElement("div", "sequence-participants diagram-actor-row");
    actors.forEach((actor) => {
      const lane = createElement("div", "sequence-participant diagram-actor");
      lane.classList.add(`is-${actor.kind}`);
      const icon = createElement("span", `diagram-actor-icon is-${actor.kind}`, "");
      icon.setAttribute("aria-hidden", "true");
      const text = createElement("span", "diagram-actor-text");
      text.append(createElement("strong", "", actor.label), createElement("small", "", actorKindLabels[actor.kind] || actor.kind));
      lane.append(icon, text);
      lanes.appendChild(lane);
    });
    diagram.appendChild(lanes);

    const messages = createElement("ol", "sequence-messages");
    steps.forEach((step, index) => {
      const fromMeta = actorMeta(step.from || step.actor || actorLabel(actors[0]), actors);
      const toMeta = actorMeta(step.to || step.owner || step.actor || actorLabel(actors[Math.min(index + 1, actors.length - 1)]), actors);
      const from = Math.max(actors.findIndex((actor) => actor.label === fromMeta.label || actor.id === fromMeta.id), 0) + 1;
      const to = Math.max(actors.findIndex((actor) => actor.label === toMeta.label || actor.id === toMeta.id), 0) + 1;
      const start = Math.min(from, to);
      const span = Math.max(Math.abs(to - from) + 1, 1);
      const messageKind = inferMessageKind(flow, step);
      const item = createElement("li", "sequence-row");
      item.style.setProperty("--lane-count", String(Math.max(actors.length, 1)));
      if (index === state.stepIndex) {
        item.classList.add("is-active");
      }

      actors.forEach(() => item.appendChild(createElement("span", "sequence-lifeline diagram-lifeline", "")));

      const message = createElement("div", "sequence-message diagram-message");
      if (index === state.stepIndex) {
        message.classList.add("is-active");
      }
      if (from === to) {
        message.classList.add("is-self");
      } else if (from > to) {
        message.classList.add("is-backward");
      }
      message.classList.add(`is-${messageKind}`);
      message.style.gridColumn = `${start} / span ${span}`;
      message.append(
        createElement("span", "message-index", String(index + 1)),
        createElement("span", "sequence-route", `${fromMeta.label} -> ${toMeta.label}`),
        createElement("span", "sequence-label", step.message || step.action || step.input || "단계 설명을 준비 중입니다."),
        createElement("span", "sequence-arrow", "")
      );
      item.appendChild(message);
      messages.appendChild(item);
    });
    diagram.appendChild(messages);
    panel.appendChild(diagram);
    parent.appendChild(panel);
  }

  function renderFlow(stack, sequence) {
    const section = makeSection("flow", "Flow", "핵심 흐름과 시퀀스 다이어그램", "이론 문서의 실행 흐름을 단계별로 눌러 확인합니다.");
    renderOverviewLine(section, sequence);

    const flows = Array.isArray(sequence.flows) ? sequence.flows : [];
    if (flows.length === 0) {
      section.appendChild(createElement("p", "empty-state", "시퀀스 다이어그램 데이터를 준비 중입니다."));
      stack.appendChild(section);
      return;
    }

    const shell = createElement("div", "flow-shell step-explorer support-layout");
    const tabs = createElement("div", "flow-tabs");
    flows.forEach((flow, index) => {
      const button = createElement("button", "flow-tab", flow.title || `Flow ${index + 1}`);
      button.type = "button";
      button.setAttribute("aria-pressed", String(index === state.flowIndex));
      button.setAttribute("aria-label", `${flow.title || `Flow ${index + 1}`} 흐름 보기`);
      if (index === state.flowIndex) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        state.flowIndex = index;
        state.stepIndex = 0;
        render();
      });
      tabs.appendChild(button);
    });
    shell.appendChild(tabs);

    const flow = currentFlow(sequence);
    appendText(shell, "p", "flow-summary", flow.summary);
    renderActorDiagram(shell, flow, sequence);

    const diagram = createElement("div", "diagram-layout detail-context-layout");
    const rail = createElement("div", "step-rail");
    const steps = Array.isArray(flow.steps) ? flow.steps : [];

    steps.forEach((step, index) => {
      const label = step.owner || step.actor || `Step ${index + 1}`;
      const button = createElement("button", "step-button step-rail-button", `${index + 1}. ${label}`);
      button.type = "button";
      button.setAttribute("aria-pressed", String(index === state.stepIndex));
      button.setAttribute("aria-label", `${index + 1}단계 ${label} 보기`);
      if (index === state.stepIndex) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        state.stepIndex = index;
        render();
      });
      rail.appendChild(button);
    });

    const selectedStep = steps[state.stepIndex] || {};
    const detail = createElement("article", "step-detail step-stage");
    detail.setAttribute("aria-live", "polite");
    detail.append(
      createElement("p", "view-label", "Step View"),
      createElement("p", "step-meta", `Step ${selectedStep.order || state.stepIndex + 1}`),
      createElement("h3", "", selectedStep.owner || selectedStep.actor || "단계 준비 중")
    );
    appendText(detail, "p", "lede", selectedStep.note);

    const fields = createElement("dl", "step-fields step-io-grid");
    [
      ["Problem", selectedStep.problem || selectedStep.input],
      ["Concept", selectedStep.concept || selectedStep.owner],
      ["Action", selectedStep.action],
      ["Check", selectedStep.check || selectedStep.output],
      ["From", selectedStep.actor || selectedStep.from],
      ["To", selectedStep.owner || selectedStep.to],
    ].forEach(([label, value]) => {
      const field = createElement("div", "step-field step-io-card");
      field.append(createElement("dt", "", label), createElement("dd", "", value || "준비 중입니다."));
      fields.appendChild(field);
    });
    detail.appendChild(fields);

    const linkedCodePoints = stepCodePoints(sequence, selectedStep);
    if (linkedCodePoints.length > 0) {
      const codeWrap = createElement("div", "step-code-points");
      codeWrap.appendChild(createElement("h4", "", "이 단계에서 볼 코드"));
      linkedCodePoints.forEach((point) => codeWrap.appendChild(makeCodePointCard(point, true)));
      detail.appendChild(codeWrap);
    }

    const controls = createElement("div", "step-controls");
    const progressValue = steps.length > 0 ? ((state.stepIndex + 1) / steps.length) * 100 : 0;
    const progress = createElement("div", "step-progress step-progress-track");
    progress.setAttribute("aria-label", `현재 단계 ${steps.length ? state.stepIndex + 1 : 0} / ${steps.length}`);
    const progressFill = createElement("span", "step-progress-fill");
    progressFill.style.width = `${progressValue}%`;
    progress.appendChild(progressFill);
    const progressText = createElement("span", "progress-text", `${steps.length ? state.stepIndex + 1 : 0} / ${steps.length}`);
    const group = createElement("div", "control-group step-playback");
    const prev = createElement("button", "control-button", "이전");
    prev.type = "button";
    prev.disabled = state.stepIndex === 0;
    prev.setAttribute("aria-label", "이전 단계 보기");
    prev.addEventListener("click", () => {
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      render();
    });
    const play = createElement("button", "control-button", state.isPlaying ? "일시정지" : "재생");
    play.type = "button";
    play.disabled = steps.length <= 1;
    play.setAttribute("aria-pressed", String(state.isPlaying));
    play.setAttribute("aria-label", state.isPlaying ? "단계 자동 재생 일시정지" : "단계 자동 재생 시작");
    play.addEventListener("click", () => {
      if (!state.isPlaying && state.stepIndex >= steps.length - 1) {
        state.stepIndex = 0;
      }
      state.isPlaying = !state.isPlaying;
      render();
    });
    const speed = createElement("button", "control-button", `속도 ${currentSpeed().label}`);
    speed.type = "button";
    speed.disabled = steps.length <= 1;
    speed.setAttribute("aria-label", "자동 재생 속도 변경");
    speed.addEventListener("click", () => {
      state.speedIndex = (state.speedIndex + 1) % playbackSpeeds.length;
      render();
    });
    const next = createElement("button", "control-button", "다음");
    next.type = "button";
    next.disabled = state.stepIndex >= steps.length - 1;
    next.setAttribute("aria-label", "다음 단계 보기");
    next.addEventListener("click", () => {
      state.stepIndex = Math.min(steps.length - 1, state.stepIndex + 1);
      render();
    });
    group.append(prev, play, speed, next);
    controls.append(progress, progressText, group);
    detail.appendChild(controls);

    diagram.append(rail.childNodes.length ? rail : createElement("p", "empty-state", "단계 데이터를 준비 중입니다."), detail);
    shell.appendChild(diagram);

    if (flow.mermaid) {
      const details = createElement("details", "code-panel source-panel");
      details.append(createElement("summary", "", "Source View: Mermaid 원문 보기"), createElement("pre", "", flow.mermaid));
      shell.appendChild(details);
    }

    section.appendChild(shell);
    stack.appendChild(section);
  }

  function renderCodePoints(stack, sequence) {
    const section = makeSection("code", "Code Points", "주요 코드 포인트", "전체 정답 코드 대신 파일 경로, 핵심 5-20줄, 확인 포인트만 봅니다.");
    const codePoints = getCodePoints(sequence);
    const grid = createElement("div", "code-point-grid");
    codePoints.forEach((point) => grid.appendChild(makeCodePointCard(point, false)));
    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "코드 포인트를 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderObjectFlow(stack, sequence) {
    const items = getObjectFlow(sequence);
    const section = makeSection("object-flow", "Object Flow", "객체와 계층 이동", "DTO, Entity, Message, Config, Runtime 객체가 어디를 지나며 바뀌는지 봅니다.");
    const strip = createElement("div", "object-flow-strip");
    items.forEach((item, index) => {
      const chip = createElement("article", "object-chip");
      chip.append(
        createElement("span", "object-layer", item.layer || `Layer ${index + 1}`),
        createElement("h3", "", item.name || item),
        createElement("p", "", item.type || item.role || "흐름 구성요소")
      );
      strip.appendChild(chip);
      if (index < items.length - 1) {
        strip.appendChild(createElement("span", "object-arrow", "->"));
      }
    });
    section.appendChild(strip.childNodes.length ? strip : createElement("p", "empty-state", "객체 흐름을 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderResponsibilities(stack, sequence) {
    const section = makeSection("responsibilities", "Responsibilities", "책임 지도", "각 계층과 구성요소가 맡는 일을 분리해서 봅니다.");
    const grid = createElement("div", "responsibility-grid");
    (sequence.responsibilities || []).forEach((item) => {
      const card = createElement("article", "responsibility-card");
      card.append(createElement("h3", "", item.name), createElement("p", "", item.role || ""));
      appendText(card, "p", "lede", item.caution);
      grid.appendChild(card);
    });
    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "책임 지도를 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderConcepts(stack, sequence) {
    const section = makeSection("concepts", "Concepts", "핵심 개념", "이번 시퀀스를 읽을 때 먼저 붙잡아야 할 개념입니다.");
    const grid = createElement("div", "concept-grid");
    (sequence.concepts || []).forEach((item) => {
      const card = createElement("article", "concept-card");
      card.append(createElement("h3", "", item.title || item.name), createElement("p", "", item.body || item.description || ""));
      grid.appendChild(card);
    });
    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "핵심 개념을 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderGlossary(stack, sequence) {
    const section = makeSection("terminology", "Terminology", "용어 정리", "같은 단어라도 이번 시퀀스 안에서 어떤 의미인지 확인합니다.");
    const glossary = sequence.glossary || [];

    if (glossary.length === 0) {
      section.appendChild(createElement("p", "empty-state", "용어 정리를 준비 중입니다."));
      stack.appendChild(section);
      return;
    }

    const wrap = createElement("div", "glossary-table-wrap");
    const table = createElement("table", "glossary-table");
    const thead = createElement("thead");
    const headRow = createElement("tr");
    ["용어", "이번 시퀀스에서의 의미", "헷갈리기 쉬운 점"].forEach((label) => headRow.appendChild(createElement("th", "", label)));
    thead.appendChild(headRow);
    const tbody = createElement("tbody");
    glossary.forEach((item) => {
      const row = createElement("tr");
      row.append(
        createElement("td", "", item.term),
        createElement("td", "", item.meaning),
        createElement("td", "", item.caution)
      );
      tbody.appendChild(row);
    });
    table.append(thead, tbody);
    wrap.appendChild(table);
    section.appendChild(wrap);
    stack.appendChild(section);
  }

  function renderPractical(stack, sequence) {
    const section = makeSection("practical", "Practical Points", "실무 포인트", "이번 범위에서 일부러 남기는 한계와 실제 코드 리뷰에서 자주 보는 지점을 확인합니다.");
    const grid = createElement("div", "practical-grid");
    (sequence.practical || []).forEach((item) => {
      const card = createElement("article", "practical-card");
      card.append(createElement("h3", "", item.title), createElement("p", "", item.body));
      grid.appendChild(card);
    });
    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "실무 포인트를 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderReferences(stack, sequence) {
    const references = getReferences(sequence);
    const section = makeSection("references", "Official References", "공식 문서 레퍼런스", "Visual Lab은 공식 문서를 script나 style로 불러오지 않고, 학습 링크로만 연결합니다.");
    const grid = createElement("div", "reference-grid");
    references.forEach((item) => {
      const card = createElement("a", "reference-card related-link-card", "");
      card.href = item.href;
      card.target = "_blank";
      card.rel = "noreferrer";
      card.append(createElement("h3", "", item.label), createElement("p", "", item.reason || "공식 문서로 기준을 확인합니다."));
      grid.appendChild(card);
    });
    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "공식 문서 레퍼런스를 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderChecks(stack, sequence) {
    const section = makeSection("checklist", "Practice Check", "스스로 확인할 질문", "구현 후 말로 설명할 수 있어야 하는 기준입니다.");
    const grid = createElement("div", "check-grid");
    (sequence.checks || []).forEach((item) => {
      const card = createElement("article", "check-card");
      card.append(createElement("span", "check-marker", "?"), createElement("p", "", item));
      grid.appendChild(card);
    });
    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "확인 질문을 준비 중입니다."));
    stack.appendChild(section);
  }

  function renderNext(stack, sequence) {
    const next = sequence.next || {};
    const section = makeSection("next", "Next", "다음 단계", next.reason || "다음 시퀀스로 이어지는 지점을 확인합니다.");
    const panel = createElement("article", "next-panel");
    panel.append(
      createElement("h3", "", next.id && next.title ? `${next.id} ${next.title}` : "다음 학습으로 연결"),
      createElement("p", "", next.reason || "다음 시퀀스 정보를 준비 중입니다.")
    );
    section.appendChild(panel);
    stack.appendChild(section);
  }

  function renderContent(root) {
    const sequence = currentSequence();
    setDocumentTitle(sequence);

    const layout = createElement("div", "layout");
    renderSectionNav(layout);

    const stack = createElement("main", "content-stack");
    stack.setAttribute("aria-label", "Visual Lab content");
    renderHero(stack, sequence);
    renderWhy(stack, sequence);
    renderMentalModel(stack, sequence);
    renderFlow(stack, sequence);
    renderCodePoints(stack, sequence);
    renderObjectFlow(stack, sequence);
    renderResponsibilities(stack, sequence);
    renderConcepts(stack, sequence);
    renderGlossary(stack, sequence);
    renderPractical(stack, sequence);
    renderReferences(stack, sequence);
    renderChecks(stack, sequence);
    renderNext(stack, sequence);

    layout.appendChild(stack);
    root.appendChild(layout);
  }

  function initializeState() {
    const hashId = getHashSequenceId();
    const defaultId = data.defaultSequence || (sequences[0] && sequences[0].id) || "NN";
    state.sequenceId = findSequence(hashId).id || defaultId;
    if (data.kind !== "hub" && !hashId && state.sequenceId) {
      window.history.replaceState(null, "", `#seq-${state.sequenceId}`);
    }
  }

  function renderHub(root) {
    renderTopbar(root);

    const shell = createElement("main", "page-shell hub-page");
    const container = createElement("div", "visual-container");
    const hero = createElement("section", "hub-hero visual-card");
    hero.append(
      createElement("p", "eyebrow", "Visual Lab Hub"),
      createElement("h1", "", data.title || "A&I Visual Lab"),
      createElement("p", "goal", data.description || data.goal || "이 토픽 레포에서 다루는 시퀀스 목록과 상세 Visual Lab으로 이동합니다.")
    );
    container.appendChild(hero);

    const grid = createElement("section", "sequence-hub-grid");
    (Array.isArray(data.sequences) ? data.sequences : []).forEach((sequence) => {
      const card = createElement("a", "sequence-card topic-card visual-card", "");
      card.href = sequence.href || `./sequences/${sequence.sequence || sequence.id}/index.html`;
      card.append(
        createElement("span", "sequence-badge", `Sequence ${sequence.sequence || sequence.id}`),
        createElement("h2", "", sequence.title || "Visual Lab"),
        createElement("p", "lede", sequence.topic || sequence.summary || ""),
        createElement("p", "", sequence.summary || sequence.goal || "")
      );
      grid.appendChild(card);
    });
    container.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "허브 데이터를 준비 중입니다."));
    shell.appendChild(container);
    root.appendChild(shell);
  }

  function render() {
    clearPlaybackTimer();
    app.replaceChildren();
    if (data.kind === "hub") {
      renderHub(app);
      return;
    }
    renderTopbar(app);
    renderSequenceSwitcher(app);
    renderContent(app);
    schedulePlayback();
  }

  window.addEventListener("hashchange", () => {
    const nextId = getHashSequenceId();
    if (!nextId || nextId === state.sequenceId) {
      return;
    }
    state.sequenceId = findSequence(nextId).id;
    state.flowIndex = 0;
    state.stepIndex = 0;
    render();
  });

  window.addEventListener("beforeunload", clearPlaybackTimer);

  initializeState();
  render();
})();

(function () {
  "use strict";

  const data = window.visualLabData || {};
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const kindLabels = {
    request: "요청 검사기",
    "request-trace": "요청 패킷 추적",
    persistence: "영속성 경계",
    gate: "실패 차단 경계",
    auth: "인증·인가 경계",
    trust: "신뢰 경계",
    test: "테스트 하네스",
    cache: "캐시 상태 검사기",
    realtime: "연결·브로드캐스트 콘솔",
    runtime: "실행 환경 경계",
    pipeline: "배포 파이프라인 게이트",
    refactor: "동작 보존 지도",
    event: "이벤트 전달 추적",
    trace: "학습 신호 추적",
  };
  const toneLabels = {
    signal: "진행 중",
    blocked: "여기서 차단",
    warning: "주의 필요",
    recovered: "경로 확인됨",
  };
  const edgeKindLabels = {
    request: "요청",
    call: "호출",
    transform: "변환",
    persist: "저장",
    response: "응답",
    failure: "실패 경로",
    event: "이벤트 전달",
    config: "설정 주입",
    compare: "비교",
  };
  const evidenceScopeLabels = {
    code: "코드에서 확인",
    test: "테스트에서 확인",
    runtime: "실행 결과에서 확인",
    manual: "직접 실행해 확인",
    concept: "이론에서 확인",
  };
  const observationTitles = {
    request: "요청과 응답이 오가는 순서",
    "request-trace": "요청 객체가 바뀌는 순서",
    persistence: "요청이 DB 상태로 바뀌는 순서",
    gate: "요청이 멈추는 지점",
    auth: "토큰과 권한을 확인하는 순서",
    trust: "외부 신뢰를 내부 계정으로 연결하는 순서",
    test: "입력과 검증 근거가 이어지는 순서",
    cache: "캐시 상태가 바뀌는 순서",
    realtime: "연결과 구독 뒤 메시지가 전달되는 순서",
    runtime: "산출물이 실행 상태가 되는 순서",
    pipeline: "배포 단계가 통과하거나 멈추는 순서",
    refactor: "구조가 바뀌어도 동작을 지키는 순서",
    event: "응답과 이벤트가 갈라져 전달되는 순서",
    trace: "책임 사이에서 값이 이동하는 순서",
  };
  const state = {
    scenarioIndex: 0,
    flowIndex: 0,
    stepIndex: 0,
    checked: new Set(),
    predictions: new Map(),
    revealedScenarios: new Set(),
    reflections: new Map(),
  };
  let sectionObserver = null;

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = String(text);
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

  function makeLink(label, href, className) {
    const link = createElement("a", className || "text-link", label);
    link.href = href;
    return link;
  }

  function currentSequence() {
    if (data.kind === "sequence") {
      return {
        ...data,
        id: data.sequence || "NN",
        question: data.question || data.problem || data.goal,
        checks: list(data.checks).length ? data.checks : data.practice,
      };
    }
    return null;
  }

  function flowIndexById(sequence, flowId) {
    const flows = list(sequence.flows);
    const index = flows.findIndex((flow) => flow.id === flowId);
    return index >= 0 ? index : 0;
  }

  function currentFlow(sequence) {
    return list(sequence.flows)[state.flowIndex] || list(sequence.flows)[0] || { steps: [] };
  }

  function currentSteps(sequence) {
    const diagramSteps = semanticSteps(sequence, currentScenario(sequence));
    return diagramSteps.length ? diagramSteps : list(currentFlow(sequence).steps);
  }

  function currentStep(sequence) {
    return currentSteps(sequence)[state.stepIndex] || {};
  }

  function currentLaneContext(sequence) {
    const steps = currentSteps(sequence);
    const step = steps[state.stepIndex] || {};
    if (!step._laneId) {
      return {
        id: "legacy",
        label: "전체 경로",
        start: 0,
        end: Math.max(steps.length - 1, 0),
        length: steps.length,
        index: state.stepIndex,
      };
    }
    const laneSteps = steps.filter((item) => item._laneId === step._laneId);
    return {
      id: step._laneId,
      label: step._laneLabel || "현재 경로",
      start: laneSteps[0]._globalIndex,
      end: laneSteps[laneSteps.length - 1]._globalIndex,
      length: laneSteps.length,
      index: step._laneStepIndex,
    };
  }

  function deriveRoute(flow) {
    const route = [];
    list(flow.steps).forEach((step) => {
      const from = step.from || step.actor;
      const to = step.to || step.owner;
      if (from && route[route.length - 1] !== from) {
        route.push(from);
      }
      if (to && route[route.length - 1] !== to) {
        route.push(to);
      }
    });
    return route;
  }

  function normalizedWorkbench(sequence) {
    if (sequence.workbench && list(sequence.workbench.scenarios).length) {
      return sequence.workbench;
    }

    return {
      kind: "trace",
      title: "핵심 흐름 추적",
      instruction: "흐름을 선택하고 단계별 책임과 확인 지점을 따라가세요.",
      scenarios: list(sequence.flows).map((flow, index) => ({
        id: flow.id || `flow-${index + 1}`,
        label: flow.title || `흐름 ${index + 1}`,
        flowId: flow.id,
        tone: "signal",
        prompt: flow.summary || sequence.problem,
        route: deriveRoute(flow),
        snapshot: [
          { label: "현재 흐름", value: flow.title || `흐름 ${index + 1}` },
          { label: "관찰 단계", value: `${list(flow.steps).length}개 단계` },
        ],
        evidence: flow.summary || sequence.goal,
        outcome: "단계를 선택해 Problem, Concept, Action, Check를 확인합니다.",
      })),
    };
  }

  function currentScenario(sequence) {
    const workbench = normalizedWorkbench(sequence);
    return list(workbench.scenarios)[state.scenarioIndex] || list(workbench.scenarios)[0] || {};
  }

  function semanticDiagram(scenario) {
    const diagram = scenario && scenario.diagram;
    if (!diagram || !list(diagram.lanes).some((lane) => list(lane && lane.steps).length)) {
      return null;
    }
    return diagram;
  }

  function inferredIcon(actor, label) {
    const kind = String((actor && actor.kind) || "").toLowerCase();
    const value = String(label || "").toLowerCase();
    if (kind === "person" || /student|learner|developer|operator|사용자|학생/.test(value)) return "person";
    if (kind === "client" || /browser|client|postman|swagger/.test(value)) return "client";
    if (kind === "db" || /mysql|database|table/.test(value)) return "database";
    if (kind === "cache" || /redis|cache/.test(value)) return "cache";
    if (/repository/.test(value)) return "repository";
    if (/controller|api/.test(value)) return "api";
    if (/security|filter|validation|gate/.test(value)) return "security";
    if (/broker|rabbit/.test(value)) return "broker";
    if (/queue/.test(value)) return "queue";
    if (/test|assert/.test(value)) return "test";
    if (/docker|container|runtime/.test(value)) return "runtime";
    if (/artifact|jar|image/.test(value)) return "artifact";
    if (/service/.test(value)) return "service";
    return "service";
  }

  function diagramNode(sequence, nodeId) {
    const workbench = normalizedWorkbench(sequence);
    const catalog = workbench.nodes && typeof workbench.nodes === "object" ? workbench.nodes : {};
    const declared = catalog[nodeId];
    if (declared && typeof declared === "object") {
      return {
        id: nodeId,
        label: declared.label || nodeId,
        icon: declared.icon || inferredIcon(null, declared.label || nodeId),
        kind: declared.kind || "책임 주체",
        role: declared.role || "이 단계의 책임을 수행합니다.",
        boundary: declared.boundary || "System",
        codePointIds: list(declared.codePointIds),
      };
    }

    const actor = list(sequence.actors).find((item) => item && (item.id === nodeId || item.label === nodeId));
    const label = (actor && actor.label) || nodeId;
    return {
      id: nodeId,
      label,
      icon: inferredIcon(actor, label),
      kind: (actor && actor.kind) || "책임 주체",
      role: "이 단계의 책임을 수행합니다.",
      boundary: "System",
      codePointIds: [],
    };
  }

  function normalizedEffect(edge, fromNode, toNode, verb, payload) {
    const declared = edge && edge.effect && typeof edge.effect === "object" ? edge.effect : {};
    const transformParts = String(payload).split(/\s*[→➝]\s*/).filter(Boolean);
    let before = declared.before;
    let after = declared.after;
    let kind = declared.kind;

    if (!kind) {
      kind = {
        transform: "transform",
        persist: "persist",
        response: "return",
        failure: "gate",
        event: "fanout",
        compare: "preserve",
      }[edge.kind] || "transfer";
    }

    if (!before || !after) {
      if (edge.kind === "transform" && transformParts.length >= 2) {
        before = before || transformParts[0];
        after = after || transformParts.slice(1).join(" → ");
      } else if (edge.kind === "failure") {
        before = before || `${fromNode.label}까지 도달`;
        after = after || `${toNode.label}에서 이후 경로 중단`;
      } else if (edge.kind === "persist") {
        before = before || `${toNode.label}에 반영되기 전`;
        after = after || `${verb} 요청 · ${payload}`;
      } else if (edge.kind === "response") {
        before = before || `${fromNode.label}이 가진 결과`;
        after = after || `${toNode.label}이 ${payload} 수신`;
      } else if (edge.kind === "event") {
        before = before || `${fromNode.label}이 가진 ${payload}`;
        after = after || `${toNode.label}로 이벤트 전달`;
      } else if (edge.from === edge.to) {
        before = before || `${verb} 전 · ${payload}`;
        after = after || `${verb} 후 · ${payload}`;
      } else {
        before = before || `${fromNode.label}이 가진 ${payload}`;
        after = after || `${toNode.label}이 같은 전달물을 받음`;
      }
    }

    return {
      kind,
      subject: declared.subject || payload,
      before,
      after,
    };
  }

  function semanticSteps(sequence, scenario) {
    const diagram = semanticDiagram(scenario);
    if (!diagram) {
      return [];
    }

    const normalized = [];
    list(diagram.lanes).forEach((lane, laneIndex) => {
      list(lane && lane.steps).forEach((edge, laneStepIndex) => {
        if (!edge || !edge.from || !edge.to) {
          return;
        }
        const globalIndex = normalized.length;
        const fromNode = diagramNode(sequence, edge.from);
        const toNode = diagramNode(sequence, edge.to);
        const verb = edge.verb || edgeKindLabels[edge.kind] || "전달";
        const payload = edge.payload || "전달 단위 확인";
        const linkedCodePointIds = list(edge.codePointIds).length
          ? edge.codePointIds
          : toNode.codePointIds.length
            ? toNode.codePointIds
            : fromNode.codePointIds;
        normalized.push({
          ...edge,
          id: edge.id || `${scenario.id || "scenario"}-${lane.id || laneIndex}-${laneStepIndex}`,
          from: fromNode.label,
          to: toNode.label,
          owner: toNode.label,
          problem: edge.problem || scenario.prompt,
          concept: edge.concept || `${toNode.boundary} · ${toNode.role}`,
          action: edge.action || `${verb} · ${payload}`,
          check: edge.check || scenario.evidence,
          note: edge.note || lane.description,
          codePointIds: linkedCodePointIds,
          verb,
          payload,
          effect: normalizedEffect(edge, fromNode, toNode, verb, payload),
          evidenceScope: edge.evidenceScope || (list(edge.codePointIds).length ? "code" : "manual"),
          _fromId: edge.from,
          _toId: edge.to,
          _laneId: lane.id || `lane-${laneIndex + 1}`,
          _laneLabel: lane.label || `경로 ${laneIndex + 1}`,
          _laneIndex: laneIndex,
          _laneStepIndex: laneStepIndex,
          _laneStepCount: list(lane.steps).length,
          _globalIndex: globalIndex,
        });
      });
    });
    return normalized;
  }

  function diagramParticipantIds(diagram) {
    const referenced = [];
    list(diagram && diagram.lanes).forEach((lane) => {
      list(lane && lane.steps).forEach((edge) => {
        [edge && edge.from, edge && edge.to].forEach((nodeId) => {
          if (nodeId && !referenced.includes(nodeId)) {
            referenced.push(nodeId);
          }
        });
      });
    });
    const declared = list(diagram && diagram.participants).filter((nodeId) => referenced.includes(nodeId));
    referenced.forEach((nodeId) => {
      if (!declared.includes(nodeId)) {
        declared.push(nodeId);
      }
    });
    return declared;
  }

  function normalizedTheoryRef(sequence, scenario, lane, step) {
    const raw = (step && step.theoryRef) || (lane && lane.theoryRef) || (scenario && scenario.theoryRef);
    if (typeof raw === "string" && raw) {
      return { href: raw, label: "이 단계의 이론 이어서 읽기" };
    }
    if (raw && typeof raw === "object" && (raw.href || raw.url)) {
      return {
        href: raw.href || raw.url,
        label: raw.label || raw.title || "이 단계의 이론 이어서 읽기",
      };
    }
    const fallback = collectSourceLinks(sequence).find((item) => String(item.label).includes("이론"));
    return fallback ? { href: fallback.href, label: "관련 이론 전체 보기" } : null;
  }

  function semanticStepAriaLabel(step, edgeState) {
    const effect = step.effect || {};
    const scope = evidenceScopeLabels[step.evidenceScope] || evidenceScopeLabels.manual;
    return `${step._laneStepIndex + 1}단계, ${step.from}에서 ${step.to}로 ${step.verb}: ${step.payload}. 변화 전: ${effect.before || "이 단계 전 상태"}. 변화 후: ${effect.after || "이 단계 뒤 상태"}. ${scope}. ${routeStateLabel(edgeState)}`;
  }

  function scenarioKey(scenario) {
    return scenario.id || `scenario-${state.scenarioIndex}`;
  }

  function isScenarioRevealed(scenario) {
    return state.revealedScenarios.has(scenarioKey(scenario));
  }

  function iconAssetHref(iconName) {
    const base = data.kind === "sequence" ? "../../assets/icons" : "./assets/icons";
    return `${base}/${iconName || "service"}.svg`;
  }

  function createSystemIcon(iconName, className) {
    const image = createElement("img", className || "system-icon");
    image.src = iconAssetHref(iconName);
    image.alt = "";
    image.width = 24;
    image.height = 24;
    image.decoding = "async";
    image.addEventListener("error", () => {
      const fallback = createElement("span", `${className || "system-icon"} system-icon--fallback`, "●");
      fallback.setAttribute("aria-hidden", "true");
      image.replaceWith(fallback);
    });
    return image;
  }

  function updateLiveStatus(message) {
    let status = document.getElementById("visual-lab-status");
    if (!status) {
      status = createElement("p", "sr-only");
      status.id = "visual-lab-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      document.body.appendChild(status);
    }
    status.textContent = message;
  }

  function scenarioRoute(sequence, scenario) {
    const route = list(scenario.route);
    if (route.length) {
      return route.map((item) => (typeof item === "string" ? { label: item } : item));
    }
    return deriveRoute(currentFlow(sequence)).map((label) => ({ label }));
  }

  function linkedCodePoints(sequence, step) {
    const ids = list(step.codePointIds);
    const points = list(sequence.codePoints);
    if (!ids.length) {
      return points.slice(0, 2);
    }
    return ids.map((id) => points.find((point) => point.id === id)).filter(Boolean);
  }

  function collectSourceLinks(sequence) {
    const links = [];
    const source = sequence.source || {};
    [
      ["이론 정리", source.theory],
      ["구현 안내", source.implementation],
      ["체크리스트", source.checklist],
    ].forEach(([label, href]) => {
      if (href) {
        links.push({ label, href });
      }
    });
    [...list(sequence.sourceDocs), ...list(sequence.relatedDocs)].forEach((item) => {
      if (item && item.label && item.href) {
        links.push(item);
      }
    });
    const seen = new Set();
    return links.filter((item) => {
      const key = `${item.label}:${item.href}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function renderTopbar(root, sequence) {
    const header = createElement("header", "context-bar");
    const inner = createElement("div", "context-bar__inner");
    const homeHref = data.kind === "sequence" ? "../../index.html" : "./index.html";
    const brand = makeLink("A&I Backend · Visual Lab", homeHref, "brand-mark");
    const context = createElement("div", "context-meta");
    const repoName = (data.repo && data.repo.name) || data.title || "Topic Repository";
    context.append(
      createElement("span", "context-meta__repo", repoName),
      createElement("span", "context-meta__mode", sequence ? `Sequence ${sequence.id}` : "학습 경로")
    );
    inner.append(brand, context);
    header.appendChild(inner);
    root.appendChild(header);
  }

  function renderHub(root) {
    renderTopbar(root, null);
    const main = createElement("main", "hub-shell");
    main.id = "main-content";

    const intro = createElement("header", "hub-intro");
    intro.append(
      createElement("p", "eyebrow", "이 저장소의 학습 순서"),
      createElement("h1", "hub-title", data.title || "A&I Backend Visual Lab"),
      createElement("p", "hub-description", data.description || "시퀀스를 선택해 실제 시스템 흐름을 관찰합니다.")
    );
    const job = createElement("p", "hub-job", "질문을 선택하고, 시스템 경로를 관찰하고, 다음 판단으로 이동하세요.");
    intro.appendChild(job);
    main.appendChild(intro);

    const journey = createElement("ol", "journey-list");
    list(data.sequences).forEach((sequence) => {
      const item = createElement("li", "journey-item");
      const link = makeLink("", sequence.href || `./sequences/${sequence.sequence || sequence.id}/index.html`, "journey-link");
      const identity = createElement("div", "journey-identity");
      identity.append(
        createElement("span", "sequence-index", sequence.sequence || sequence.id),
        createElement("span", "journey-topic", sequence.topic || "Backend sequence")
      );
      const copy = createElement("div", "journey-copy");
      copy.append(
        createElement("h2", "", sequence.title || "Visual Lab"),
        createElement("p", "", sequence.summary || sequence.goal || "핵심 흐름을 확인합니다.")
      );
      link.append(identity, copy, createElement("span", "journey-action", "학습 시작 →"));
      item.appendChild(link);
      journey.appendChild(item);
    });
    main.appendChild(journey.childNodes.length ? journey : createElement("p", "empty-state", "연결된 시퀀스가 없습니다. 허브 데이터를 확인하세요."));
    root.appendChild(main);
  }

  function renderHero(main, sequence) {
    const hero = createElement("header", "sequence-hero");
    hero.id = "question";
    const identity = createElement("div", "sequence-identity");
    identity.append(
      createElement("span", "sequence-index sequence-index--large", sequence.id),
      createElement("div", "sequence-name")
    );
    const name = identity.querySelector(".sequence-name");
    name.append(
      createElement("p", "eyebrow", sequence.subtitle || sequence.topic || "백엔드 학습 시퀀스"),
      createElement("p", "sequence-title", sequence.title || "Visual Lab")
    );

    const thesis = createElement("div", "sequence-thesis");
    thesis.append(
      createElement("p", "thesis-label", "이번 시퀀스의 질문"),
      createElement("h1", "", sequence.question || sequence.problem || sequence.title),
      createElement("p", "sequence-goal", sequence.goal || "핵심 흐름을 단계별로 확인합니다.")
    );
    hero.append(identity, thesis);
    main.appendChild(hero);
  }

  function renderLearningNav(main) {
    const nav = createElement("nav", "learning-nav");
    nav.setAttribute("aria-label", "학습 판단 단계");
    [
      ["question", "질문"],
      ["lab", "관찰"],
      ["evidence", "개념·코드"],
      ["verify", "검증"],
      ["next", "다음 질문"],
    ].forEach(([id, label], index) => {
      const link = makeLink(label, `#${id}`, "learning-nav__link");
      link.dataset.sectionLink = id;
      if (index === 0) {
        link.setAttribute("aria-current", "location");
      }
      nav.appendChild(link);
    });
    main.appendChild(nav);
  }

  function routeState(index, routeLength, scenario, stepLength) {
    if (Number.isInteger(scenario.stopAfter) && index > scenario.stopAfter) {
      return "blocked";
    }
    const mappedActiveIndex = stepLength <= 1
      ? Math.max(routeLength - 1, 0)
      : Math.round((state.stepIndex / (stepLength - 1)) * Math.max(routeLength - 1, 0));
    const reachableLastIndex = Number.isInteger(scenario.stopAfter)
      ? Math.min(scenario.stopAfter, Math.max(routeLength - 1, 0))
      : Math.max(routeLength - 1, 0);
    const activeIndex = Math.min(mappedActiveIndex, reachableLastIndex);
    if (index < activeIndex) {
      return "passed";
    }
    if (index === activeIndex) {
      return "active";
    }
    return "pending";
  }

  function routeStateLabel(routeStateName) {
    return {
      passed: "지남",
      active: "현재 관찰",
      pending: "다음",
      blocked: "도달하지 않음",
      available: "선택 가능",
    }[routeStateName];
  }

  function semanticStepState(index) {
    if (index < state.stepIndex) {
      return "passed";
    }
    if (index === state.stepIndex) {
      return "active";
    }
    return "pending";
  }

  function renderSequenceParticipant(sequence, nodeId, participantIndex, activeStep) {
    const node = diagramNode(sequence, nodeId);
    const participant = createElement("li", "sequence-participant");
    participant.style.gridColumn = String(participantIndex + 1);
    participant.dataset.kind = String(node.kind || "actor").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    if (activeStep && (activeStep._fromId === nodeId || activeStep._toId === nodeId)) {
      participant.dataset.current = "true";
    }

    const iconWrap = createElement("span", "sequence-participant__icon");
    iconWrap.appendChild(createSystemIcon(node.icon));
    const identity = createElement("span", "sequence-participant__identity");
    identity.append(
      createElement("strong", "sequence-participant__label", node.label),
      createElement("span", "sequence-participant__boundary", node.boundary)
    );
    participant.append(iconWrap, identity, createElement("span", "sequence-participant__role", node.role));
    return participant;
  }

  function laneStartIndex(diagram, selectedLaneIndex) {
    return list(diagram.lanes)
      .slice(0, selectedLaneIndex)
      .reduce((total, lane) => total + list(lane.steps).length, 0);
  }

  function renderCurrentEffect(sequence, scenario, lane, activeStep) {
    const detail = createElement("article", "sequence-current-detail");
    detail.id = `current-message-${activeStep._globalIndex}`;
    detail.dataset.kind = activeStep.kind || "call";
    const isSelfCall = activeStep._fromId === activeStep._toId;
    const heading = createElement("header", "sequence-current-detail__header");
    heading.append(
      createElement("p", "sequence-current-detail__step", `현재 단계 ${activeStep._laneStepIndex + 1} / ${activeStep._laneStepCount}`),
      createElement("h5", "", isSelfCall ? `${activeStep.from} 안에서 ${activeStep.verb}` : `${activeStep.from} → ${activeStep.to} · ${activeStep.verb}`),
      createElement("code", "sequence-current-detail__payload", activeStep.payload)
    );
    detail.appendChild(heading);

    const effect = activeStep.effect || {};
    const effectTitle = createElement("p", "sequence-effect__subject", `이 단계에서 바뀌는 것 · ${effect.subject || activeStep.payload}`);
    const effectGrid = createElement("dl", "sequence-effect");
    const before = createElement("div", "sequence-effect__state");
    before.append(createElement("dt", "", "이전"), createElement("dd", "", effect.before || "이 단계 전 상태"));
    const arrow = createElement("span", "sequence-effect__arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    const after = createElement("div", "sequence-effect__state sequence-effect__state--after");
    after.append(createElement("dt", "", "이후"), createElement("dd", "", effect.after || "이 단계 뒤 상태"));
    effectGrid.append(before, arrow, after);
    detail.append(effectTitle, effectGrid);

    const evidence = createElement("aside", "sequence-current-evidence");
    const scope = evidenceScopeLabels[activeStep.evidenceScope] || evidenceScopeLabels.manual;
    evidence.append(
      createElement("span", "sequence-current-evidence__scope", scope),
      createElement("strong", "", activeStep.check || "입력과 출력의 실제 근거를 확인합니다."),
      createElement("p", "", activeStep.concept || activeStep.note || "이 전달이 지나는 책임 경계를 확인합니다.")
    );
    detail.appendChild(evidence);

    const theoryRef = normalizedTheoryRef(sequence, scenario, lane, activeStep);
    if (theoryRef) {
      const link = makeLink(`${theoryRef.label} →`, theoryRef.href, "sequence-theory-link");
      detail.appendChild(link);
    }
    return detail;
  }

  function renderMobileCurrent(activeStep) {
    const current = createElement("article", "sequence-mobile-current");
    current.dataset.kind = activeStep.kind || "call";
    current.dataset.focusKey = `diagram-step-${activeStep._globalIndex}`;
    current.tabIndex = -1;
    const isSelfCall = activeStep._fromId === activeStep._toId;
    const kindLabel = edgeKindLabels[activeStep.kind] || "전달";
    current.appendChild(createElement("p", "sequence-mobile-current__step", `단계 ${activeStep._laneStepIndex + 1} / ${activeStep._laneStepCount} · ${kindLabel}${activeStep.kind === "failure" ? " · 여기서 중단" : ""}`));
    const route = createElement("div", "sequence-mobile-current__route");
    route.dataset.self = String(isSelfCall);
    route.append(
      createElement("strong", "sequence-mobile-current__actor", activeStep.from),
      createElement("span", "sequence-mobile-current__line", isSelfCall ? "같은 책임 안에서" : `${activeStep.verb} ↓`),
      createElement("strong", "sequence-mobile-current__actor", activeStep.to)
    );
    current.append(
      route,
      createElement("p", "sequence-mobile-current__sentence", isSelfCall
        ? `${activeStep.from} 안에서 ${activeStep.verb} · ${activeStep.payload}`
        : `${activeStep.from} → ${activeStep.to} · ${activeStep.verb} · ${activeStep.payload}`),
      createElement("p", "sequence-mobile-current__change", `무엇이 바뀜 · ${activeStep.effect.before} → ${activeStep.effect.after}`)
    );
    return current;
  }

  function renderSemanticDiagram(sequence, scenario) {
    const diagram = semanticDiagram(scenario);
    const activeStep = currentStep(sequence);
    const lanesData = list(diagram.lanes);
    const activeLaneIndex = Math.max(
      0,
      lanesData.findIndex((lane, index) => (lane.id || `lane-${index + 1}`) === activeStep._laneId)
    );
    const activeLane = lanesData[activeLaneIndex] || { steps: [] };
    const allSteps = semanticSteps(sequence, scenario);
    const fullLaneSteps = allSteps.filter((step) => step._laneIndex === activeLaneIndex);
    const laneSteps = fullLaneSteps.slice(0, 7);
    const participantIds = diagramParticipantIds(diagram);
    const figure = createElement("figure", "semantic-diagram");
    figure.setAttribute("aria-label", "선택한 조건에서 전달이 이동하고 상태가 바뀌는 순서");

    const reading = createElement("figcaption", "diagram-reading");
    reading.append(
      createElement("span", "diagram-reading__label", scenario.observationTitle || observationTitles[normalizedWorkbench(sequence).kind] || observationTitles.trace),
      createElement("strong", "diagram-reading__text", diagram.caption)
    );
    figure.appendChild(reading);

    if (lanesData.length > 1) {
      const laneSelector = createElement("div", "sequence-lanes");
      laneSelector.setAttribute("role", "group");
      laneSelector.setAttribute("aria-label", "관찰할 시스템 경로");
      const nextLaneIds = list(activeLane.nextLaneIds);
      lanesData.forEach((lane, laneIndex) => {
        const laneId = lane.id || `lane-${laneIndex + 1}`;
        const isActive = laneIndex === activeLaneIndex;
        const relation = isActive ? "현재 경로" : nextLaneIds.includes(laneId) ? "다음 경로" : "다른 조건 경로";
        const laneButton = createElement("button", "sequence-lane-button", `${relation} · ${lane.label || `경로 ${laneIndex + 1}`}`);
        laneButton.type = "button";
        laneButton.dataset.focusKey = `lane-${laneIndex}`;
        laneButton.setAttribute("aria-pressed", String(isActive));
        laneButton.addEventListener("click", () => {
          state.stepIndex = laneStartIndex(diagram, laneIndex);
          render({ focusKey: `lane-${laneIndex}` });
        });
        laneSelector.appendChild(laneButton);
      });
      figure.appendChild(laneSelector);
    }

    const board = createElement("section", "sequence-board");
    const boardHeader = createElement("header", "sequence-board__header");
    boardHeader.append(
      createElement("h4", "", activeLane.label || `경로 ${activeLaneIndex + 1}`),
      createElement("p", "", activeLane.description || "위에서 아래로 시간을 따라가며 현재 전달과 상태 변화를 확인합니다.")
    );
    board.append(boardHeader, renderMobileCurrent(activeStep));

    const viewport = createElement("div", "sequence-stage__viewport");
    viewport.setAttribute("tabindex", "0");
    viewport.setAttribute("aria-label", "전체 참여 주체와 수직 시간선. 좌우로 이동해 볼 수 있습니다.");
    const stage = createElement("div", "sequence-stage");
    stage.style.setProperty("--participant-count", String(Math.max(participantIds.length, 1)));
    stage.style.setProperty("--sequence-stage-width", `${Math.max(participantIds.length * 144, 620)}px`);

    const participants = createElement("ol", "sequence-participants");
    participants.setAttribute("aria-label", "이 경로에 참여하는 책임 주체");
    participantIds.forEach((nodeId, index) => {
      participants.appendChild(renderSequenceParticipant(sequence, nodeId, index, activeStep));
    });
    stage.appendChild(participants);

    const messagesWrap = createElement("div", "sequence-messages-wrap");
    const lifelines = createElement("div", "sequence-lifelines");
    lifelines.setAttribute("aria-hidden", "true");
    participantIds.forEach((nodeId, index) => {
      const line = createElement("span", "sequence-lifeline");
      line.style.gridColumn = String(index + 1);
      lifelines.appendChild(line);
    });
    messagesWrap.appendChild(lifelines);

    const messages = createElement("ol", "sequence-messages");
    messages.setAttribute("aria-label", "위에서 아래로 흐르는 전달 단계");
    laneSteps.forEach((step) => {
      const fromIndex = Math.max(0, participantIds.indexOf(step._fromId));
      const toIndex = Math.max(0, participantIds.indexOf(step._toId));
      const startIndex = Math.min(fromIndex, toIndex);
      const endIndex = Math.max(fromIndex, toIndex);
      const direction = fromIndex === toIndex ? "self" : fromIndex < toIndex ? "forward" : "reverse";
      const edgeState = semanticStepState(step._globalIndex);
      const item = createElement("li", "sequence-message");
      item.dataset.state = edgeState;
      item.dataset.kind = step.kind || "call";
      item.dataset.direction = direction;
      const button = createElement("button", "sequence-message__button");
      button.type = "button";
      button.dataset.focusKey = `diagram-step-${step._globalIndex}`;
      button.dataset.direction = direction;
      button.style.setProperty("--message-start", String(startIndex + 1));
      button.style.setProperty("--message-end", String(endIndex + 2));
      button.style.setProperty("--message-span", String(endIndex - startIndex + 1));
      button.setAttribute("aria-label", semanticStepAriaLabel(step, edgeState));
      if (edgeState === "active") {
        button.setAttribute("aria-current", "step");
        button.setAttribute("aria-controls", `current-message-${step._globalIndex}`);
      }
      const copy = createElement("span", "sequence-message__copy");
      copy.append(
        createElement("span", "sequence-message__ordinal", String(step._laneStepIndex + 1)),
        createElement("strong", "sequence-message__verb", step.verb),
        createElement("code", "sequence-message__payload", step.payload)
      );
      const line = createElement("span", "sequence-message__line");
      line.setAttribute("aria-hidden", "true");
      button.append(
        copy,
        line,
        createElement("span", "sequence-message__state", `${edgeKindLabels[step.kind] || "전달"} · ${step.kind === "failure" ? "여기서 중단" : routeStateLabel(edgeState)}`)
      );
      button.addEventListener("click", () => {
        state.stepIndex = step._globalIndex;
        render({ focusKey: `diagram-step-${step._globalIndex}` });
      });
      item.appendChild(button);
      messages.appendChild(item);
    });
    messagesWrap.appendChild(messages);
    stage.appendChild(messagesWrap);
    viewport.appendChild(stage);
    board.appendChild(viewport);
    board.appendChild(renderCurrentEffect(sequence, scenario, activeLane, activeStep));

    const lane = currentLaneContext(sequence);
    const activeLaneId = activeLane.id || `lane-${activeLaneIndex + 1}`;
    const previousLaneIndexes = lanesData
      .map((candidate, index) => list(candidate && candidate.nextLaneIds).includes(activeLaneId) ? index : -1)
      .filter((index) => index >= 0);
    const previousLaneIndex = previousLaneIndexes.length === 1 ? previousLaneIndexes[0] : -1;
    const nextLaneIds = list(activeLane.nextLaneIds);
    const nextLaneIndex = nextLaneIds.length === 1
      ? lanesData.findIndex((candidate, index) => (candidate.id || `lane-${index + 1}`) === nextLaneIds[0])
      : -1;
    const canMoveToPreviousLane = lane.index === 0 && previousLaneIndex >= 0;
    const canMoveToNextLane = lane.index >= lane.length - 1 && nextLaneIndex >= 0;
    const controls = createElement("div", "trace-controls");
    const previousLabel = canMoveToPreviousLane
      ? `← 이전 경로 · ${lanesData[previousLaneIndex].label || `경로 ${previousLaneIndex + 1}`}`
      : "← 이전 단계";
    const previous = createElement("button", "control-button", previousLabel);
    previous.type = "button";
    previous.dataset.focusKey = "previous";
    previous.disabled = lane.length === 0 || (lane.index === 0 && !canMoveToPreviousLane);
    previous.addEventListener("click", () => {
      if (canMoveToPreviousLane) {
        const previousStart = laneStartIndex(diagram, previousLaneIndex);
        state.stepIndex = previousStart + Math.max(list(lanesData[previousLaneIndex].steps).length - 1, 0);
      } else {
        state.stepIndex = Math.max(lane.start, state.stepIndex - 1);
      }
      render({ focusKey: `diagram-step-${state.stepIndex}` });
    });
    const progressWrap = createElement("div", "trace-progress");
    const progress = createElement("progress", "trace-progress__bar");
    progress.max = Math.max(lane.length, 1);
    progress.value = lane.length ? lane.index + 1 : 0;
    progress.setAttribute("aria-label", `${lane.label}, 현재 단계 ${lane.length ? lane.index + 1 : 0} / ${lane.length}`);
    progressWrap.append(progress, createElement("span", "trace-progress__text", `${lane.label} · ${lane.length ? lane.index + 1 : 0} / ${lane.length}`));
    const nextLabel = canMoveToNextLane
      ? `다음 경로 · ${lanesData[nextLaneIndex].label || `경로 ${nextLaneIndex + 1}`} →`
      : nextLaneIds.length > 1 && lane.index >= lane.length - 1
        ? "다른 경로를 선택하세요"
        : "다음 단계 →";
    const next = createElement("button", "control-button", nextLabel);
    next.type = "button";
    next.dataset.focusKey = "next-step";
    next.disabled = lane.length === 0 || (lane.index >= lane.length - 1 && !canMoveToNextLane);
    next.addEventListener("click", () => {
      if (canMoveToNextLane) {
        state.stepIndex = laneStartIndex(diagram, nextLaneIndex);
      } else {
        state.stepIndex = Math.min(lane.end, state.stepIndex + 1);
      }
      render({ focusKey: `diagram-step-${state.stepIndex}` });
    });
    controls.append(previous, progressWrap, next);
    board.appendChild(controls);

    const stepJump = createElement("nav", "sequence-step-jump");
    stepJump.setAttribute("aria-label", "현재 경로의 단계 바로 가기");
    stepJump.appendChild(createElement("p", "sequence-step-jump__title", "다른 단계 바로 보기"));
    const jumpList = createElement("ol", "sequence-step-jump__list");
    laneSteps.forEach((step) => {
      const edgeState = semanticStepState(step._globalIndex);
      const item = createElement("li", "sequence-step-jump__item");
      const button = createElement("button", "sequence-step-jump__button", `${step._laneStepIndex + 1}. ${step.from} → ${step.to} · ${step.verb}`);
      button.type = "button";
      button.dataset.focusKey = `diagram-step-${step._globalIndex}`;
      button.setAttribute("aria-label", semanticStepAriaLabel(step, edgeState));
      if (edgeState === "active") {
        button.setAttribute("aria-current", "step");
      }
      button.addEventListener("click", () => {
        state.stepIndex = step._globalIndex;
        render({ focusKey: `diagram-step-${step._globalIndex}` });
      });
      item.appendChild(button);
      jumpList.appendChild(item);
    });
    stepJump.appendChild(jumpList);
    board.appendChild(stepJump);
    figure.appendChild(board);

    if (fullLaneSteps.length > 7) {
      figure.appendChild(createElement("p", "sequence-limit-note", "현재 경로는 첫 7개 전달을 수직 시간선에 표시합니다. 이전·다음 버튼으로 나머지 단계도 확인할 수 있습니다."));
    }

    if (list(diagram.notReached).length) {
      const notReached = createElement("aside", "not-reached");
      notReached.appendChild(createElement("h4", "", "여기서 멈춰 실행되지 않은 책임"));
      const items = createElement("ul", "not-reached__list");
      list(diagram.notReached).forEach((item) => {
        const row = createElement("li", "not-reached__item");
        row.append(createElement("strong", "", item.label), createElement("span", "", item.reason));
        items.appendChild(row);
      });
      notReached.appendChild(items);
      figure.appendChild(notReached);
    }
    return figure;
  }

  function renderTopicVisual(workbench) {
    const visual = workbench.visual;
    if (!visual || !visual.src) {
      return null;
    }
    const figure = createElement("figure", "topic-visual");
    const image = createElement("img", "topic-visual__image");
    image.src = visual.src;
    image.alt = visual.alt || "현재 시퀀스의 시스템 경계 다이어그램";
    image.decoding = "async";
    image.addEventListener("error", () => {
      const fallback = createElement("p", "topic-visual__fallback", `${image.alt} — 다이어그램 파일을 불러오지 못했습니다.`);
      image.replaceWith(fallback);
    });
    const caption = createElement("figcaption", "topic-visual__caption");
    caption.append(
      createElement("strong", "", visual.caption || image.alt),
      createElement("span", "", "관계를 먼저 읽고, 아래에서 한 단계씩 확인합니다.")
    );
    const viewport = createElement("div", "topic-visual__viewport");
    viewport.appendChild(image);
    figure.append(viewport, caption);
    return figure;
  }

  function renderTerms(workbench) {
    const terms = list(workbench.terms);
    if (!terms.length) {
      return null;
    }
    const section = createElement("details", "term-ribbon");
    section.appendChild(createElement("summary", "term-ribbon__summary", `먼저 확인할 용어 ${terms.length}개`));
    const glossary = createElement("dl", "term-ribbon__list");
    terms.forEach((item) => {
      const entry = createElement("div", "term-ribbon__entry");
      entry.append(createElement("dt", "", item.term), createElement("dd", "", item.meaning));
      glossary.appendChild(entry);
    });
    section.appendChild(glossary);
    return section;
  }

  function renderPrediction(scenario) {
    const prediction = scenario.prediction || {};
    const options = list(prediction.options);
    const key = scenarioKey(scenario);
    const selectedId = state.predictions.get(key) || "";
    const revealed = isScenarioRevealed(scenario);
    const panel = createElement("section", "prediction-panel");
    const headingId = `prediction-${key}`;
    const heading = createElement("h4", "", revealed ? "내 예상과 실제 흐름 비교" : "실제 흐름을 보기 전에 예상해보세요");
    heading.id = headingId;
    panel.setAttribute("aria-labelledby", headingId);
    panel.append(
      createElement("p", "prediction-panel__step", revealed ? "내 예상과 실제 흐름" : "내 예상"),
      heading,
      createElement("p", "prediction-panel__prompt", prediction.prompt || "이 조건에서 요청은 어디까지 도달하고 무엇이 남을까요?")
    );

    if (!options.length) {
      panel.appendChild(createElement("p", "prediction-panel__missing", "예상 선택지가 없습니다. 시퀀스 데이터의 prediction.options를 확인하세요."));
      return panel;
    }

    const optionGroup = createElement("div", "prediction-options");
    optionGroup.setAttribute("role", "radiogroup");
    optionGroup.setAttribute("aria-label", prediction.prompt || "결과 예상");
    options.forEach((option) => {
      const label = createElement("label", "prediction-option");
      const input = createElement("input", "prediction-option__input");
      input.type = "radio";
      input.name = `prediction-${key}`;
      input.value = option.id;
      input.checked = selectedId === option.id;
      input.disabled = revealed;
      const copy = createElement("span", "prediction-option__copy", option.label);
      input.addEventListener("change", () => {
        state.predictions.set(key, option.id);
        const reveal = panel.querySelector(".prediction-panel__reveal");
        if (reveal) {
          reveal.disabled = false;
        }
      });
      label.append(input, copy);
      if (revealed && option.id === prediction.answer) {
        label.dataset.answer = "true";
      }
      if (revealed && option.id === selectedId) {
        label.dataset.selected = "true";
      }
      optionGroup.appendChild(label);
    });
    panel.appendChild(optionGroup);

    if (revealed) {
      const selected = options.find((option) => option.id === selectedId);
      const result = createElement("div", "prediction-result");
      result.dataset.correct = String(selectedId === prediction.answer);
      result.append(
        createElement("strong", "", selectedId === prediction.answer ? "내 예상과 같은 경로였습니다" : "실제 흐름은 다른 경로였습니다"),
        createElement("p", "", selected ? `내 예상: ${selected.label}` : "선택한 예상이 없습니다."),
        createElement("p", "", prediction.explanation || "아래 경로에서 요청이 멈추거나 상태가 바뀌는 지점을 확인하세요.")
      );
      panel.appendChild(result);
    } else {
      const reveal = createElement("button", "prediction-panel__reveal", "실제 전달 순서 보기 →");
      reveal.type = "button";
      reveal.dataset.focusKey = "reveal";
      reveal.disabled = !selectedId;
      reveal.addEventListener("click", () => {
        if (!state.predictions.get(key)) {
          return;
        }
        state.revealedScenarios.add(key);
        render({ focusKey: semanticDiagram(scenario) ? `diagram-step-${state.stepIndex}` : `route-${state.stepIndex}` });
      });
      panel.appendChild(reveal);
    }
    return panel;
  }

  function renderComparison(workbench) {
    const comparison = workbench.comparison;
    if (!comparison || !comparison.left || !comparison.right) {
      return null;
    }
    const section = createElement("section", "topic-comparison");
    section.appendChild(createElement("h4", "", comparison.label || "이 시퀀스에서 구분할 두 경계"));
    const grid = createElement("div", "topic-comparison__grid");
    [comparison.left, comparison.right].forEach((item, index) => {
      const article = createElement("article", "topic-comparison__item");
      article.dataset.side = index === 0 ? "left" : "right";
      article.append(createElement("strong", "", item.title), createElement("p", "", item.body));
      grid.appendChild(article);
    });
    section.appendChild(grid);
    return section;
  }

  function renderReflection(scenario) {
    const key = scenarioKey(scenario);
    const declared = scenario.reflection;
    const config = typeof declared === "string"
      ? { prompt: declared }
      : declared && typeof declared === "object"
        ? declared
        : {};
    const section = createElement("section", "scenario-reflection");
    const inputId = `reflection-${key}`;
    section.append(
      createElement("h4", "", config.title || "내 말로 정리하기"),
      createElement("p", "", config.prompt || "이 조건에서 다음 책임으로 넘어가거나 멈춘 이유를 한 문장으로 적어보세요.")
    );
    appendText(section, "p", "scenario-reflection__hint", config.hint);
    const label = createElement("label", "scenario-reflection__label", config.label || "관찰 뒤 바뀐 생각");
    label.htmlFor = inputId;
    const textarea = createElement("textarea", "scenario-reflection__input");
    textarea.id = inputId;
    textarea.rows = 3;
    textarea.placeholder = config.placeholder || (config.hint ? "" : "예: Request DTO는 Service 안에서 Entity로 바뀐 뒤 Repository로 전달된다.");
    textarea.value = state.reflections.get(key) || "";
    textarea.addEventListener("input", () => {
      state.reflections.set(key, textarea.value);
    });
    section.append(label, textarea, createElement("p", "scenario-reflection__note", "이 내용은 현재 페이지를 보는 동안만 유지됩니다."));
    return section;
  }

  function renderWorkbench(main, sequence) {
    const workbench = normalizedWorkbench(sequence);
    const scenario = currentScenario(sequence);
    const flow = currentFlow(sequence);
    const steps = currentSteps(sequence);
    const route = scenarioRoute(sequence, scenario);
    const diagram = semanticDiagram(scenario);
    const revealed = isScenarioRevealed(scenario);

    document.body.dataset.labKind = workbench.kind || "trace";

    const section = createElement("section", "lab-section");
    section.id = "lab";
    const heading = createElement("header", "section-heading section-heading--lab");
    heading.append(
      createElement("p", "eyebrow", kindLabels[workbench.kind] || kindLabels.trace),
      createElement("h2", "", workbench.title || "학습 신호 추적"),
      createElement("p", "section-lede", workbench.instruction || "조건을 선택하고 시스템 경로를 관찰하세요.")
    );
    section.appendChild(heading);

    const scenarioFieldset = createElement("fieldset", "scenario-selector");
    scenarioFieldset.appendChild(createElement("legend", "scenario-selector__legend", "관찰 조건 선택"));
    const scenarioButtons = createElement("div", "scenario-selector__buttons");
    list(workbench.scenarios).forEach((item, index) => {
      const button = createElement("button", "scenario-button", item.label || `조건 ${index + 1}`);
      button.type = "button";
      button.dataset.focusKey = `scenario-${index}`;
      button.setAttribute("aria-pressed", String(index === state.scenarioIndex));
      if (index === state.scenarioIndex) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        state.scenarioIndex = index;
        state.flowIndex = flowIndexById(sequence, item.flowId);
        state.stepIndex = 0;
        render({ focusKey: `scenario-${index}` });
      });
      scenarioButtons.appendChild(button);
    });
    scenarioFieldset.appendChild(scenarioButtons);
    section.appendChild(scenarioFieldset);

    const stage = createElement("div", `workbench workbench--${workbench.kind || "trace"}`);
    stage.dataset.tone = revealed ? scenario.tone || "signal" : "neutral";
    const stageHeader = createElement("div", "workbench__header");
    const stageTitle = createElement("div", "workbench__title");
    stageTitle.append(
      createElement(
        "span",
        `status-label status-label--${revealed ? scenario.tone || "signal" : "neutral"}`,
        revealed ? toneLabels[scenario.tone] || toneLabels.signal : "예측 전 · 조건 선택됨"
      ),
      createElement("h3", "", scenario.label || flow.title || "현재 흐름")
    );
    stageHeader.append(stageTitle, createElement("p", "workbench__prompt", scenario.prompt || flow.summary || sequence.problem));
    stage.appendChild(stageHeader);

    const terms = renderTerms(workbench);
    if (terms) {
      stage.appendChild(terms);
    }
    stage.appendChild(renderPrediction(scenario));

    if (!revealed) {
      const locked = createElement("div", "story-locked");
      locked.append(
        createElement("strong", "", "예상을 선택하면 시스템 경로가 열립니다"),
        createElement("p", "", "정답을 먼저 읽지 않고, 선택한 조건에서 요청이 멈추는 곳과 남는 상태를 예상해보세요.")
      );
      stage.appendChild(locked);
      updateLiveStatus(`${scenario.label || "현재 조건"}: 예상 선택을 기다리고 있습니다.`);
      section.appendChild(stage);
      main.appendChild(section);
      return;
    }

    const topicVisual = renderTopicVisual(workbench);
    if (topicVisual) {
      stage.appendChild(topicVisual);
    }

    if (diagram) {
      stage.appendChild(renderSemanticDiagram(sequence, scenario));
    } else {
      const traceWrap = createElement("div", "signal-trace-wrap");
      traceWrap.setAttribute("aria-label", "선택한 조건의 시스템 경로");
      const trace = createElement("ol", "signal-trace");
      route.forEach((routeItem, index) => {
        const item = createElement("li", "signal-node");
        const stateName = routeState(index, route.length, scenario, steps.length);
        item.dataset.state = stateName;
        const button = createElement("button", "signal-node__button");
        button.type = "button";
        button.dataset.focusKey = `route-${index}`;
        button.disabled = stateName === "blocked" || steps.length === 0;
        button.setAttribute("aria-label", `${routeItem.label}: ${routeStateLabel(stateName)}`);
        if (stateName === "active") {
          button.setAttribute("aria-current", "step");
        }
        button.append(
          createElement("span", "signal-node__index", String(index + 1).padStart(2, "0")),
          createElement("strong", "signal-node__label", routeItem.label),
          createElement("span", "signal-node__state", routeStateLabel(stateName))
        );
        button.addEventListener("click", () => {
          const mappedStep = route.length <= 1
            ? 0
            : Math.round((index / (route.length - 1)) * Math.max(steps.length - 1, 0));
          state.stepIndex = Math.max(0, Math.min(steps.length - 1, mappedStep));
          render({ focusKey: `route-${index}` });
        });
        item.appendChild(button);
        trace.appendChild(item);
      });
      traceWrap.appendChild(trace);
      stage.appendChild(traceWrap);
    }

    if (!diagram && list(scenario.fanOut).length) {
      const fanOut = createElement("div", "fanout-board");
      fanOut.appendChild(createElement("p", "fanout-board__label", "메시지를 받는 구독자"));
      const recipients = createElement("div", "fanout-board__recipients");
      list(scenario.fanOut).forEach((recipient) => recipients.appendChild(createElement("span", "fanout-recipient", recipient)));
      fanOut.appendChild(recipients);
      stage.appendChild(fanOut);
    }

    const snapshot = createElement("dl", "state-snapshot");
    list(scenario.snapshot).forEach((item) => {
      const card = createElement("div", `state-snapshot__item state-snapshot__item--${item.tone || "neutral"}`);
      card.append(createElement("dt", "", item.label), createElement("dd", "", item.value));
      snapshot.appendChild(card);
    });
    if (snapshot.childNodes.length) {
      stage.appendChild(snapshot);
    }

    const outcome = createElement("div", "outcome-panel");
    const evidence = createElement("div", "outcome-panel__item");
    evidence.append(createElement("span", "outcome-label", "관찰 증거"), createElement("p", "", scenario.evidence || flow.summary || "현재 경로를 확인하세요."));
    const decision = createElement("div", "outcome-panel__item");
    decision.append(createElement("span", "outcome-label", "판단"), createElement("p", "", scenario.outcome || "선택한 단계의 확인 지점을 설명해보세요."));
    outcome.append(evidence, decision);
    stage.appendChild(outcome);
    const comparison = renderComparison(workbench);
    if (comparison) {
      stage.appendChild(comparison);
    }
    stage.appendChild(renderReflection(scenario));
    const selectedStep = currentStep(sequence);
    const statusMessage = selectedStep._laneId
      ? `${scenario.label || "현재 조건"}, ${selectedStep._laneLabel}, ${selectedStep.from}에서 ${selectedStep.to}로 ${selectedStep.verb}: ${selectedStep.payload}`
      : `${scenario.label || "현재 조건"}: ${scenario.outcome || "경로가 갱신되었습니다."}`;
    updateLiveStatus(statusMessage);
    section.appendChild(stage);
    main.appendChild(section);
  }

  function renderCodePoint(point) {
    const article = createElement("article", "code-evidence");
    const header = createElement("header", "code-evidence__header");
    header.appendChild(createElement("h3", "", point.title || "이 단계에서 볼 코드"));
    appendText(header, "p", "code-evidence__intro", point.comment || point.explanation || point.body || "이 단계에서 책임이 바뀌는 코드를 먼저 읽습니다.");
    article.appendChild(header);
    if (point.snippet || point.example) {
      const pre = createElement("pre", "code-block");
      pre.appendChild(createElement("code", "", point.snippet || point.example));
      article.appendChild(pre);
    }
    const stateChange = point.stateChange || point.after || point.check;
    if (stateChange) {
      const change = createElement("div", "code-state-change");
      change.append(
        createElement("strong", "", point.stateChange || point.after ? "코드 뒤에 달라지는 것" : "이 코드 뒤에 확인할 것"),
        createElement("p", "", stateChange)
      );
      article.appendChild(change);
    }
    if (point.file) {
      const location = createElement("details", "code-location");
      location.append(
        createElement("summary", "", "전체 코드 위치"),
        createElement("code", "", point.file)
      );
      article.appendChild(location);
    }
    if (point.sourceUrl) {
      const source = makeLink("이 코드 위치 열기 ↗", point.sourceUrl, "text-link");
      source.target = "_blank";
      source.rel = "noreferrer";
      article.appendChild(source);
    }
    return article;
  }

  function renderEvidence(main, sequence) {
    const step = currentStep(sequence);
    const scenario = currentScenario(sequence);
    const section = createElement("section", "evidence-section");
    section.id = "evidence";
    const heading = createElement("header", "section-heading");
    heading.append(
      createElement("p", "eyebrow", "이 단계에서 확인할 근거"),
      createElement("h2", "", "현재 전달을 코드와 연결하기"),
      createElement("p", "section-lede", "현재 경로에서 무엇을 관찰했고 어느 책임을 확인해야 하는지 연결합니다.")
    );
    section.appendChild(heading);

    if (!isScenarioRevealed(scenario)) {
      const locked = createElement("div", "evidence-locked");
      locked.append(
        createElement("strong", "", "현재 조건의 경로가 아직 잠겨 있습니다"),
        createElement("p", "", "관찰 영역에서 결과를 먼저 예상하면 이 단계의 개념과 코드 증거가 함께 열립니다."),
        makeLink("예상 선택으로 이동 ↑", "#lab", "text-link")
      );
      section.appendChild(locked);
      main.appendChild(section);
      return;
    }

    const layout = createElement("div", "evidence-layout");
    const primary = createElement("article", "step-evidence");
    const stepMeta = step._laneId
      ? `${step._laneLabel} · 단계 ${step._laneStepIndex + 1} / ${step._laneStepCount}`
      : `단계 ${currentSteps(sequence).length ? state.stepIndex + 1 : 0}`;
    const evidenceScope = evidenceScopeLabels[step.evidenceScope] || evidenceScopeLabels.manual;
    primary.append(
      createElement("p", "step-evidence__meta", stepMeta),
      createElement("h3", "", `${evidenceScope}할 지점`),
      createElement("p", "step-evidence__check", step.check || step.output || "이 단계의 입력과 출력 근거를 확인하세요.")
    );
    appendText(primary, "p", "step-note", step.note);

    const context = createElement("aside", "context-drawer");
    context.appendChild(createElement("h3", "", "책임과 개념"));
    const owner = String(step.owner || step.to || step.concept || "").toLowerCase();
    const responsibility = list(sequence.responsibilities).find((item) => owner.includes(String(item.name || "").toLowerCase())) || list(sequence.responsibilities)[0];
    if (responsibility) {
      const block = createElement("div", "context-block");
      block.append(createElement("span", "context-label", responsibility.name), createElement("p", "", responsibility.role || ""));
      appendText(block, "p", "context-caution", responsibility.caution);
      context.appendChild(block);
    }
    list(sequence.concepts).slice(0, 2).forEach((concept) => {
      const block = createElement("div", "context-block");
      block.append(createElement("span", "context-label", concept.title || concept.name), createElement("p", "", concept.body || concept.description || ""));
      context.appendChild(block);
    });
    layout.append(primary, context);
    section.appendChild(layout);

    const codePoints = linkedCodePoints(sequence, step);
    const codeGrid = createElement("div", "code-evidence-grid");
    codePoints.forEach((point) => codeGrid.appendChild(renderCodePoint(point)));
    section.appendChild(codeGrid.childNodes.length ? codeGrid : createElement("p", "empty-state", "이 단계에 연결된 코드 포인트가 없습니다. 데이터의 codePointIds를 확인하세요."));

    const referenceDetails = createElement("details", "reference-shelf");
    referenceDetails.appendChild(createElement("summary", "", "용어·범위·관련 문서 펼치기"));
    const referenceBody = createElement("div", "reference-shelf__body");
    const glossary = createElement("dl", "glossary-list");
    list(sequence.glossary).forEach((item) => {
      const entry = createElement("div", "glossary-entry");
      entry.append(createElement("dt", "", item.term), createElement("dd", "", item.meaning));
      appendText(entry, "p", "context-caution", item.caution);
      glossary.appendChild(entry);
    });
    referenceBody.appendChild(glossary.childNodes.length ? glossary : createElement("p", "empty-state", "추가 용어가 없습니다."));

    const practical = createElement("div", "scope-notes");
    list(sequence.practical).forEach((item) => {
      const note = createElement("article", "scope-note");
      note.append(createElement("h3", "", item.title), createElement("p", "", item.body));
      practical.appendChild(note);
    });
    if (practical.childNodes.length) {
      referenceBody.appendChild(practical);
    }

    const links = createElement("nav", "source-links");
    links.setAttribute("aria-label", "관련 학습 문서");
    collectSourceLinks(sequence).forEach((item) => {
      const link = makeLink(`${item.label} ↗`, item.href, "source-link");
      link.target = "_blank";
      link.rel = "noreferrer";
      links.appendChild(link);
    });
    if (links.childNodes.length) {
      referenceBody.appendChild(links);
    }
    referenceDetails.appendChild(referenceBody);
    section.appendChild(referenceDetails);
    main.appendChild(section);
  }

  function renderVerification(main, sequence) {
    const section = createElement("section", "verification-section");
    section.id = "verify";
    const checks = list(sequence.checks).length ? sequence.checks : list(sequence.practice);
    const heading = createElement("header", "section-heading");
    heading.append(
      createElement("p", "eyebrow", "내 말로 설명해 보기"),
      createElement("h2", "", "흐름을 설명할 수 있는지 확인하세요"),
      createElement("p", "section-lede", "체크 상태는 현재 페이지에서만 유지되며 정답을 대신하지 않습니다.")
    );
    section.appendChild(heading);

    const status = createElement("div", "verification-status");
    const progress = createElement("progress", "verification-progress");
    progress.max = Math.max(checks.length, 1);
    progress.value = state.checked.size;
    progress.setAttribute("aria-label", `확인 완료 ${state.checked.size} / ${checks.length}`);
    status.append(progress, createElement("span", "verification-count", `${state.checked.size} / ${checks.length} 확인`));
    section.appendChild(status);

    const listElement = createElement("ul", "verification-list");
    checks.forEach((check, index) => {
      const item = createElement("li", "verification-item");
      const input = createElement("input", "verification-checkbox");
      input.type = "checkbox";
      input.id = `verification-${index}`;
      input.checked = state.checked.has(index);
      const label = createElement("label", "verification-label", check);
      label.htmlFor = input.id;
      input.addEventListener("change", () => {
        if (input.checked) {
          state.checked.add(index);
        } else {
          state.checked.delete(index);
        }
        progress.value = state.checked.size;
        status.querySelector(".verification-count").textContent = `${state.checked.size} / ${checks.length} 확인`;
      });
      item.append(input, label);
      listElement.appendChild(item);
    });
    section.appendChild(listElement.childNodes.length ? listElement : createElement("p", "empty-state", "확인 질문이 없습니다. 시퀀스 데이터를 확인하세요."));
    main.appendChild(section);
  }

  function localNextHref(sequence) {
    const current = Number(sequence.id);
    const next = Number(sequence.next && sequence.next.id);
    const repoName = sequence.repo && sequence.repo.name;
    const sameRepo =
      (repoName === "spring-boot-db-access-lab" && current >= 2 && current <= 5 && next >= 3 && next <= 6) ||
      (repoName === "spring-boot-deployment-runtime-lab" && current === 9 && next === 10);
    return sameRepo ? `../${String(next).padStart(2, "0")}/index.html` : "../../index.html";
  }

  function renderNext(main, sequence) {
    const nextData = sequence.next || {};
    const section = createElement("section", "next-question");
    section.id = "next";
    const copy = createElement("div", "next-question__copy");
    copy.append(
      createElement("p", "eyebrow", "다음에 이어서 볼 것"),
      createElement("h2", "", nextData.id && nextData.title ? `${nextData.id} ${nextData.title}` : "다음 학습으로 연결"),
      createElement("p", "", nextData.reason || "이번 흐름의 확인 질문을 마치고 다음 시퀀스로 이동하세요.")
    );
    const sameRepoLink = localNextHref(sequence);
    const actionLabel = sameRepoLink === "../../index.html" ? "이 저장소 학습 경로로 돌아가기" : "다음 질문 열기";
    section.append(copy, makeLink(`${actionLabel} →`, sameRepoLink, "next-action"));
    main.appendChild(section);
  }

  function setupSectionObserver() {
    if (sectionObserver) {
      sectionObserver.disconnect();
    }
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const links = [...document.querySelectorAll("[data-section-link]")];
    const sections = links.map((link) => document.getElementById(link.dataset.sectionLink)).filter(Boolean);
    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) {
          return;
        }
        links.forEach((link) => {
          if (link.dataset.sectionLink === visible.target.id) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      { rootMargin: "-20% 0px -65%", threshold: [0.1, 0.4, 0.7] }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  function renderSequence(root, sequence) {
    document.title = `${sequence.id} ${sequence.title} | ${(sequence.repo && sequence.repo.name) || "A&I Backend"} Visual Lab`;
    renderTopbar(root, sequence);
    const main = createElement("main", "sequence-shell");
    main.id = "main-content";
    renderHero(main, sequence);
    renderLearningNav(main);
    renderWorkbench(main, sequence);
    renderEvidence(main, sequence);
    renderVerification(main, sequence);
    renderNext(main, sequence);
    root.appendChild(main);
    window.requestAnimationFrame(setupSectionObserver);
  }

  function render(options) {
    const focusKey = options && options.focusKey;
    app.replaceChildren();
    const skip = makeLink("본문으로 건너뛰기", "#main-content", "skip-link");
    app.appendChild(skip);

    if (data.kind === "hub") {
      renderHub(app);
      return;
    }

    const sequence = currentSequence();
    if (!sequence) {
      const error = createElement("main", "fatal-state");
      error.id = "main-content";
      error.append(
        createElement("h1", "", "Visual Lab 데이터를 읽지 못했습니다"),
        createElement("p", "", "visual-lab-data.js가 먼저 로드되고 kind 값이 올바른지 확인하세요.")
      );
      app.appendChild(error);
      return;
    }

    const workbench = normalizedWorkbench(sequence);
    const scenarios = list(workbench.scenarios);
    state.scenarioIndex = Math.min(state.scenarioIndex, Math.max(scenarios.length - 1, 0));
    const scenario = currentScenario(sequence);
    state.flowIndex = flowIndexById(sequence, scenario.flowId);
    const steps = currentSteps(sequence);
    state.stepIndex = Math.min(state.stepIndex, Math.max(steps.length - 1, 0));

    renderSequence(app, sequence);

    if (focusKey) {
      window.requestAnimationFrame(() => {
        const targets = [...document.querySelectorAll(`[data-focus-key="${focusKey}"]`)];
        const target = targets.find((item) => item.offsetParent !== null) || targets[0];
        if (target && !target.disabled) {
          target.focus();
        }
      });
    }
  }

  motionQuery.addEventListener("change", () => {
    render();
  });
  render();
})();

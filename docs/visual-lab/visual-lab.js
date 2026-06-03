(function () {
  const data = window.visualLabData || {};
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const sections = [
    ["overview", "Overview"],
    ["why", "Why"],
    ["flow", "Flow"],
    ["responsibilities", "Responsibilities"],
    ["concepts", "Concepts"],
    ["terminology", "Terminology"],
    ["practical", "Practical Points"],
    ["checklist", "Checklist"],
    ["next", "Next"],
  ];

  const state = {
    sequenceId: "",
    flowIndex: 0,
    stepIndex: 0,
  };

  function normalizeSequences() {
    if (Array.isArray(data.sequences) && data.sequences.length > 0) {
      return data.sequences;
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

  function currentSequence() {
    return findSequence(state.sequenceId);
  }

  function currentFlow(sequence) {
    const flows = Array.isArray(sequence.flows) ? sequence.flows : [];
    return flows[state.flowIndex] || flows[0] || { title: "학습 흐름", steps: [] };
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
      const card = createElement("article", "info-card");
      card.append(
        createElement("h3", "", `한계 ${index + 1}`),
        createElement("p", "", limit)
      );
      grid.appendChild(card);
    });

    if (why.choice) {
      const card = createElement("article", "info-card");
      card.append(createElement("h3", "", "이번 선택"), createElement("p", "", why.choice));
      grid.appendChild(card);
    }

    section.appendChild(grid.childNodes.length ? grid : createElement("p", "empty-state", "문제 배경을 준비 중입니다."));
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

  function renderFlow(stack, sequence) {
    const section = makeSection("flow", "Flow", "핵심 흐름과 시퀀스 다이어그램", "이론 문서의 실행 흐름을 단계별로 눌러 확인합니다.");
    renderOverviewLine(section, sequence);

    const flows = Array.isArray(sequence.flows) ? sequence.flows : [];
    if (flows.length === 0) {
      section.appendChild(createElement("p", "empty-state", "시퀀스 다이어그램 데이터를 준비 중입니다."));
      stack.appendChild(section);
      return;
    }

    const shell = createElement("div", "flow-shell");
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

    const diagram = createElement("div", "diagram-layout");
    const rail = createElement("div", "step-rail");
    const steps = Array.isArray(flow.steps) ? flow.steps : [];

    steps.forEach((step, index) => {
      const label = step.owner || step.actor || `Step ${index + 1}`;
      const button = createElement("button", "step-button", `${index + 1}. ${label}`);
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
    const detail = createElement("article", "step-detail");
    detail.setAttribute("aria-live", "polite");
    detail.append(
      createElement("p", "step-meta", `Step ${selectedStep.order || state.stepIndex + 1}`),
      createElement("h3", "", selectedStep.owner || selectedStep.actor || "단계 준비 중")
    );
    appendText(detail, "p", "lede", selectedStep.note);

    const fields = createElement("dl", "step-fields");
    [
      ["Actor", selectedStep.actor],
      ["Input", selectedStep.input],
      ["Owner layer", selectedStep.owner],
      ["Action", selectedStep.action],
      ["Output", selectedStep.output],
      ["Why it matters", selectedStep.note],
    ].forEach(([label, value]) => {
      const field = createElement("div", "step-field");
      field.append(createElement("dt", "", label), createElement("dd", "", value || "준비 중입니다."));
      fields.appendChild(field);
    });
    detail.appendChild(fields);

    const controls = createElement("div", "step-controls");
    const progress = createElement("span", "progress-text", `${steps.length ? state.stepIndex + 1 : 0} / ${steps.length}`);
    const group = createElement("div", "control-group");
    const prev = createElement("button", "control-button", "이전");
    prev.type = "button";
    prev.disabled = state.stepIndex === 0;
    prev.setAttribute("aria-label", "이전 단계 보기");
    prev.addEventListener("click", () => {
      state.stepIndex = Math.max(0, state.stepIndex - 1);
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
    group.append(prev, next);
    controls.append(progress, group);
    detail.appendChild(controls);

    diagram.append(rail.childNodes.length ? rail : createElement("p", "empty-state", "단계 데이터를 준비 중입니다."), detail);
    shell.appendChild(diagram);

    if (flow.mermaid) {
      const figure = createElement("figure", "code-panel");
      figure.append(createElement("figcaption", "", "Mermaid source"), createElement("pre", "", flow.mermaid));
      shell.appendChild(figure);
    }

    section.appendChild(shell);
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
    renderFlow(stack, sequence);
    renderResponsibilities(stack, sequence);
    renderConcepts(stack, sequence);
    renderGlossary(stack, sequence);
    renderPractical(stack, sequence);
    renderChecks(stack, sequence);
    renderNext(stack, sequence);

    layout.appendChild(stack);
    root.appendChild(layout);
  }

  function initializeState() {
    const hashId = getHashSequenceId();
    const defaultId = data.defaultSequence || (sequences[0] && sequences[0].id) || "NN";
    state.sequenceId = findSequence(hashId).id || defaultId;
    if (!hashId && state.sequenceId) {
      window.history.replaceState(null, "", `#seq-${state.sequenceId}`);
    }
  }

  function render() {
    app.replaceChildren();
    renderTopbar(app);
    renderSequenceSwitcher(app);
    renderContent(app);
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

  initializeState();
  render();
})();

(function () {
  const data = window.visualLabData || {};
  const state = {
    stepIndex: 0,
  };

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const element = $(id);
    if (element) {
      element.textContent = value || "";
    }
  }

  function makeElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }

  function renderHeader() {
    const sequence = data.sequence || "NN";
    const title = data.title || "Visual Lab";
    document.title = `A&I ${sequence} Visual Lab`;
    setText("sequenceLabel", `Sequence ${sequence}`);
    setText("labTitle", title);
    setText("labGoal", data.goal || "이 시퀀스의 백엔드 흐름을 단계별로 확인한다.");
    setText("problemText", data.problem || "이 시퀀스가 해결하는 문제를 준비 중입니다.");
  }

  function renderConcepts() {
    const conceptList = $("conceptList");
    if (!conceptList) {
      return;
    }

    conceptList.replaceChildren();
    const concepts = data.concepts || [];
    if (concepts.length === 0) {
      conceptList.appendChild(makeElement("p", "empty-state", "핵심 개념을 준비 중입니다."));
      return;
    }

    concepts.forEach((concept) => {
      const card = makeElement("article", "concept-card");
      card.append(
        makeElement("h3", "", concept.name),
        makeElement("p", "", concept.description)
      );
      conceptList.appendChild(card);
    });
  }

  function renderFlowButtons() {
    const flowSteps = $("flowSteps");
    if (!flowSteps) {
      return;
    }

    flowSteps.replaceChildren();
    const flow = data.flow || [];
    if (flow.length === 0) {
      flowSteps.appendChild(makeElement("p", "empty-state", "학습 흐름을 준비 중입니다."));
      return;
    }

    flow.forEach((step, index) => {
      const button = makeElement("button", "flow-step");
      button.type = "button";
      button.setAttribute("aria-pressed", String(index === state.stepIndex));
      if (index === state.stepIndex) {
        button.classList.add("is-active");
      }

      button.append(
        makeElement("strong", "", `${index + 1}. ${step.label}`),
        makeElement("span", "", step.concept)
      );
      button.addEventListener("click", () => selectStep(index));
      flowSteps.appendChild(button);
    });
  }

  function renderStepDetail() {
    const flow = data.flow || [];
    const step = flow[state.stepIndex];
    if (!step) {
      setText("stepMeta", "No step");
      setText("stepTitle", "학습 흐름을 준비 중입니다.");
      setText("stepDescription", "필수 데이터가 없을 때도 Visual Lab 화면은 깨지지 않아야 합니다.");
      setText("stepProblem", "");
      setText("stepConcept", "");
      setText("stepAction", "");
      setText("stepCheck", "");
      setText("stepProgress", "0 / 0");
      return;
    }

    setText("stepMeta", step.id || `step-${state.stepIndex + 1}`);
    setText("stepTitle", step.label);
    setText("stepDescription", step.problem);
    setText("stepProblem", step.problem);
    setText("stepConcept", step.concept);
    setText("stepAction", step.action);
    setText("stepCheck", step.check);
    setText("stepProgress", `${state.stepIndex + 1} / ${flow.length}`);

    const prev = $("prevStep");
    const next = $("nextStep");
    if (prev) {
      prev.disabled = state.stepIndex === 0;
    }
    if (next) {
      next.disabled = state.stepIndex === flow.length - 1;
    }
  }

  function selectStep(index) {
    const flow = data.flow || [];
    if (flow.length === 0) {
      state.stepIndex = 0;
      renderFlowButtons();
      renderStepDetail();
      return;
    }
    state.stepIndex = Math.max(0, Math.min(index, flow.length - 1));
    renderFlowButtons();
    renderStepDetail();
  }

  function renderList(id, items, emptyText) {
    const list = $(id);
    if (!list) {
      return;
    }

    list.replaceChildren();
    if (!items || items.length === 0) {
      list.appendChild(makeElement("li", "empty-state", emptyText));
      return;
    }

    items.forEach((item) => {
      list.appendChild(makeElement("li", "", item));
    });
  }

  function renderPractice() {
    renderList("practiceList", data.practice, "실습 확인 항목을 준비 중입니다.");
  }

  function renderMentorHints() {
    renderList("mentorHintList", data.mentorHints, "멘토용 힌트를 준비 중입니다.");
  }

  function bindControls() {
    const prev = $("prevStep");
    const next = $("nextStep");

    if (prev) {
      prev.addEventListener("click", () => selectStep(state.stepIndex - 1));
    }
    if (next) {
      next.addEventListener("click", () => selectStep(state.stepIndex + 1));
    }
  }

  function init() {
    renderHeader();
    renderConcepts();
    renderPractice();
    renderMentorHints();
    bindControls();
    selectStep(0);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

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
    setText("branchLabel", `시작 브랜치: ${data.implementationBranch || "NN-implementation"}`);
  }

  function renderConcepts() {
    const conceptList = $("conceptList");
    if (!conceptList) {
      return;
    }

    conceptList.replaceChildren();
    (data.concepts || []).forEach((concept) => {
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
    (data.flow || []).forEach((step, index) => {
      const button = makeElement("button", "flow-step");
      button.type = "button";
      button.setAttribute("aria-pressed", String(index === state.stepIndex));
      if (index === state.stepIndex) {
        button.classList.add("is-active");
      }

      button.append(
        makeElement("strong", "", `${index + 1}. ${step.title}`),
        makeElement("span", "", `${step.actor} -> ${step.target}`)
      );
      button.addEventListener("click", () => selectStep(index));
      flowSteps.appendChild(button);
    });
  }

  function renderStepDetail() {
    const flow = data.flow || [];
    const step = flow[state.stepIndex];
    if (!step) {
      return;
    }

    setText("stepMeta", `${step.actor} -> ${step.target}`);
    setText("stepTitle", step.title);
    setText("stepDescription", step.description);
    setText("stepActor", step.actor);
    setText("stepTarget", step.target);
    setText("stepCheckpoint", `확인: ${step.checkpoint}`);
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
    state.stepIndex = Math.max(0, Math.min(index, flow.length - 1));
    renderFlowButtons();
    renderStepDetail();
  }

  function renderCheckpoints() {
    const checkpointList = $("checkpointList");
    if (!checkpointList) {
      return;
    }

    checkpointList.replaceChildren();
    (data.checkpoints || []).forEach((checkpoint) => {
      checkpointList.appendChild(makeElement("li", "", checkpoint));
    });
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
    renderCheckpoints();
    bindControls();
    selectStep(0);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

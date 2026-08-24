/* =========================================================
   CMSC 206 — Shared lesson behaviour
   assets/lesson.js

   Every component is opt-in: nothing runs unless the matching
   markup exists on the page. No lesson content lives in here.

   Markup contracts
   ----------------
   Progress bar    .progress > .progress__bar
   Section rail    a.rail__link[href="#sectionId"]
   Reveal          <button data-reveal aria-expanded="false">
   Accordion       .acc > .acc__head + .acc__body
   Pick activity   [data-activity="pick"] with .chip[data-correct]
                   optional: data-ok / data-no feedback strings
   File tree       .tree with .tree__node buttons;
                   toggle button: [data-highlight="#treeId"]
   Tabs            .toggle > .toggle__btn[data-panel="panelId"]
   Detail diagram  [data-detail-target="#panelId"] wrapping
                   buttons with data-detail="sourceId"
   Quiz            <script type="application/json" id="quizData">
   ========================================================= */
(function () {
  "use strict";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Progress bar ---------- */
  function initProgress() {
    var bar = $(".progress__bar");
    if (!bar) return;
    var track = bar.parentElement;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      bar.style.width = pct + "%";
      track.setAttribute("aria-valuenow", Math.round(pct));
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Section rail ---------- */
  function initRail() {
    var links = $$(".rail__link");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var sections = links
      .map(function (a) { return $(a.getAttribute("href")); })
      .filter(Boolean);
    if (!sections.length) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal (cards, ACID cells, anything) ---------- */
  function initReveal() {
    $$("[data-reveal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
      });
    });
  }

  /* ---------- Accordion ---------- */
  function initAccordion() {
    $$(".acc__head").forEach(function (head) {
      head.addEventListener("click", function () {
        var open = head.getAttribute("aria-expanded") === "true";
        head.setAttribute("aria-expanded", open ? "false" : "true");
        head.parentElement.classList.toggle("is-open", !open);
      });
    });
  }

  /* ---------- Pick-the-odd-ones-out activity ---------- */
  function initPick() {
    $$('[data-activity="pick"]').forEach(function (box) {
      var chips   = $$(".chip", box);
      var verdict = $(".activity__verdict", box);
      var okMsg   = box.dataset.ok || "Correct.";
      var noMsg   = box.dataset.no || "Not quite — try again.";

      function reset() {
        chips.forEach(function (c) {
          c.className = "chip";
          c.disabled = false;
          c.setAttribute("aria-pressed", "false");
        });
        if (verdict) { verdict.textContent = ""; verdict.className = "activity__verdict"; }
      }

      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", "false");
        c.addEventListener("click", function () {
          if (c.disabled) return;
          var on = c.classList.toggle("is-picked");
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });

      var checkBtn = $("[data-pick-check]", box);
      if (checkBtn) {
        checkBtn.addEventListener("click", function () {
          var allRight = true;
          chips.forEach(function (c) {
            var shouldPick = c.dataset.correct === "true";
            var picked = c.classList.contains("is-picked");
            c.classList.remove("is-picked");
            if (picked !== shouldPick) allRight = false;
            if (picked && shouldPick) c.classList.add("is-right");
            else if (picked && !shouldPick) c.classList.add("is-wrong");
            else if (!picked && shouldPick) c.classList.add("is-wrong");
            else c.classList.add("is-right");
            c.disabled = true;
          });
          if (verdict) {
            verdict.textContent = allRight ? okMsg : noMsg;
            verdict.className = "activity__verdict " + (allRight ? "ok" : "no");
          }
        });
      }

      var resetBtn = $("[data-pick-reset]", box);
      if (resetBtn) resetBtn.addEventListener("click", reset);
    });
  }

  /* ---------- File tree ---------- */
  function initTree() {
    $$(".tree__node").forEach(function (node) {
      node.addEventListener("click", function () {
        var open = node.getAttribute("aria-expanded") === "true";
        node.setAttribute("aria-expanded", open ? "false" : "true");
      });
    });

    $$("[data-highlight]").forEach(function (btn) {
      var target = $(btn.dataset.highlight);
      if (!target) return;
      var onLabel  = btn.dataset.labelOn  || "Hide highlights";
      var offLabel = btn.textContent.trim();
      btn.addEventListener("click", function () {
        var on = target.classList.toggle("show-dup");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? onLabel : offLabel;
        if (on) {
          $$(".tree__node", target).forEach(function (n) {
            n.setAttribute("aria-expanded", "true");
          });
        }
      });
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$(".toggle").forEach(function (group) {
      var btns = $$(".toggle__btn", group);
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          btns.forEach(function (b) {
            b.classList.remove("is-on");
            b.setAttribute("aria-selected", "false");
            var p = document.getElementById(b.dataset.panel);
            if (p) p.classList.add("is-hidden");
          });
          btn.classList.add("is-on");
          btn.setAttribute("aria-selected", "true");
          var panel = document.getElementById(btn.dataset.panel);
          if (panel) panel.classList.remove("is-hidden");
        });
      });
    });
  }

  /* ---------- Detail diagram ---------- */
  function initDetail() {
    $$("[data-detail-target]").forEach(function (group) {
      var panel = $(group.dataset.detailTarget);
      if (!panel) return;
      var placeholder = panel.innerHTML;
      var btns = $$("[data-detail]", group);

      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var wasOpen = btn.getAttribute("aria-expanded") === "true";
          btns.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
          if (wasOpen) { panel.innerHTML = placeholder; return; }
          var src = document.getElementById(btn.dataset.detail);
          if (!src) return;
          btn.setAttribute("aria-expanded", "true");
          panel.innerHTML = src.innerHTML;
        });
      });
    });
  }

  /* ---------- Check Your Understanding ---------- */
  function initQuiz() {
    var dataEl = document.getElementById("quizData");
    var body   = document.getElementById("quizBody");
    if (!dataEl || !body) return;

    var QUESTIONS;
    try {
      QUESTIONS = JSON.parse(dataEl.textContent);
    } catch (err) {
      body.innerHTML = '<p class="hint">The questions for this lesson could not be loaded. Check the JSON in #quizData.</p>';
      return;
    }
    if (!QUESTIONS.length) return;

    var KEYS = ["A", "B", "C", "D", "E"];
    var quizBox   = document.getElementById("quiz");
    var resultBox = document.getElementById("quizResult");
    var posEl     = document.getElementById("quizPos");
    var totalEl   = document.getElementById("quizTotal");
    var fill      = document.getElementById("quizFill");
    var prevBtn   = document.getElementById("quizPrev");
    var nextBtn   = document.getElementById("quizNext");
    var retryBtn  = document.getElementById("quizRetry");

    var state = { i: 0, answers: [] };
    function blank() { return new Array(QUESTIONS.length).fill(null); }

    if (totalEl) totalEl.textContent = QUESTIONS.length;

    function render() {
      var q = QUESTIONS[state.i];
      var picked = state.answers[state.i];

      if (posEl) posEl.textContent = state.i + 1;
      if (fill) fill.style.width = ((state.i + 1) / QUESTIONS.length) * 100 + "%";

      var html = '<p class="q__stem">' + q.stem + '</p><div class="q__opts">';
      q.options.forEach(function (opt, i) {
        var cls = "opt";
        if (picked !== null) {
          if (i === q.answer) cls += " is-correct";
          else if (i === picked) cls += " is-incorrect";
          else cls += " is-muted";
        }
        html += '<button type="button" class="' + cls + '" data-i="' + i + '"' +
          (picked !== null ? " disabled" : "") + '>' +
          '<span class="opt__key">' + (KEYS[i] || i + 1) + '</span><span>' + opt + '</span></button>';
      });
      html += "</div>";

      if (picked !== null) {
        var ok = picked === q.answer;
        html += '<div class="q__feedback ' + (ok ? "ok" : "no") + '">' +
          '<span class="q__verdict">' + (ok ? "Correct." : "Not quite.") + "</span>" +
          "<p>" + q.why + "</p></div>";
      }

      body.innerHTML = html;

      $$(".opt", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.answers[state.i] = parseInt(btn.dataset.i, 10);
          render();
        });
      });

      if (prevBtn) prevBtn.disabled = state.i === 0;
      if (nextBtn) {
        nextBtn.disabled = picked === null;
        nextBtn.textContent = state.i === QUESTIONS.length - 1 ? "See results" : "Next";
      }
    }

    function showResult() {
      var score = state.answers.reduce(function (n, a, i) {
        return n + (a === QUESTIONS[i].answer ? 1 : 0);
      }, 0);
      var total = QUESTIONS.length;
      var pct = score / total;

      var valEl = document.getElementById("scoreVal");
      var outEl = document.getElementById("scoreOut");
      var msgEl = document.getElementById("scoreMsg");
      var list  = document.getElementById("scoreList");

      if (valEl) valEl.textContent = score;
      if (outEl) outEl.textContent = "/" + total;

      if (msgEl) {
        var msg;
        if (pct === 1)        msg = "Full marks. You can define, defend, and distinguish every concept in this topic.";
        else if (pct >= 0.8)  msg = "Strong grasp. Revisit the items you missed and you're ready for the next topic.";
        else if (pct >= 0.6)  msg = "Solid start. Re-read the sections behind the items you missed, then try again.";
        else                  msg = "Worth another pass. Work back through the lesson, then retake this.";
        msgEl.textContent = msg;
      }

      if (list) {
        list.innerHTML = "";
        state.answers.forEach(function (a, i) {
          var li = document.createElement("li");
          var ok = a === QUESTIONS[i].answer;
          li.className = ok ? "ok" : "no";
          li.textContent = i + 1;
          li.title = "Item " + (i + 1) + (ok ? " — correct" : " — incorrect");
          list.appendChild(li);
        });
      }

      if (quizBox) quizBox.classList.add("is-hidden");
      if (resultBox) resultBox.classList.remove("is-hidden");
    }

    if (prevBtn) prevBtn.addEventListener("click", function () {
      if (state.i > 0) { state.i--; render(); }
    });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (state.i === QUESTIONS.length - 1) showResult();
      else { state.i++; render(); }
    });
    if (retryBtn) retryBtn.addEventListener("click", function () {
      state = { i: 0, answers: blank() };
      if (resultBox) resultBox.classList.add("is-hidden");
      if (quizBox) quizBox.classList.remove("is-hidden");
      render();
      var check = document.getElementById("check");
      if (check) check.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    state.answers = blank();
    render();
  }

  /* ---------- Report height to the Moodle parent page ---------- */
  function initHeightReport() {
    function post() {
      if (window.parent === window) return;
      try {
        window.parent.postMessage({
          type: "lesson:height",
          id: document.body.dataset.lesson || "lesson",
          height: document.documentElement.scrollHeight
        }, "*");
      } catch (e) { /* cross-origin parent — ignore */ }
    }
    if ("ResizeObserver" in window) new ResizeObserver(post).observe(document.body);
    window.addEventListener("load", post);
  }

  /* ---------- Boot ---------- */
  function boot() {
    initProgress();
    initRail();
    initReveal();
    initAccordion();
    initPick();
    initTree();
    initTabs();
    initDetail();
    initQuiz();
    initHeightReport();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

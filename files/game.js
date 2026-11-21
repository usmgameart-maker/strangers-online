// ============================================================
//  Движок игры. Тексты берутся из stories.js.
// ============================================================
(function () {
  "use strict";

  var STORIES = window.STORIES || [];
  var GAME = window.GAME || {};
  var LETTERS = ["А", "Б", "В"];

  var state = { index: 0, stars: 0, results: [], attempts: 0, sound: true };

  // ---------- помощники ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  var COLORS = ["#E0534A", "#F08C2E", "#22995E", "#2E86DE", "#5B4BD6", "#C2449F", "#0E9AA7"];
  function colorFor(name) {
    var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  }
  function initial(name) {
    var m = String(name).match(/[A-Za-zА-Яа-яЁё0-9]/);
    return m ? m[0].toUpperCase() : "?";
  }

  // ---------- совёнок Байт ----------
  var MASCOT =
    '<svg viewBox="0 0 200 200" aria-hidden="true">' +
    '<ellipse cx="100" cy="186" rx="52" ry="8" fill="#23304A" opacity=".08"/>' +
    '<path d="M56 72 L40 26 L86 56 Z" fill="#4234B0"/><path d="M144 72 L160 26 L114 56 Z" fill="#4234B0"/>' +
    '<ellipse cx="100" cy="112" rx="62" ry="70" fill="#5B4BD6"/>' +
    '<ellipse cx="100" cy="138" rx="38" ry="40" fill="#EEEBFF"/>' +
    '<path d="M80 128 q6 6 12 0 M98 140 q6 6 12 0 M84 152 q6 6 12 0 M104 160 q5 5 10 0" stroke="#C9C2F5" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="75" cy="88" r="25" fill="#fff"/><circle cx="125" cy="88" r="25" fill="#fff"/>' +
    '<circle cx="79" cy="90" r="12" fill="#23304A"/><circle cx="121" cy="90" r="12" fill="#23304A"/>' +
    '<circle cx="83" cy="85" r="4" fill="#fff"/><circle cx="125" cy="85" r="4" fill="#fff"/>' +
    '<path d="M92 104 L108 104 L100 117 Z" fill="#FFC53D"/>' +
    '<ellipse cx="42" cy="122" rx="12" ry="30" fill="#4234B0" transform="rotate(14 42 122)"/>' +
    '<ellipse cx="158" cy="122" rx="12" ry="30" fill="#4234B0" transform="rotate(-14 158 122)"/>' +
    '<path d="M80 178 l-6 8 M86 178 v9 M92 178 l6 8 M108 178 l-6 8 M114 178 v9 M120 178 l6 8" stroke="#FFC53D" stroke-width="4" stroke-linecap="round"/>' +
    '<g transform="translate(132 132)"><path d="M18 0 L36 7 V20 C36 32 28 40 18 44 C8 40 0 32 0 20 V7 Z" fill="#22995E" stroke="#fff" stroke-width="3"/>' +
    '<path d="M10 21 l6 6 l11 -12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' +
    '</svg>';
  function drawMascots() {
    var list = document.querySelectorAll("[data-mascot]");
    for (var i = 0; i < list.length; i++) list[i].innerHTML = MASCOT;
  }

  // ---------- звуки (генерируются) ----------
  var audioCtx = null;
  function beep(notes) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      notes.forEach(function (n, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = n[2] || "sine"; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t + i * n[1]);
        g.gain.exponentialRampToValueAtTime(0.18, t + i * n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i + 1) * n[1]);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t + i * n[1]); o.stop(t + (i + 1) * n[1] + 0.02);
      });
    } catch (e) { /* без звука */ }
  }
  var SOUND_RIGHT = [[523, .1], [659, .1], [784, .18]];
  var SOUND_WRONG = [[300, .14, "triangle"], [220, .22, "triangle"]];
  var SOUND_MSG = [[880, .07], [1175, .09]];

  // ---------- иконки приложений ----------
  var ICONS = {
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1" fill="#fff"/><circle cx="18" cy="13.5" r="1" fill="#fff"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="3"/><path d="M16 10l6-3v10l-6-3z"/></svg>',
    social: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="4"/><path d="M2 20c1-4 4-6 7-6s6 2 7 6M19 8v6M16 11h6"/></svg>'
  };
  function appType(app) {
    var a = String(app).toLowerCase();
    if (a.indexOf("видео") >= 0 || a.indexOf("звон") >= 0) return "video";
    if (a.indexOf("заявк") >= 0 || a.indexOf("соцсет") >= 0) return "social";
    if (a.indexOf("игр") >= 0) return "game";
    return "chat";
  }
  var APP_COLORS = { game: "#F08C2E", chat: "#2E86DE", video: "#22995E", social: "#5B4BD6" };

  // ---------- текст сообщения: ссылки и файлы ----------
  function formatMessage(text) {
    var files = [];
    var html = esc(text).replace(/:?\s*\b[\w\-]+\.(exe|apk|zip|bat)\b/gi, function (m) { files.push(m.replace(/^:?\s*/, "")); return " "; });
    html = html.replace(/((?:https?:\/\/)?(?:[a-z0-9\-]+\.)+[a-z]{2,}\/[^\s<]*)/gi, '<span class="link">$1</span>');
    html = html.replace(/:\s*$/, "").trim();
    files.forEach(function (f) { html += '<div class="file">📦 ' + f + '</div>'; });
    return html;
  }

  // ---------- экраны ----------
  function show(id) {
    var s = document.querySelectorAll(".screen");
    for (var i = 0; i < s.length; i++) s[i].classList.remove("active");
    $(id).classList.add("active");
    window.scrollTo(0, 0);
  }

  function drawProgress() {
    var p = $("progress"); p.innerHTML = "";
    STORIES.forEach(function (s, i) {
      var d = el("div", "dot", String(i + 1));
      if (i === state.index) d.classList.add("current");
      else if (state.results[i] === true) { d.classList.add("star"); d.textContent = "★"; }
      else if (state.results[i] === false) d.classList.add("done");
      p.appendChild(d);
    });
    $("stars-now").textContent = state.stars;
  }

  function drawPhone(story) {
    var type = appType(story.app);
    var appBox = $("phone-app"), screen = $("phone-screen");
    appBox.innerHTML =
      '<div class="app-icon" style="background:' + APP_COLORS[type] + '">' + ICONS[type] + '</div>' +
      '<div><div class="app-name">' + esc(story.app) + '</div><div class="app-sender">' + esc(story.sender) + '</div></div>';
    screen.innerHTML = "";
    var color = colorFor(story.sender), letter = initial(story.sender);

    if (type === "video") {
      var call = el("div", "call",
        '<div class="avatar" style="background:' + color + '">' + letter + '</div>' +
        '<div class="call-title">' + esc(story.sender) + '</div>' +
        '<div class="call-sub">Входящий видеозвонок…</div>');
      screen.appendChild(call);
    }
    if (type === "social") {
      screen.appendChild(el("div", "friend",
        '<div class="avatar" style="background:' + color + '">' + letter + '</div>' +
        '<div class="friend-name">' + esc(story.sender) + '</div>' +
        '<div class="friend-sub">хочет добавить вас в друзья</div>' +
        '<div class="friend-buttons"><span style="background:#EEEBFF;color:#5B4BD6">Добавить</span><span style="background:#F2F5FA;color:#66738A">Отклонить</span></div>'));
    }

    var typing = el("div", "typing", "<span></span><span></span><span></span>");
    screen.appendChild(typing);
    setTimeout(function () {
      typing.remove();
      var row = el("div", "msg-row",
        '<div class="avatar" style="background:' + color + '">' + letter + '</div>' +
        '<div class="bubble"><div class="who" style="color:' + color + '">' + esc(story.sender) + '</div>' +
        formatMessage(story.message) + '<div class="time">12:30</div></div>');
      screen.appendChild(row);
      beep(SOUND_MSG);
    }, 900);
  }

  function drawStory() {
    var story = STORIES[state.index];
    state.attempts = 0;
    drawProgress();
    drawPhone(story);
    $("situation-label").textContent = "Ситуация " + (state.index + 1) + " из " + STORIES.length;
    $("question").textContent = story.question || "Что ты сделаешь?";
    ["feedback", "rule", "btn-retry", "btn-next"].forEach(function (id) { $(id).classList.add("hidden"); });

    var box = $("answers"); box.innerHTML = "";
    shuffle(story.answers).forEach(function (a, i) {
      var b = el("button", "answer", '<span class="letter">' + LETTERS[i] + '</span><span>' + esc(a.text) + '</span>');
      b._answer = a;
      b.addEventListener("click", function () { choose(b); });
      box.appendChild(b);
    });
  }

  function choose(btn) {
    if (btn.disabled) return;
    var a = btn._answer, story = STORIES[state.index];
    state.attempts++;
    var buttons = $("answers").querySelectorAll(".answer");
    for (var i = 0; i < buttons.length; i++) buttons[i].disabled = true;

    var fb = $("feedback");
    fb.classList.remove("hidden", "good", "bad");
    $("feedback-text").textContent = a.feedback;

    if (a.correct) {
      btn.classList.add("right");
      for (var j = 0; j < buttons.length; j++) if (buttons[j] !== btn) buttons[j].classList.add("dim");
      fb.classList.add("good");
      var firstTry = state.attempts === 1;
      $("feedback-title").textContent = firstTry ? "Звезда твоя! +1 ★" : "Получилось со второй попытки";
      if (firstTry) state.stars++;
      state.results[state.index] = firstTry;
      $("rule-text").textContent = story.rule;
      $("rule").classList.remove("hidden");
      $("btn-retry").classList.add("hidden");
      $("btn-next").textContent = state.index === STORIES.length - 1 ? "Узнать результат →" : "Дальше →";
      $("btn-next").classList.remove("hidden");
      $("stars-now").textContent = state.stars;
      beep(SOUND_RIGHT);
    } else {
      btn.classList.add("wrong");
      btn._used = true;
      fb.classList.add("bad");
      $("feedback-title").textContent = "Подумай ещё!";
      $("btn-retry").classList.remove("hidden");
      beep(SOUND_WRONG);
    }
  }

  function retry() {
    var buttons = $("answers").querySelectorAll(".answer");
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i]._used) { buttons[i].classList.remove("wrong"); buttons[i].classList.add("dim"); }
      else buttons[i].disabled = false;
    }
    $("feedback").classList.add("hidden");
    $("btn-retry").classList.add("hidden");
  }

  function next() {
    if (state.index < STORIES.length - 1) { state.index++; drawStory(); }
    else finish();
  }

  function finish() {
    var n = STORIES.length, s = state.stars;
    var title = s === n ? "Ты — настоящий защитник!" :
                s >= Math.ceil(n * 0.7) ? "Отличный результат!" :
                s >= Math.ceil(n * 0.4) ? "Хорошее начало!" : "Есть над чем подумать!";
    $("finish-title").textContent = title;
    $("finish-score").textContent = "С первой попытки: " + s + " из " + n;
    var stars = "";
    for (var i = 0; i < n; i++) stars += state.results[i] ? "★" : '<span class="off">★</span>';
    $("finish-stars").innerHTML = stars;
    var memo = $("memo"); memo.innerHTML = "";
    STORIES.forEach(function (st) { memo.appendChild(el("li", "", esc(st.rule))); });
    show("screen-finish");
  }

  function start() {
    state.index = 0; state.stars = 0; state.results = [];
    show("screen-game");
    drawStory();
  }

  // ---------- запуск ----------
  document.addEventListener("DOMContentLoaded", function () {
    drawMascots();
    $("start-title").textContent = GAME.title || "Цифровая безопасность";
    $("start-badge").textContent = [GAME.subtitle, GAME.classes].filter(Boolean).join(" · ");
    document.title = (GAME.title || "Игра") + " — " + (GAME.subtitle || "");
    $("btn-start").addEventListener("click", start);
    $("btn-next").addEventListener("click", next);
    $("btn-retry").addEventListener("click", retry);
    $("btn-restart").addEventListener("click", start);
    $("btn-print").addEventListener("click", function () { window.print(); });
    $("btn-sound").addEventListener("click", function () {
      state.sound = !state.sound;
      this.textContent = state.sound ? "🔊" : "🔇";
    });
    // Клавиши: 1, 2, 3 — ответы; Enter — дальше
    document.addEventListener("keydown", function (e) {
      if (!$("screen-game").classList.contains("active")) return;
      var k = parseInt(e.key, 10);
      if (k >= 1 && k <= 3) {
        var b = $("answers").querySelectorAll(".answer")[k - 1];
        if (b && !b.disabled) b.click();
      }
      if (e.key === "Enter") {
        if (!$("btn-next").classList.contains("hidden")) next();
        else if (!$("btn-retry").classList.contains("hidden")) retry();
      }
    });
  });
})();

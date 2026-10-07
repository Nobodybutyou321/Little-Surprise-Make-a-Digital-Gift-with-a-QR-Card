(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var MSG_MAX = 250, NAME_MAX = 40;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- THEMES: name, emoji, decorations, accent, 3 background colors, receiver title, receiver subtitle, dark? ----
  var THEMES = {
    flowers:   ["Flowers","🌷","🌷 🌸 🌻 🌼 🌹","#d6457f","#ffe3ee","#f1e6ff","#fff6e6","Someone made a little surprise for you","A bouquet is waiting for you."],
    hearts:    ["Hearts","💖","💖 💗 💕 💘 🩷","#dd3f78","#ffdfea","#f3e0ff","#fff0f4","Someone made a little surprise for you","It was made with love."],
    stars:     ["Stars","✨","⭐ ✨ 🌟 💫 🌙","#7455cf","#e6e0ff","#d9ecff","#f6f0ff","A little surprise, just for you","Something bright is waiting."],
    cute:      ["Cute","🧸","🧸 🐰 🍓 🎀 🐻","#e0608f","#ffe8f1","#e2f5ff","#fff7e0","Aww, you got a surprise!","Someone was thinking of you."],
    birthday:  ["Birthday","🎂","🎂 🎈 🎉 🎁 🧁","#e2527c","#fff0d2","#ffdfee","#e6f3ff","A birthday surprise for you","Someone made this for your special day."],
    thanks:    ["Thank You","🙏","🙏 💐 🤍 🌿 ✨","#2f8f83","#dff5ec","#fff6df","#e8f1ff","A thank-you, just for you","Someone wanted you to know."],
    dreamy:    ["Dreamy","🌙","🌙 💜 ✨ 🦋 💫","#8a63d2","#efe6ff","#dfe9ff","#ffe9f6","A dreamy little surprise","Float in and open it."],
    night:     ["Night Sky","🌌","⭐ 🌙 ✨ 💫 🌠","#c8b6ff","#1f1b4d","#2d2766","#18243f","A little surprise under the stars","Something is shining just for you.",1],
    christmas: ["Christmas","🎄","🎄 ⭐ 🎁 🔔 🎅","#c0392b","#e6f6ee","#ffe9e9","#fff8e6","A Christmas surprise for you","Merry Christmas!"],
    graduation:["Graduation","🎓","🎓 🎉 ⭐ 📚 🎊","#3b6fb6","#e4eeff","#fff4d6","#f1e6ff","A graduation surprise for you","Someone is very proud of you."]
  };
  function T(k) {
    var x = THEMES[k] || THEMES.flowers;
    return { n: x[0], e: x[1], d: x[2].split(" "), a: x[3], c: [x[4], x[5], x[6]], t: x[7], s: x[8], dk: !!x[9] };
  }

  // ---- OCCASIONS: label, suggested theme, then message ideas ----
  var OCC = {
    because:    ["Just Because","flowers","No special reason. I just wanted to make you smile.","You crossed my mind today, so I made you this."],
    birthday:   ["Birthday","birthday","Happy birthday! I hope today brings you lots of reasons to smile.","Another year, another reason to celebrate you."],
    thanks:     ["Thank You","thanks","Thank you for always being there.","I'm really grateful for everything you've done for me."],
    congrats:   ["Congratulations","stars","You did it! I'm really proud of you.","All your hard work paid off. Congratulations!"],
    friends:    ["Friendship","cute","Just a little reminder that you're an amazing friend.","I'm so glad we met. You make everything more fun."],
    valentine:  ["Valentine's Day","hearts","Happy Valentine's Day! You make my days brighter.","Sending you a little love today and every day."],
    christmas:  ["Christmas","christmas","Merry Christmas! I hope your day is warm and full of joy.","Wishing you cozy moments and lots of smiles this season."],
    graduation: ["Graduation","graduation","Congratulations, graduate! You worked so hard for this.","Here's to everything you've learned and everything ahead."],
    anniversary:["Anniversary","hearts","Happy anniversary! Thank you for every moment with you.","I'm so glad we have each other."],
    luck:       ["Good Luck","stars","Good luck! I believe in you.","You've got this. I'll be cheering for you."],
    sorry:      ["I'm Sorry","dreamy","I'm sorry. I care about you, and I'd like to make things right.","I'm sorry I hurt you. Thank you for being patient with me."],
    custom:     ["Custom","flowers"]
  };
  var STYLES = [["minimal","◻️","Minimal"],["cute","🎀","Cute"],["floral","🌸","Floral"],["elegant","✨","Elegant"]];

  var st = { occ: "because", theme: "flowers", style: "cute" };
  var previewing = false, current = null, lastIdea = "", typer;

  // ---- Encoding: text <-> URL-safe base64 (handles emoji and any language) ----
  function enc(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function dec(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  // The website's own address, found automatically (works on any domain)
  function baseURL() {
    return location.protocol === "file:" ? location.href.split("#")[0] : location.origin + location.pathname;
  }
  // Read and clean gift data from the URL; returns null if it isn't valid
  function parseGift(code) {
    try {
      var o = JSON.parse(dec(code));
      if (!o || typeof o !== "object" || typeof o.m !== "string" || !o.m) return null;
      return {
        r: String(o.r || "").slice(0, NAME_MAX), m: o.m.slice(0, MSG_MAX),
        s: String(o.s || "").slice(0, NAME_MAX),
        t: THEMES[o.t] ? o.t : "flowers", o: OCC[o.o] ? o.o : "custom"
      };
    } catch (e) { return null; }
  }
  function applyTheme(key) {
    var t = T(key), s = document.documentElement.style;
    s.setProperty("--accent", t.a);
    s.setProperty("--bg1", t.c[0]); s.setProperty("--bg2", t.c[1]); s.setProperty("--bg3", t.c[2]);
    s.setProperty("--out", t.dk ? "#e9e3ff" : "#8c7683");
  }

  // ---- Creator: pickers, ideas, live preview ----
  // items = [[key, emoji, label], ...]. Built with textContent only (never innerHTML).
  function picker(boxId, items, current, onPick) {
    var box = $(boxId); box.replaceChildren();
    items.forEach(function (it) {
      var b = document.createElement("button"), e = document.createElement("span");
      b.type = "button"; b.setAttribute("aria-pressed", it[0] === current);
      e.textContent = it[1]; b.append(e, it[2]);
      b.onclick = function () { onPick(it[0]); };
      box.appendChild(b);
    });
  }
  function buildThemes() {
    picker("themes", Object.keys(THEMES).map(function (k) { return [k, T(k).e, T(k).n]; }), st.theme,
      function (k) { st.theme = k; applyTheme(k); buildThemes(); updatePreview(); });
  }
  function buildStyles() {
    picker("styles", STYLES, st.style, function (k) { st.style = k; buildStyles(); styleCard(); });
  }
  function buildIdeas() {
    var box = $("ideas"); box.replaceChildren();
    OCC[st.occ].slice(2).forEach(function (text) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "💡 " + text.split(" ").slice(0, 4).join(" ") + "…";
      b.onclick = function () {
        var m = $("msg"), cur = m.value.trim();
        m.value = (!cur || cur === lastIdea) ? text : (cur + "\n" + text).slice(0, MSG_MAX);
        lastIdea = text; updatePreview();
      };
      box.appendChild(b);
    });
  }
  function buildOccasions() {
    Object.keys(OCC).forEach(function (k) {
      var o = document.createElement("option"); o.value = k; o.textContent = OCC[k][0]; $("occ").appendChild(o);
    });
  }
  function updatePreview() {
    var t = T(st.theme), r = $("rec").value.trim(), m = $("msg").value.trim(), s = $("snd").value.trim();
    $("pvDeco").textContent = t.d.slice(0, 3).join(" ");
    $("pvDear").textContent = r ? "Dear " + r + "," : "Dear friend,";
    $("pvBody").textContent = m || "Your message will appear here.";
    $("pvSign").textContent = "— " + (s || "You");
    $("cnt").textContent = $("msg").value.length;
  }
  $("occ").onchange = function () {
    st.occ = this.value; st.theme = OCC[st.occ][1];
    applyTheme(st.theme); buildThemes(); buildIdeas(); updatePreview();
  };
  ["rec", "msg", "snd"].forEach(function (id) { $(id).addEventListener("input", updatePreview); });

  // ---- QR code + card ----
  function drawQR(box, url, size) {
    box.replaceChildren();
    try {
      new QRCode(box, { text: url, width: size, height: size, colorDark: "#2d1f27", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
      return true;
    } catch (e) { box.replaceChildren(); return false; }
  }
  function styleCard() {
    var t = T(st.theme);
    $("card").className = "qrcard s-" + st.style;
    $("cEmoji").textContent = t.e;
    $("cTop").textContent = $("cBot").textContent = t.d.join(" ");
  }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = $("rec").value.trim(), m = $("msg").value.trim(), s = $("snd").value.trim();
    if (!r || !m) {
      $("err").textContent = !r ? "Please add the recipient's name." : "Please write a message.";
      $(!r ? "rec" : "msg").focus(); return;
    }
    var url = baseURL() + "#gift=" + enc(JSON.stringify({ v: 2, r: r, m: m, s: s, t: st.theme, o: st.occ }));
    if (!drawQR($("qr"), url, 260)) {
      $("err").textContent = "Couldn't make the QR code. Try a shorter message, or check your internet connection."; return;
    }
    $("err").textContent = ""; $("link").value = url;
    styleCard(); buildStyles();
    $("build").classList.add("hidden"); $("result").classList.remove("hidden");
    $("result").scrollIntoView();
  });
  $("again").onclick = function () {
    $("result").classList.add("hidden"); $("build").classList.remove("hidden"); $("make").scrollIntoView();
  };

  // ---- Copy / share / preview / print ----
  $("copy").onclick = function () {
    var i = $("link"), b = this;
    function ok() { b.textContent = "Copied ✓"; setTimeout(function () { b.textContent = "Copy Link"; }, 1800); }
    function fallback() {
      i.focus(); i.select(); i.setSelectionRange(0, 99999);
      try { document.execCommand("copy") ? ok() : (b.textContent = "Press and hold to copy"); }
      catch (e) { b.textContent = "Press and hold to copy"; }
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(i.value).then(ok, fallback);
    else fallback();
  };
  if (!navigator.share) $("share").classList.add("hidden");
  $("share").onclick = function () {
    navigator.share({ title: "A little surprise 💌", text: "Someone made you a little surprise.", url: $("link").value }).catch(function () {});
  };
  $("prev").onclick = function () { previewing = true; location.hash = $("link").value.split("#")[1]; };
  $("print").onclick = function () { window.print(); };
  $("back").onclick = function () { previewing = false; location.hash = ""; };
  $("mine").onclick = function () { previewing = false; location.hash = ""; };

  // ---- Save the QR card as a high-resolution PNG ----
  function rr(x, X, Y, w, h, r) {   // rounded rectangle path
    x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
    x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
  }
  function cardBlob(url) {
    var ready = document.fonts ? Promise.all([document.fonts.load('90px "Gochi Hand"'), document.fonts.load("bold 60px Quicksand")]) : Promise.resolve();
    return ready.then(function () {
      var W = 1200, H = 1800, t = T(st.theme), s = st.style, c = document.createElement("canvas"), x = c.getContext("2d");
      c.width = W; c.height = H;
      var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, t.c[0]); g.addColorStop(1, t.c[1]);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = "#fff"; rr(x, 70, 70, W - 140, H - 140, s === "minimal" ? 24 : 80); x.fill();
      x.strokeStyle = s === "minimal" ? "#ddd" : t.a; x.lineWidth = s === "elegant" ? 5 : 7;
      if (s === "cute") x.setLineDash([24, 18]);
      rr(x, 110, 110, W - 220, H - 220, s === "elegant" ? 8 : 56); x.stroke(); x.setLineDash([]);
      if (s === "elegant") { x.lineWidth = 2; rr(x, 130, 130, W - 260, H - 260, 4); x.stroke(); }
      x.textAlign = "center"; x.fillStyle = t.a;
      if (s === "floral") { x.font = "56px sans-serif"; x.fillText(t.d.join(" "), W / 2, 215); x.fillText(t.d.join(" "), W / 2, 1655); }
      x.font = "150px sans-serif"; x.fillText(t.e, W / 2, 380);
      x.font = s === "elegant" ? "88px Georgia,serif" : '104px "Gochi Hand",cursive';
      x.fillText("A little surprise", W / 2, 520); x.fillText("for you", W / 2, 630);
      var tmp = document.createElement("div");   // QR sits on plain white with a wide empty margin
      drawQR(tmp, url, 640);
      x.imageSmoothingEnabled = false; x.drawImage(tmp.querySelector("canvas"), 280, 720, 640, 640);
      x.fillStyle = "#43303b"; x.font = "bold 64px Quicksand,sans-serif"; x.fillText("SCAN ME", W / 2, 1470);
      x.fillStyle = "#8c7683"; x.font = "40px Quicksand,sans-serif"; x.fillText("Someone made this just for you.", W / 2, 1540);
      return new Promise(function (res) { c.toBlob(res, "image/png"); });
    });
  }
  $("save").onclick = function () {
    var b = this, label = b.textContent;
    b.textContent = "Making image…";
    cardBlob($("link").value).then(function (blob) {
      var f = new File([blob], "little-surprise-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] }) && matchMedia("(pointer:coarse)").matches)
        return navigator.share({ files: [f] });   // phones: opens the share / save-to-photos sheet
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }).catch(function () {}).then(function () { b.textContent = label; });
  };

  // ---- Receiver ----
  function fall(list, count) {   // falling decorations
    if (reduce) return;
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.className = "fall"; s.textContent = list[i % list.length];
      s.style.left = Math.random() * 94 + "vw";
      s.style.animationDuration = 4 + Math.random() * 4 + "s";
      s.style.animationDelay = Math.random() * 1.5 + "s";
      s.addEventListener("animationend", function () { this.remove(); });
      document.body.appendChild(s);
    }
  }
  function showReceiver(g) {
    var t = T(g.t), chars = Array.from(g.m);
    current = g; applyTheme(g.t); clearInterval(typer);
    $("creator").classList.add("hidden"); $("receiver").classList.remove("hidden");
    $("back").classList.toggle("hidden", !previewing);
    $("env").classList.remove("open");
    $("pop").textContent = t.e;
    $("rTitle").textContent = t.t + " " + t.e;
    $("rSub").textContent = t.s;
    $("rOcc").textContent = g.o === "custom" ? "" : OCC[g.o][0];
    $("deco").textContent = t.d.join(" ");
    $("rDear").textContent = g.r ? "Dear " + g.r + "," : "Hello,";
    $("t1").textContent = ""; $("t2").textContent = g.m;
    $("rSign").textContent = "— " + (g.s || "Someone who cares");
    $("rSign").classList.remove("show"); $("after").classList.add("hidden");
    $("intro").classList.remove("hidden"); $("letter").classList.add("hidden");
    document.title = "You have a little surprise 💌";
    window.scrollTo(0, 0); fall(t.d, 6);
    function finish() {
      clearInterval(typer);
      $("t1").textContent = g.m; $("t2").textContent = "";
      $("rSign").classList.add("show"); $("after").classList.remove("hidden"); fall(t.d, 10);
    }
    $("letter").onclick = finish;   // tap the letter to skip the typing
    $("replay").onclick = function (e) { e.stopPropagation(); showReceiver(g); };
    $("open").onclick = function () {
      $("env").classList.add("open");
      setTimeout(function () {
        $("intro").classList.add("hidden"); $("letter").classList.remove("hidden");
        fall(t.d, 16);
        if (reduce) return finish();
        var n = 0, step = Math.max(1, Math.ceil(chars.length / 120));
        typer = setInterval(function () {
          n += step;
          if (n >= chars.length) return finish();
          $("t1").textContent = chars.slice(0, n).join("");
          $("t2").textContent = chars.slice(n).join("");
        }, 30);
      }, reduce ? 0 : 800);
    };
  }
  function showCreator(msg) {
    previewing = false; clearInterval(typer); applyTheme(st.theme);
    $("receiver").classList.add("hidden"); $("creator").classList.remove("hidden");
    $("notice").textContent = msg || ""; $("notice").classList.toggle("hidden", !msg);
    document.title = "Little Surprise – Make a Digital Gift with a QR Card";
  }

  // ---- Router: a #gift=... link shows the receiver, anything else shows the creator ----
  function route() {
    var h = location.hash, m = h.match(/^#gift=([A-Za-z0-9_-]+)$/), g = m && parseGift(m[1]);
    if (g) showReceiver(g);
    else showCreator(h.indexOf("#gift=") === 0 ? "That gift link looks incomplete or broken. You can make a new gift below." : "");
  }
  window.addEventListener("hashchange", route);

  buildOccasions(); buildThemes(); buildIdeas(); updatePreview();
  route();
})();
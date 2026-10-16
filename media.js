(function () {
  "use strict";

  var CLOUD_NAME = "mnjk6qu9";
  var UPLOAD_PRESET = "little_surprise";

  var MAX_VIDEO_MB = 100, MAX_SECONDS = 60, MAX_SIDE = 1600;
  var $ = function (id) { return document.getElementById(id); };
  var BASE = "https://res.cloudinary.com/" + CLOUD_NAME + "/";
  var SAFE = /^[iv]\/[\w\-.\/]{3,150}$/;
  var media = "", busy = false, localURL = "";

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    window.GiftMedia = { get: function () { return ""; }, clean: function () { return ""; }, show: function () {} };
    return;
  }

  var css = document.createElement("style");
  css.textContent =
    ".mup{margin:16px 0 0}.mup .pick{display:block;margin:0;text-align:center;border:2px dashed var(--accent);border-radius:14px;padding:14px;color:var(--accent);background:#fff;cursor:pointer}" +
    ".mup .pick:focus-within{outline:3px solid var(--accent);outline-offset:2px}.mup input{position:absolute;opacity:0;width:1px;height:1px}" +
    ".mup .st{font-size:.85rem;color:var(--soft);margin:6px 0 0}.mup progress{width:100%;height:8px;margin-top:8px}" +
    ".mup .rm{font:inherit;font-weight:700;color:var(--accent);background:none;border:0;padding:10px 0;cursor:pointer}" +
    ".gm{margin:12px 0;padding:8px;background:#fff;border-radius:16px;box-shadow:0 8px 20px rgba(120,70,100,.18);transform:rotate(-1deg)}" +
    ".gm img,.gm video{display:block;width:100%;max-height:60vh;object-fit:contain;border-radius:10px;background:#fff}.gm video{background:#000}";
  document.head.appendChild(css);

  var box = document.createElement("div"), lab = document.createElement("label"), inp = document.createElement("input");
  var st = document.createElement("p"), pr = document.createElement("progress"), rm = document.createElement("button");
  box.className = "mup"; lab.className = "pick"; st.className = "st"; rm.className = "rm";
  inp.type = "file"; inp.accept = "image/*,video/*";
  lab.append(" Add a photo or video (optional)", inp);
  pr.max = 1; pr.hidden = true; rm.type = "button"; rm.textContent = "Remove"; rm.hidden = true;
  st.setAttribute("role", "status");
  box.append(lab, pr, st, rm);
  document.querySelector('label[for="snd"]').before(box);

  var pv = document.createElement("div"), rv = document.createElement("div");
  pv.className = rv.className = "gm hidden";
  $("pvBody").before(pv);
  $("t1").parentNode.before(rv);

  function say(t) { st.textContent = t || ""; }

  function fill(c, kind, src, poster) {
    c.replaceChildren();
    if (!kind) { c.classList.add("hidden"); return; }
    var m = document.createElement(kind === "v" ? "video" : "img");
    m.src = src;
    if (kind === "v") { m.controls = true; m.setAttribute("playsinline", ""); m.preload = "metadata"; if (poster) m.poster = poster; }
    else { m.alt = "Photo in this gift"; }
    c.append(m);
    c.classList.remove("hidden");
  }

  function reset() {
    media = ""; inp.value = ""; rm.hidden = true; pr.hidden = true; say("");
    if (localURL) { URL.revokeObjectURL(localURL); localURL = ""; }
    fill(pv, "");
  }

  function shrink(file) {
    return createImageBitmap(file, { imageOrientation: "from-image" })
      .catch(function () { return createImageBitmap(file); })
      .then(function (bm) {
        var k = Math.min(1, MAX_SIDE / Math.max(bm.width, bm.height)), c = document.createElement("canvas"), x;
        c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
        x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(bm, 0, 0, c.width, c.height);
        return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.85); });
      })
      .catch(function () { throw new Error("Couldn't read that photo. Try a JPG or PNG."); });
  }

  function seconds(file) {
    return new Promise(function (res, rej) {
      var v = document.createElement("video"), u = URL.createObjectURL(file);
      v.preload = "metadata";
      v.onloadedmetadata = function () { URL.revokeObjectURL(u); res(v.duration); };
      v.onerror = function () { URL.revokeObjectURL(u); rej(new Error("Couldn't read that video. Try an MP4.")); };
      v.src = u;
    });
  }

  function up(file) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest(), f = new FormData();
      f.append("file", file); f.append("upload_preset", UPLOAD_PRESET);
      x.open("POST", "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/auto/upload");
      x.upload.onprogress = function (e) { if (e.lengthComputable) pr.value = e.loaded / e.total; };
      x.onload = function () {
        try {
          var j = JSON.parse(x.responseText);
          if (x.status < 300 && j.secure_url) res(j); else rej(new Error((j.error && j.error.message) || "Upload failed."));
        } catch (e) { rej(new Error("Upload failed.")); }
      };
      x.onerror = function () { rej(new Error("No connection. Please try again.")); };
      x.send(f);
    });
  }

  inp.onchange = function () {
    var f = inp.files[0];
    reset();
    if (!f) return;
    var isV = f.type.indexOf("video/") === 0;
    if (!isV && f.type.indexOf("image/") !== 0) { say("Please choose a photo or a video."); return; }
    busy = true; say("Preparing…");
    fill(pv, isV ? "v" : "i", (localURL = URL.createObjectURL(f)));
    
   var isGif = f.type.toLowerCase() === "image/gif";
   
   var prep = isV
     ? (f.size > MAX_VIDEO_MB * 1048576
         ? Promise.reject(new Error(
             "That video is over " + MAX_VIDEO_MB + " MB. Try a shorter clip."
           ))
         : seconds(f).then(function (d) {
             if (d > MAX_SECONDS) {
               throw new Error(
                 "Please keep videos under " + MAX_SECONDS + " seconds."
               );
             }
             return f;
           }))
     : (isGif ? Promise.resolve(f) : shrink(f));

    prep.then(function (file) { say("Uploading…"); pr.value = 0; pr.hidden = false; return up(file); })
      .then(function (j) {
        var m = String(j.secure_url).match(/\/(image|video)\/upload\/(.+)$/);
        if (!m) throw new Error("Upload failed.");
        media = (m[1] === "video" ? "v/" : "i/") + m[2];
        say("Added "); rm.hidden = false;
      })
      .catch(function (e) { reset(); say(e && e.message ? e.message : "Couldn't add that file."); })
      .then(function () { busy = false; pr.hidden = true; });
  };
  rm.onclick = reset;

  $("form").addEventListener("submit", function (e) {
    if (!busy) return;
    e.preventDefault(); e.stopImmediatePropagation();
    $("err").textContent = "Hang on, your photo or video is still uploading.";
  }, true);

  window.GiftMedia = {
    get: function () { return media; },
    clean: function (p) { return typeof p === "string" && SAFE.test(p) && p.indexOf("..") < 0 ? p : ""; },
    show: function (p) {
      p = window.GiftMedia.clean(p);
      if (!p) { fill(rv, ""); return; }
      var k = p.charAt(0), url = BASE + (k === "v" ? "video" : "image") + "/upload/" + p.slice(2);
      fill(rv, k, url, k === "v" ? url.replace(/\.[^.\/]+$/, ".jpg") : "");
    }
  };
})();

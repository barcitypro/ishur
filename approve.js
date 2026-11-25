// Customer page for remote approval. Opened from a personal link; no account, no access to anything but this one call.
if (window.top !== window.self) { document.documentElement.hidden = true; throw new Error("framed"); }
(function () {
  "use strict";
  var FN_URL = "https://kvdhdxcbxvmjnaezbtwx.supabase.co/functions/v1/remote-approval";
  var KEY = "sb_publishable_7s4w3CA_cjgQsPkvkPAN6w_cFbs45Hs";   // public by design; the secret is the token in the link

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, props) {
    var el = document.createElement(tag), i, k;
    if (props) for (k in props) {
      if (k === "text") el.textContent = props[k];
      else if (k === "class") el.className = props[k];
      else el.setAttribute(k, props[k]);
    }
    for (i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function fmtDate(iso) { return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : ""; }
  function fmtDT(iso) { if (!iso) return ""; var d = new Date(iso); return d.toLocaleDateString("he-IL") + " בשעה " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }); }
  function show(id) { ["aLoading", "aMsg", "aMain"].forEach(function (s) { $(s).hidden = s !== id; }); }
  function message(title, text) { $("aMsgTitle").textContent = title; $("aMsgText").textContent = text || ""; show("aMsg"); }
  function err(text) { var e = $("aErr"); e.textContent = text || ""; e.hidden = !text; }

  var STATES = {
    not_found: ["הקישור לא תקין", "בדקו שהקישור הועתק במלואו, או בקשו קישור חדש ממחלקת הבדק."],
    expired: ["תוקף הקישור פג", "קישור לאישור תקף לשעה אחת. אפשר לבקש קישור חדש ממחלקת הבדק."],
    revoked: ["הקישור בוטל", "ייתכן שנשלח אליכם קישור חדש יותר. אם לא, פנו למחלקת הבדק."],
    signed_elsewhere: ["התיקונים כבר אושרו", "הקריאה הזאת כבר נחתמה. אין צורך בפעולה נוספת."]
  };
  function signedMsg(name, at) { message("התיקונים כבר אושרו", "נחתם על ידי " + (name || "הלקוח") + (at ? " בתאריך " + fmtDT(at) : "") + ". אין צורך בפעולה נוספת."); }

  function call(body) {
    return fetch(FN_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, status: res.status, body: j }; }); });
  }

  // ---------- signature pad: dark ink on white ----------
  function makePad(canvas) {
    var ctx = canvas.getContext("2d"), dirty = false, drawing = false;
    function reset() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth || 560, hh = canvas.clientHeight || 160;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hh);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
      dirty = false;
    }
    function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      var p = pos(e); drawing = true; dirty = true;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 0.1, p[1] + 0.1); ctx.stroke();
    });
    canvas.addEventListener("pointermove", function (e) { if (!drawing) return; var p = pos(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { canvas.addEventListener(n, function () { drawing = false; }); });
    return { reset: reset, isDirty: function () { return dirty; }, data: function () { return canvas.toDataURL("image/png"); } };
  }
  var mainPad = makePad($("aPad")), itemPads = [];   // itemPads: one per repair that is still unsigned
  $("aClear").addEventListener("click", mainPad.reset);

  // ---------- the call ----------
  function kv(label, value) { return h("div", { class: "rkv" }, h("span", { class: "rk", text: label }), h("span", { class: "rv", text: value || "—" })); }
  function strip(title, list) {
    if (!list || !list.length) return null;
    var thumbs = h("div", { class: "thumbs" });
    list.forEach(function (u) {
      if (!/^https:\/\/kvdhdxcbxvmjnaezbtwx\.supabase\.co\//.test(u)) return;
      thumbs.appendChild(h("a", { class: "thumb", href: u, target: "_blank", rel: "noopener" }, h("img", { src: u, alt: "תמונה", loading: "lazy" })));
    });
    return h("div", { class: "photos" }, h("div", { class: "title", text: title }), thumbs);
  }
  function render(c, expires) {
    $("aHello").textContent = (c.buyer ? "שלום " + c.buyer + ", " : "שלום, ") + "להלן התיקונים שבוצעו בדירה. אחרי המעבר עליהם אפשר לאשר ולחתום בתחתית הדף.";
    var g = $("aCall"); g.textContent = "";
    g.appendChild(kv("פרויקט", c.project)); g.appendChild(kv("בניין ודירה", c.apartment));
    g.appendChild(kv("שם הרוכש", c.buyer)); g.appendChild(kv("תאריך פתיחת הקריאה", fmtDate(c.opened_on)));
    var is = $("aIssue"); is.textContent = "";
    is.appendChild(h("div", { class: "rk", text: "תיאור הקריאה" })); is.appendChild(h("p", { class: "rtext", text: c.issue || "—" }));
    var gb = strip("תמונות כלליות: לפני", c.photos_before), ga = strip("תמונות כלליות: אחרי", c.photos_after);
    if (gb) is.appendChild(gb); if (ga) is.appendChild(ga);
    var box = $("aItems"); box.textContent = ""; itemPads = [];
    (c.items || []).forEach(function (it, i) {
      var sig;
      if (it.signed) sig = h("div", { class: "stamp", text: "תיקון זה כבר נחתם." });
      else {
        var cv = h("canvas", { class: "sigpad small", "aria-label": "משטח חתימה לתיקון " + (i + 1) }), clear = h("button", { class: "btn small", type: "button", text: "ניקוי החתימה" });
        var pad = makePad(cv); clear.addEventListener("click", pad.reset);
        itemPads.push({ id: it.id, pad: pad });
        sig = h("div", { class: "sig" }, h("div", { class: "title", text: "חתימה על תיקון זה" }), cv, clear);
      }
      box.appendChild(h("div", { class: "item" },
        h("div", { class: "ihead" }, h("strong", { text: "תיקון " + (i + 1) + (it.title ? ": " + it.title : "") }), it.signed ? h("span", { class: "pill done", text: "נחתם" }) : null),
        h("div", null, h("div", { class: "rk", text: "מה תוקן" }), h("p", { class: "rtext", text: it.fix_desc || "טרם פורט" })),
        it.fix_date ? h("div", { class: "rgrid" }, kv("תאריך התיקון", fmtDate(it.fix_date))) : null,
        strip("תמונות לפני התיקון", it.photos_before), strip("תמונות אחרי התיקון", it.photos_after), sig));
    });
    if (!(c.items || []).length) box.appendChild(h("div", { class: "empty" }, h("strong", { text: "לא פורטו תיקונים בקריאה זו" })));
    $("aName").value = c.buyer || "";
    $("aExp").textContent = expires ? "הקישור בתוקף עד " + fmtDT(expires) + ". מועד החתימה נרשם אוטומטית." : "";
    show("aMain");
    mainPad.reset(); itemPads.forEach(function (p) { p.pad.reset(); });   // after the page is visible, so each pad can measure itself
  }

  var token = location.hash.replace(/^#/, "");
  var demo = (location.hostname === "localhost" || location.hostname === "127.0.0.1") && location.search.indexOf("demo") !== -1;

  $("aForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = $("aName").value.trim();
    if (!name) return err("חסר שם מלא.");
    var signedItems = itemPads.filter(function (p) { return p.pad.isDirty(); }), general = mainPad.isDirty();
    if (!general && !signedItems.length) return err("חסרה חתימה. חתמו ליד התיקונים שבוצעו, או חתימה כללית בתחתית הדף.");
    if (!$("aAgree").checked) return err("כדי לאשר צריך לסמן את תיבת האישור.");
    err(""); $("aSend").disabled = true; $("aSend").textContent = "שולח…";
    var what = [signedItems.length ? (signedItems.length === 1 ? "חתימה על תיקון אחד" : "חתימות על " + signedItems.length + " תיקונים") : "", general ? "חתימה כללית" : ""].filter(Boolean).join(" ו");
    var done = function (n, at) { message("תודה, האישור התקבל", "התקבלה " + what + ". נחתם על ידי " + n + " בתאריך " + fmtDT(at) + ". אפשר לסגור את הדף."); };
    if (demo) return done(name, new Date().toISOString());
    call({ action: "sign", token: token, name: name, signature: general ? mainPad.data() : "", items: signedItems.map(function (p) { return { id: p.id, signature: p.pad.data() }; }) }).then(function (r) {
      if (r.ok) return done(r.body.signed_name || name, r.body.signed_at);
      var e = r.body.error;
      if (e === "signed") return signedMsg("", "");
      if (STATES[e]) return message(STATES[e][0], STATES[e][1]);
      if (e === "changed") return message("פרטי הקריאה התעדכנו", "רעננו את הדף כדי לראות את הפרטים המעודכנים, ואז חתמו שוב.");
      throw new Error(e);
    }).catch(function () {
      err("השליחה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב.");
      $("aSend").disabled = false; $("aSend").textContent = "אישור וחתימה";
    });
  });

  if (demo) {
    return render({ project: "פרויקט לדוגמה", apartment: "בניין 2, דירה 14", buyer: "ישראל ישראלי", opened_on: "2026-11-10", issue: "כמה ליקויים שדווחו אחרי הכניסה לדירה",
      photos_before: [], photos_after: [],
      items: [{ id: "d1", title: "נזילה מתחת לכיור במטבח", fix_desc: "הוחלף סיפון ואטם", fix_date: "2026-11-14", signed: true, photos_before: [], photos_after: [] },
              { id: "d2", title: "סדק בטיח בחדר השינה", fix_desc: "תוקן הסדק ונצבע הקיר", fix_date: "2026-11-16", signed: false, photos_before: [], photos_after: [] }] }, new Date(Date.now() + 36e5).toISOString());
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return message(STATES.not_found[0], STATES.not_found[1]);
  call({ action: "view", token: token }).then(function (r) {
    if (!r.ok) return message(STATES.not_found[0], r.status === 404 ? STATES.not_found[1] : "לא ניתן לטעון את הדף כרגע. נסו שוב בעוד כמה דקות.");
    var b = r.body;
    if (b.state === "open") return render(b.call, b.expires_at);
    if (b.state === "signed") return signedMsg(b.signed_name, b.signed_at);
    var s = STATES[b.state] || STATES.not_found;
    message(s[0], s[1]);
  }).catch(function () { message("לא ניתן לטעון את הדף", "בדקו את החיבור לאינטרנט ורעננו את הדף."); });
})();

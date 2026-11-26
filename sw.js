/* Starmark PSN V2.0.4 (+ ไม่เด้งซ้ำบนเครื่องที่เพิ่งกดงานนั้นเอง ขณะเปิดแอปอยู่) · V2.0.2 (+ บอกหน้าแอปที่เปิดอยู่ให้ดึงข้อมูลใหม่ทันทีเมื่อมีแจ้งเตือน) · V1.9.3 (เดิม Starmark SPN V1.0 · ชื่อแจ้งเตือนสำรอง = Starmark PSN) — ตัวรับแจ้งเตือนของแอปบนมือถือ (Service Worker) · ชุดเดียวกับ Contractor Nexus V7.16 (เปิดหน้าในแอปนี้ตามลิงก์ของแจ้งเตือน)
   ไม่เก็บไฟล์ไว้ในเครื่อง: เปิดแอปแล้วโหลดเวอร์ชันล่าสุดจากลิงก์เดิมเสมอ (อัป index.html ใหม่ได้ทันที)
   V7.16: แจ้งเตือนมีเสียงมาตรฐานของเครื่อง (ปิดเสียงได้ทีละเครื่องในแอป — ค่าเก็บไว้ใน Cache Storage ชื่อ cn-cfg) · เลขบนไอคอนแอป = ตัวเลขที่ Server ส่งมา (งานที่รอท่านทำ) */
function soundOn() {
  try {
    return caches.open('cn-cfg').then(function (c) { return c.match(self.registration.scope + 'cn-sound'); })
      .then(function (r) { return r ? r.text() : '1'; }).then(function (t) { return t !== '0'; }).catch(function () { return true; });
  } catch (_e) { return Promise.resolve(true); }
}
/* PSN V2.0.4: แจ้งเตือนของงานที่เครื่องนี้เพิ่งกดเอง (หน้าแอปจด cn-self ไว้ 2 นาที) + หน้าแอปเปิดอยู่ = ไม่เด้ง (หน้าแอปดึงข้อมูลใหม่เอง)
   Safari (iPhone / Mac) บังคับให้แสดงทุกครั้ง = แสดงแบบไม่มีเสียงแทน · อ่านไม่ได้ / ไม่ตรง = เด้งตามเดิม */
function selfHit(d) {
  var m = /^#\/prd\/o\/(.+)$/.exec(String((d && d.url) || '')); if (!m) return Promise.resolve(false);
  var raw = m[1], dec = raw; try { dec = decodeURIComponent(raw); } catch (_e) {}
  try {
    return caches.open('cn-cfg').then(function (c) { return c.match(self.registration.scope + 'cn-self'); })
      .then(function (r) { return r ? r.json() : []; }).then(function (L) {
        var now = Date.now();
        return Array.isArray(L) && L.some(function (x) { return x && (x.o === raw || x.o === dec) && now - (+x.t || 0) < 120000; });
      }).catch(function () { return false; });
  } catch (_e) { return Promise.resolve(false); }
}
function appOpen() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    return list.some(function (c) { return c.url.indexOf(self.registration.scope) === 0 && (c.focused || c.visibilityState === 'visible'); });
  }).catch(function () { return false; });
}
function strictPush() { var u = (self.navigator && self.navigator.userAgent) || ''; return /iPhone|iPad|iPod/.test(u) || (/Safari\//.test(u) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox/.test(u)); }
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_e) { d = { title: 'Starmark PSN', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(Promise.all([soundOn(), selfHit(d), appOpen()]).then(function (z) {
    var snd = z[0], mine = z[1] && z[2], skip = mine && !strictPush();   /* PSN V2.0.4 */
    var jobs = [skip ? null : self.registration.showNotification(d.title || 'Starmark PSN', {
      body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag && !mine, silent: !snd || mine,
      icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', lang: 'th', data: { url: d.url || '#/' }
    })];
    var nav = self.navigator;
    if (typeof d.badge === 'number' && nav && nav.setAppBadge) jobs.push(d.badge > 0 ? nav.setAppBadge(d.badge) : nav.clearAppBadge());
    /* PSN V2.0.2 (ผู้ใช้ 26/11 11:36 “ให้มัน real time กดแล้วเด้งเลย”): บอกหน้าแอปที่เปิดอยู่ให้ดึงข้อมูลใหม่ทันที (ไม่รอรอบ 20 วิ) */
    jobs.push(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      list.forEach(function (c) { if (c.url.indexOf(self.registration.scope) === 0) { try { c.postMessage({ type: 'cn-push', tag: d.tag || '' }); } catch (_e) {} } });
    }));
    return Promise.all(jobs.map(function (p) { return Promise.resolve(p).catch(function () {}); }));
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var hash = (e.notification.data && e.notification.data.url) || '#/';
  var url = self.registration.scope + hash;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0) { c.postMessage({ type: 'cn-nav', hash: hash }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});

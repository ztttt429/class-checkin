self.addEventListener('push', event => {
  const tag = event.data?.json()?.tag || 'attendance';
  event.waitUntil(self.registration.showNotification('记得签到啦', {
    body: '课堂签到已开放，点这里进入签到页。',
    icon: 'checkin-mascot.png?v=2', tag: 'attendance-' + tag
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = self.registration.scope;
    const pages = await clients.matchAll({type:'window',includeUncontrolled:true});
    const page = pages.find(p => {
      const path = new URL(p.url).pathname;
      return path === new URL(url).pathname || path === new URL('index.html',url).pathname;
    });
    if (page) return page.focus();
    return clients.openWindow(url);
  })());
});

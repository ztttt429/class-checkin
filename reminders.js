(async function () {
  const button = document.getElementById('reminderButton');
  const note = document.getElementById('reminderNote');
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (/; wv\)/.test(navigator.userAgent)) return;
  button.hidden = false;
  function explain(message) { note.hidden = false; note.textContent = message; }
  button.disabled = true;
  try {
    if (ios && !(navigator.standalone || matchMedia('(display-mode: standalone)').matches)) {
      button.onclick = () => explain('请先用 Safari 添加到主屏幕，再从桌面打开并开启提醒。需要 iOS 16.4 或更高版本。');
      return;
    }
    if (!('serviceWorker' in navigator) || !window.PushManager || !window.Notification) {
      button.onclick = () => explain('当前浏览器不支持系统推送。安卓可使用带提醒功能的课堂签到 App。');
      return;
    }
    const config = await (await fetch('reminder-config.json',{cache:'no-store'})).json();
    if (!config.endpoint) {
      button.onclick = () => explain('网页推送服务尚未启用。');
      return;
    }
    const endpoint = new URL(config.endpoint);
    async function request(path,sub) {
      const options = sub ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub)} : {};
      const r = await fetch(new URL(path,endpoint),options);
      if (!r.ok) throw Error();
      return r.json();
    }
    await navigator.serviceWorker.register('reminder-sw.js');
    const reg = await navigator.serviceWorker.ready;
    const {key} = await request('/key');
    const appKey = Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
    let sub = await reg.pushManager.getSubscription();
    if (sub) await request('/subscribe',sub);
    const label = () => button.textContent = sub ? '关闭签到提醒' : '开启签到提醒';
    label();
    button.onclick = async () => {
      button.disabled = true;
      try {
        if (sub) {
          await request('/unsubscribe',sub);
          await sub.unsubscribe();
          sub = null;
          explain('已关闭签到提醒。');
        } else {
          if (await Notification.requestPermission() !== 'granted') {
            explain('请在系统设置中允许通知后再试。'); return;
          }
          const next = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:appKey});
          await request('/subscribe',next); sub=next;
          explain('已开启，每节课开放签到时提醒。');
        }
      } catch { explain('提醒设置未确认，请重试。'); }
      finally { label(); button.disabled = false; }
    };
  } catch { button.onclick = () => explain('推送服务暂时无法连接，请稍后重新打开页面。'); }
  finally { button.disabled = false; }
})();

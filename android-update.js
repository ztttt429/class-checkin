(() => {
  const agent = navigator.userAgent;
  if (!/Android/i.test(agent)) return;
  const nativeVersion = agent.match(/\bClassCheckin\/(\d+)\b/)?.[1];
  const legacyApp = /; wv\)/.test(agent) && new URLSearchParams(location.search).has('app_open');
  if (!nativeVersion && !legacyApp) return;

  const dialog = document.getElementById('android-update-dialog');
  const link = document.getElementById('android-update-now');
  const fallback = document.getElementById('android-update-fallback');
  const address = document.getElementById('android-update-address');
  let lastCheck = 0;
  let checking = false;
  let shownVersion;

  if (!nativeVersion) {
    link.addEventListener('click', event => {
      event.preventDefault();
      fallback.hidden = address.hidden = false;
      address.value = link.href;
      address.focus();
      address.select();
      navigator.clipboard?.writeText(link.href).then(() => {
        fallback.textContent = '下载地址已复制，请在手机浏览器打开，再按系统提示安装。';
      }).catch(() => {});
    });
  }

  async function checkVersion() {
    const now = Date.now();
    if (document.hidden || checking || now - lastCheck < 10000) return;
    checking = true;
    lastCheck = now;
    try {
      const response = await fetch('./android-version.json?check=' + now, {cache:'no-store'});
      if (!response.ok) return;
      const {minimumVersionCode, latestVersionCode, versionName, downloadUrl} = await response.json();
      if (!Number.isSafeInteger(minimumVersionCode) || !Number.isSafeInteger(latestVersionCode) ||
          minimumVersionCode <= 0 || minimumVersionCode > latestVersionCode ||
          Number(nativeVersion || 0) >= minimumVersionCode || shownVersion === latestVersionCode ||
          typeof versionName !== 'string' ||
          !/^https:\/\/github\.com\/ztttt429\/class-checkin\/releases\/download\/android-v[0-9.]+\/class-checkin\.apk$/.test(downloadUrl)) return;

      link.href = downloadUrl;
      document.getElementById('android-update-note').textContent = '请下载 ' + versionName + ' 版，并按安卓系统提示覆盖安装。';
      if (!dialog.open) dialog.showModal();
      shownVersion = latestVersionCode;
    } catch {
      // Keep the current page usable if the update check fails.
    } finally {
      checking = false;
    }
  }

  window.addEventListener('pageshow', checkVersion);
  document.addEventListener('visibilitychange', checkVersion);
  setInterval(checkVersion, 60000);
  checkVersion();
})();

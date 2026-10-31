const $ = (id) => document.getElementById(id);

let settings = Object.assign(
  { threads: 150, latency: 220, v4: 5, v6: 200, format: 'txt' },
  JSON.parse(localStorage.getItem('cfs_set') || '{}'),
);
let runAC = null,
  aliveList = [],
  results = [],
  isRunning = false,
  progCur = 0,
  progLast = 0;

const log = (msg) => {
  const d = document.createElement('div');
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  const b = $('logArea');
  b.appendChild(d);
  b.scrollTop = b.scrollHeight;
};
const setPhase = (t) => ($('phaseText').textContent = t);
function setButtons(running) {
  if (!running) setRate(0);
  isRunning = running;
  $('btnV4').disabled = running;
  $('btnV6').disabled = running;
  $('btnStop').disabled = !running;
  $('btnRegion').disabled = running || !aliveList.length;
  $('btnFull').disabled = running || !aliveList.length;
  $('btnExport').disabled = !results.length;
}

function setRate(v) {
  $('rateNum').textContent = Math.round(v);
}

async function ssePost(url, body, h) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: runAC.signal,
  });
  const reader = resp.body.getReader(),
    dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let ev = 'message',
        data = '';
      chunk.split('\n').forEach((l) => {
        if (l.startsWith('event:')) ev = l.slice(6);
        else if (l.startsWith('data:')) data += l.slice(5);
      });
      if (data && h[ev]) h[ev](JSON.parse(data));
    }
  }
}

// ---------- 扫描 ----------
async function startScan(family) {
  aliveList = [];
  results = [];
  $('speedBody').innerHTML = '';
  $('pingBody').innerHTML = '';
  $('logArea').innerHTML = '';
  $('regionSel').innerHTML = '<option value="">(扫描后获取)</option>';
  progCur = 0;
  $('progressBar').style.width = '0%';
  $('aliveNum').textContent = '0';
  runAC = new AbortController();
  setButtons(true);
  const sample = family === 'IPv4' ? settings.v4 : settings.v6;
  const port = +$('portSel').value;
  $('progressNum').textContent = `正在生成...`;
  setPhase(`${family} 正在生成 IP 地址...`);
  log(`开始 ${family} 扫描 (采样率: ${sample})`);
  try {
    await ssePost(
      '/api/scan',
      { family, threads: settings.threads, latency: settings.latency, count: sample, port },
      {
        log: (d) => log(d.msg),
        ping: (d) => {
          $('aliveNum').textContent = +$('aliveNum').textContent + 1;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${d.ip}</td><td class="text-green"><b>${d.rtt} ms</b> (${d.colo})</td>`;
          const b = $('pingBody');
          b.prepend(tr);
          if (b.childElementCount > 3000) b.removeChild(b.lastChild);
        },
        progress: (d) => {
          progCur = d.current;
          $('progressNum').textContent = `${d.current}/${d.total}`;
          $('progressBar').style.width = (d.current / d.total) * 100 + '%';
          if (d.speed !== undefined) setRate(d.speed);
        },
        alive: (d) => {
          aliveList = d.ips;
        },
      },
    );
    if (aliveList.length) {
      // 直接用扫描时已识别的地区构建下拉框（含数量）
      const groups = {};
      aliveList.forEach((i) => {
        if (!groups[i.colo]) groups[i.colo] = { name: i.name, n: 0 };
        groups[i.colo].n++;
      });
      const codes = Object.keys(groups).sort((a, b) => groups[b].n - groups[a].n);
      $('regionSel').innerHTML =
        '<option value="">请选择地区</option>' +
        codes.map((c) => `<option value="${c}">${c} - ${groups[c].name} (${groups[c].n} 个IP)</option>`).join('');
      log(
        `地区分组完成, 共 ${codes.length} 个地区: ${codes
          .slice(0, 20)
          .map((c) => `${c}(${groups[c].n})`)
          .join(', ')}${codes.length > 20 ? ' ...' : ''}`,
      );
      setPhase(`就绪: ${aliveList.length} 个可用 IP / ${codes.length} 个地区`);
    } else setPhase('扫描完成: 无可用 IP');
  } catch (e) {
    if (e.name !== 'AbortError') log('错误: ' + e.message);
    setPhase('已停止');
  }
  setButtons(false);
}

// ---------- 测速 ----------
async function startSpeedTest(mode) {
  const code = $('regionSel').value;
  const n = Math.max(1, +$('speedCount').value || 10);
  let targets;
  if (mode === 'region') {
    if (!code) return alert('请先在下拉框中选择地区');
    targets = aliveList.filter((i) => i.colo === code).slice(0, n);
    if (!targets.length) return alert(`地区 ${code} 没有可用 IP`);
    log(`地区测速: ${code} 取延迟最低 ${targets.length} 个 IP`);
  } else {
    targets = aliveList.slice(0, n);
    log(`完全测速: 全局延迟最低 ${targets.length} 个 IP`);
  }
  runAC = new AbortController();
  setButtons(true);
  progCur = progLast = 0;
  results = [];
  $('speedBody').innerHTML = '';
  setPhase('测速中...');
  try {
    const concurrent = $('chkConcurrent').checked;
    log(`测速模式: ${concurrent ? '并发 (8线程)' : '逐条 (一个一个测)'}`);
    await ssePost(
      '/api/speedtest',
      { targets, port: +$('portSel').value, seconds: 3, concurrent },
      {
        log: (d) => log(d.msg),
        progress: (d) => {
          progCur = d.current;
          $('progressNum').textContent = `${d.current}/${d.total}`;
          $('progressBar').style.width = (d.current / d.total) * 100 + '%';
        },
        result: (d) => {
          results.push(d);
          renderSpeed();
          log(`🏁 ${d.ip}#${d.colo} ${d.name} ${d.rtt}ms ${d.speed}MB/s`);
        },
      },
    );
    setPhase('测速完成');
  } catch (e) {
    if (e.name !== 'AbortError') log('错误: ' + e.message);
    setPhase('已停止');
  }
  setButtons(false);
}
function renderSpeed() {
  const port = $('portSel').value;
  $('speedBody').innerHTML = [...results]
    .sort((a, b) => b.speed - a.speed)
    .map(
      (r) =>
        `<tr><td>${r.ip}</td><td>${port}</td><td>${r.colo} ${r.name}</td><td>${r.rtt}ms</td><td><b style="color:var(--primary)">${r.speed}</b></td></tr>`,
    )
    .join('');
  $('btnExport').disabled = false;
}

// ---------- 导出 ----------
const wrapHost = (h) => (h.includes(':') ? `[${h}]` : h);
function exportResults() {
  if (!results.length) return alert('暂无测速结果');
  const port = $('portSel').value;
  const sorted = [...results].sort((a, b) => b.speed - a.speed);
  let content, mime, ext;
  if (settings.format === 'csv') {
    content =
      'IP地址,端口,地区码,地区,延迟(ms),速度(MB/s)\n' +
      sorted.map((r) => `${r.ip},${port},${r.colo},${r.name},${r.rtt},${r.speed}`).join('\n');
    mime = 'text/csv';
    ext = 'csv';
  } else {
    content = sorted
      .map((r) => `${wrapHost(r.ip)}:${port}#${r.colo} ${r.name} (${r.rtt}ms  ${r.speed}MB/s)`)
      .join('\n');
    mime = 'text/plain';
    ext = 'txt';
  }
  const t = new Date(),
    p = (x) => String(x).padStart(2, '0');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = `CloudFlareScan_${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}_${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}.${ext}`;
  a.click();
  log(`已导出 ${sorted.length} 条结果 (${ext.toUpperCase()})`);
}

// ---------- 节点批量生成 ----------
const isDomain = (h) => !/^\d{1,3}(\.\d{1,3}){3}$/.test(h) && !h.includes(':');
const b64EncodeUtf8 = (s) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''));
function b64DecodeUtf8(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function parseAddrLine(raw) {
  let line = raw.trim();
  if (!line || line.startsWith('#')) return null;
  let name = '';
  const hi = line.indexOf('#');
  if (hi >= 0) {
    name = line.slice(hi + 1).trim();
    line = line.slice(0, hi).trim();
  }
  let host = null,
    port = null;
  const m = line.match(/^\[(.+?)\](?::(\d+))?$/);
  if (m) {
    host = m[1];
    port = m[2] ? +m[2] : null;
  } else if (line.includes(':')) {
    const parts = line.split(':');
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      host = parts[0];
      port = +parts[1];
    } else if (/^[0-9a-fA-F:]+$/.test(line))
      host = line; // 裸 IPv6（无端口）
    else return null;
  } else host = line;
  if (!host || (port !== null && (port < 1 || port > 65535))) return null;
  return { host, port, name };
}
function parseNode(line) {
  line = line.trim();
  if (line.startsWith('vless://')) {
    try {
      const u = new URL(line);
      return {
        kind: 'vless',
        uuid: decodeURIComponent(u.username),
        host: u.hostname.replace(/^\[|\]$/g, ''),
        port: u.port ? +u.port : 443,
        params: [...u.searchParams.entries()],
        name: decodeURIComponent(u.hash.slice(1)),
      };
    } catch (e) {
      return null;
    }
  }
  if (line.startsWith('vmess://')) {
    try {
      return { kind: 'vmess', j: JSON.parse(b64DecodeUtf8(line.slice(8))) };
    } catch (e) {
      return null;
    }
  }
  return null;
}
function nodeGet(n) {
  if (n.kind === 'vless') {
    const g = (k) => (n.params.find((p) => p[0] === k) || [])[1] || '';
    return { host: n.host, port: n.port, sni: g('sni'), hostH: g('host'), name: n.name };
  }
  return { host: n.j.add, port: +n.j.port, sni: n.j.sni || '', hostH: n.j.host || '', name: n.j.ps || '' };
}
function nodeSet(n, p) {
  if (n.kind === 'vless') {
    if (p.host !== undefined) n.host = p.host;
    if (p.port !== undefined) n.port = p.port;
    if (p.name !== undefined) n.name = p.name;
    const setP = (k, v) => {
      const i = n.params.findIndex((x) => x[0] === k);
      if (v) {
        if (i >= 0) n.params[i][1] = v;
        else n.params.push([k, v]);
      }
    };
    if (p.sni !== undefined) setP('sni', p.sni);
    if (p.hostH !== undefined) setP('host', p.hostH);
  } else {
    if (p.host !== undefined) n.j.add = p.host;
    if (p.port !== undefined) n.j.port = String(p.port);
    if (p.name !== undefined) n.j.ps = p.name;
    if (p.sni !== undefined) n.j.sni = p.sni;
    if (p.hostH !== undefined) n.j.host = p.hostH;
  }
}
function nodeBuild(n, rawName) {
  if (n.kind === 'vless') {
    const q = n.params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return `vless://${encodeURIComponent(n.uuid)}@${wrapHost(n.host)}:${n.port}?${q}#${rawName ? n.name : encodeURIComponent(n.name)}`;
  }
  return 'vmess://' + b64EncodeUtf8(JSON.stringify(n.j));
}
function applySniRules(n, newHost, keep, force) {
  if (keep) return;
  const newDom = isDomain(newHost),
    oldDom = isDomain(nodeGet(n).host);
  if (!newDom || !oldDom || force) nodeSet(n, { sni: newHost, hostH: newHost });
}
async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

$('btnPreview').onclick = () => {
  const out = $('addrList')
    .value.split('\n')
    .map((l, i) => {
      if (!l.trim()) return null;
      const p = parseAddrLine(l);
      return p
        ? `✔ 行${i + 1}: ${p.host} | 端口 ${p.port ?? '(沿用原节点)'} | 名称 ${p.name || '(沿用原名称)'}`
        : `✖ 行${i + 1}: 格式无效: ${l.trim()}`;
    })
    .filter(Boolean);
  $('previewBox').textContent = out.join('\n') || '(无内容)';
  $('previewBox').classList.remove('hidden');
};
$('btnImportRes').onclick = () => {
  if (!results.length) return alert('暂无测速结果，请先扫描并测速');
  const port = $('portSel').value;
  $('addrList').value = [...results]
    .sort((a, b) => b.speed - a.speed)
    .map((r) => `${wrapHost(r.ip)}:${port}#${r.colo} ${r.name} ${r.speed}MB/s`)
    .join('\n');
  log(`已导入 ${results.length} 个优选IP到目标地址列表`);
};
$('btnGen').onclick = () => {
  const srcs = $('srcNodes').value.split('\n').map(parseNode).filter(Boolean);
  const addrs = $('addrList').value.split('\n').map(parseAddrLine).filter(Boolean);
  if (!srcs.length) return alert('请输入至少一个有效的 VLESS/VMess 节点');
  if (!addrs.length) return alert('请输入至少一个有效的目标地址');
  const keep = $('chkKeepSNI').checked,
    force = $('chkForceSNI').checked,
    raw = $('chkRawName').checked;
  const out = [];
  for (const a of addrs)
    for (const s of srcs) {
      const n = JSON.parse(JSON.stringify(s));
      const g = nodeGet(n);
      nodeSet(n, { host: a.host, port: a.port || g.port, name: a.name || g.name || a.host });
      applySniRules(n, a.host, keep, force);
      out.push(nodeBuild(n, raw));
    }
  $('outNodes').value = out.join('\n');
  $('genCount').textContent = out.length;
  log(`节点生成完成: ${srcs.length} 节点 × ${addrs.length} 地址 = ${out.length} 条`);
};
$('btnCopyUri').onclick = () => {
  if ($('outNodes').value) {
    copyText($('outNodes').value);
    log('已复制 URI 到剪贴板');
  }
};
$('btnCopyB64').onclick = () => {
  if ($('outNodes').value) {
    copyText(b64EncodeUtf8($('outNodes').value));
    log('已复制 Base64 到剪贴板');
  }
};
$('btnClearNodes').onclick = () => {
  $('srcNodes').value = '';
  $('addrList').value = '';
  $('outNodes').value = '';
  $('genCount').textContent = '0';
  $('previewBox').classList.add('hidden');
};

// ---------- 事件 ----------
$('btnV4').onclick = () => startScan('IPv4');
$('btnV6').onclick = () => startScan('IPv6');
$('btnStop').onclick = () => {
  if (runAC) runAC.abort();
  runAC = null;
  log('🛑 用户停止任务');
  setPhase('已停止');
  setButtons(false);
};
$('btnRegion').onclick = () => startSpeedTest('region');
$('btnFull').onclick = () => startSpeedTest('all');
$('btnExport').onclick = exportResults;
document.querySelectorAll('.tab-btn').forEach(
  (t) =>
    (t.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      $('tab-' + t.dataset.tab).classList.add('active');
    }),
);
const modal = $('modal');
$('btnSettings').onclick = () => {
  $('setThreads').value = settings.threads;
  $('setLatency').value = settings.latency;
  $('setV4').value = settings.v4;
  $('setV6').value = settings.v6;
  $('setFormat').value = settings.format;
  modal.classList.remove('hidden');
};
$('modalClose').onclick = $('btnCancel').onclick = () => modal.classList.add('hidden');
$('btnSave').onclick = () => {
  settings = {
    threads: Math.min(2000, Math.max(1, +$('setThreads').value || 150)),
    latency: Math.max(10, +$('setLatency').value || 220),
    v4: Math.min(5, Math.max(1, +$('setV4').value || 5)),
    v6: Math.max(1, +$('setV6').value || 200),
    format: $('setFormat').value,
  };
  localStorage.setItem('cfs_set', JSON.stringify(settings));
  modal.classList.add('hidden');
  log('设置已保存: ' + JSON.stringify(settings));
};
setButtons(false);

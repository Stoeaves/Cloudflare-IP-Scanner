const express = require('express');
const https = require('https');
const http = require('http');
const tls = require('tls');
const net = require('net');
const readline = require('readline');
const path = require('path');
const ipaddr = require('ipaddr.js');

const app = express();
const publicDir = path.join(__dirname, 'public');
const indexFile = path.join(publicDir, 'index.html');
app.use(express.json({ limit: '4mb' }));
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(indexFile);
});

// ============ CIDR 列表 ============
const CF_V4 = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/12',
  '172.64.0.0/17',
  '172.64.128.0/18',
  '172.64.192.0/19',
  '172.64.224.0/22',
  '172.64.229.0/24',
  '172.64.230.0/23',
  '172.64.232.0/21',
  '172.64.240.0/21',
  '172.64.248.0/21',
  '172.65.0.0/16',
  '172.66.0.0/16',
  '172.67.0.0/16',
  '131.0.72.0/22',
  '8.35.211.0/24',
  '188.164.248.0/24',
];
const CF_V6 = [
  '2400:cb00:2049::/48',
  '2400:cb00:f00e::/48',
  '2606:4700::/32',
  '2606:4700:10::/48',
  '2606:4700:130::/48',
  '2606:4700:3000::/48',
  '2606:4700:3001::/48',
  '2606:4700:3002::/48',
  '2606:4700:3003::/48',
  '2606:4700:3004::/48',
  '2606:4700:3005::/48',
  '2606:4700:3006::/48',
  '2606:4700:3007::/48',
  '2606:4700:3008::/48',
  '2606:4700:3009::/48',
  '2606:4700:3010::/48',
  '2606:4700:3011::/48',
  '2606:4700:3012::/48',
  '2606:4700:3013::/48',
  '2606:4700:3014::/48',
  '2606:4700:3015::/48',
  '2606:4700:3016::/48',
  '2606:4700:3017::/48',
  '2606:4700:3018::/48',
  '2606:4700:3019::/48',
  '2606:4700:3020::/48',
  '2606:4700:3021::/48',
  '2606:4700:3022::/48',
  '2606:4700:3023::/48',
  '2606:4700:3024::/48',
  '2606:4700:3025::/48',
  '2606:4700:3026::/48',
  '2606:4700:3027::/48',
  '2606:4700:3028::/48',
  '2606:4700:3029::/48',
  '2606:4700:3030::/48',
  '2606:4700:3031::/48',
  '2606:4700:3032::/48',
  '2606:4700:3033::/48',
  '2606:4700:3034::/48',
  '2606:4700:3035::/48',
  '2606:4700:3036::/48',
  '2606:4700:5a::/48',
  '2606:4700:52::/48',
  '2606:4700:57::/48',
  '2606:4700:a0::/48',
  '2606:4700:a1::/48',
  '2606:4700:a8::/48',
  '2606:4700:a9::/48',
  '2606:4700:a::/48',
  '2606:4700:b::/48',
  '2606:4700:c::/48',
  '2606:4700:d0::/48',
  '2606:4700:d1::/48',
  '2606:4700:d::/48',
  '2606:4700:e0::/48',
  '2606:4700:e1::/48',
  '2606:4700:e2::/48',
  '2606:4700:e3::/48',
  '2606:4700:e4::/48',
  '2606:4700:e5::/48',
  '2606:4700:e6::/48',
  '2606:4700:e7::/48',
  '2606:4700:e::/48',
  '2606:4700:f1::/48',
  '2606:4700:f2::/48',
  '2606:4700:f3::/48',
  '2606:4700:f4::/48',
  '2606:4700:f5::/48',
  '2606:4700:f::/48',
  '2803:f800:50::/48',
  '2803:f800:51::/48',
  '2a06:98c1:3100::/48',
  '2a06:98c1:3101::/48',
  '2a06:98c1:3102::/48',
  '2a06:98c1:3103::/48',
  '2a06:98c1:3104::/48',
  '2a06:98c1:3105::/48',
  '2a06:98c1:3106::/48',
  '2a06:98c1:3107::/48',
  '2a06:98c1:3108::/48',
  '2a06:98c1:3109::/48',
  '2a06:98c1:310a::/48',
  '2a06:98c1:310b::/48',
  '2a06:98c1:310c::/48',
  '2a06:98c1:310d::/48',
  '2a06:98c1:310e::/48',
  '2a06:98c1:310f::/48',
  '2a06:98c1:3120::/48',
  '2a06:98c1:3121::/48',
  '2a06:98c1:3122::/48',
  '2a06:98c1:3123::/48',
  '2a06:98c1:3200::/48',
  '2a06:98c1:50::/48',
  '2a06:98c1:51::/48',
  '2a06:98c1:54::/48',
  '2a06:98c1:58::/48',
];

// ============ IATA 中文映射 ============
const AIRPORT_CN = {
  HKG: '香港',
  TPE: '台北',
  KHH: '高雄',
  MFM: '澳门',
  NRT: '东京',
  HND: '东京',
  KIX: '大阪',
  NGO: '名古屋',
  FUK: '福冈',
  CTS: '札幌',
  OKA: '冲绳',
  ICN: '首尔',
  GMP: '首尔',
  PUS: '釜山',
  SIN: '新加坡',
  BKK: '曼谷',
  DMK: '曼谷',
  KUL: '吉隆坡',
  HKT: '普吉岛',
  MNL: '马尼拉',
  CEB: '宿务',
  HAN: '河内',
  SGN: '胡志明市',
  JKT: '雅加达',
  DPS: '巴厘岛',
  DEL: '德里',
  BOM: '孟买',
  MAA: '金奈',
  DXB: '迪拜',
  AUH: '阿布扎比',
  SJC: '圣何塞',
  LAX: '洛杉矶',
  SFO: '旧金山',
  SEA: '西雅图',
  PDX: '波特兰',
  LAS: '拉斯维加斯',
  PHX: '菲尼克斯',
  DEN: '丹佛',
  DFW: '达拉斯',
  IAH: '休斯顿',
  ORD: '芝加哥',
  MSP: '明尼阿波利斯',
  ATL: '亚特兰大',
  MIA: '迈阿密',
  MCO: '奥兰多',
  JFK: '纽约',
  EWR: '纽约',
  LGA: '纽约',
  BOS: '波士顿',
  PHL: '费城',
  IAD: '华盛顿',
  YYZ: '多伦多',
  YVR: '温哥华',
  YUL: '蒙特利尔',
  LHR: '伦敦',
  LGW: '伦敦',
  STN: '伦敦',
  CDG: '巴黎',
  ORY: '巴黎',
  FRA: '法兰克福',
  MUC: '慕尼黑',
  TXL: '柏林',
  AMS: '阿姆斯特丹',
  EIN: '埃因霍温',
  MAD: '马德里',
  BCN: '巴塞罗那',
  FCO: '罗马',
  MXP: '米兰',
  LIN: '米兰',
  ZRH: '苏黎世',
  GVA: '日内瓦',
  VIE: '维也纳',
  PRG: '布拉格',
  WAW: '华沙',
  KRK: '克拉科夫',
  HEL: '赫尔辛基',
  OSL: '奥斯陆',
  ARN: '斯德哥尔摩',
  CPH: '哥本哈根',
  SYD: '悉尼',
  MEL: '墨尔本',
  BNE: '布里斯班',
  PER: '珀斯',
  ADL: '阿德莱德',
  AKL: '奥克兰',
  WLG: '惠灵顿',
  GRU: '圣保罗',
  GIG: '里约热内卢',
  EZE: '布宜诺斯艾利斯',
  SCL: '圣地亚哥',
  LIM: '利马',
  BOG: '波哥大',
  JNB: '约翰内斯堡',
  CPT: '开普敦',
  CAI: '开罗',
};
const TLS_PORTS = new Set([443, 2053, 2083, 2087, 2096, 8443]);
const isV6 = (ip) => ip.includes(':');

// ============ IP 生成 ============
function randomIPFromCidr(cidrStr) {
  const [addr, prefix] = ipaddr.parseCIDR(cidrStr);
  const bytes = addr.toByteArray();
  const length = bytes.length;
  const mask = [];
  for (let i = 0; i < length; i++) {
    const bits = Math.max(0, Math.min(8, prefix - i * 8));
    mask.push(bits === 0 ? 0 : (~0 << (8 - bits)) & 0xff);
  }
  const result = [];
  let isNetwork = true;
  for (let i = 0; i < length; i++) {
    const hostByte = (bytes[i] & mask[i]) | (Math.floor(Math.random() * 256) & (~mask[i] & 0xff));
    result.push(hostByte);
    if (hostByte !== (bytes[i] & mask[i])) isNetwork = false;
  }
  if (isNetwork) {
    for (let i = length - 1; i >= 0; i--) {
      result[i] = (result[i] + 1) & 0xff;
      if (result[i] !== 0) break;
    }
  }
  return ipaddr.fromByteArray(result).toString();
}
function generateIPs(family, sample) {
  const out = [];
  if (family === 'IPv4') {
    for (const cidr of CF_V4) {
      const [addr, prefix] = ipaddr.parseCIDR(cidr);
      if (addr.kind() !== 'ipv4') continue;
      if (prefix >= 24) {
        for (let i = 0; i < sample; i++) out.push(randomIPFromCidr(cidr));
      } else {
        const baseBytes = addr.toByteArray();
        let baseNum = 0;
        for (const b of baseBytes) baseNum = baseNum * 256 + b;
        const subnetsCount = 1 << (24 - prefix);
        for (let j = 0; j < subnetsCount; j++) {
          const n = (baseNum + (j << 8)) >>> 0;
          const subnetIp = ipaddr
            .fromByteArray([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
            .toString();
          for (let i = 0; i < sample; i++) out.push(randomIPFromCidr(`${subnetIp}/24`));
        }
      }
    }
  } else {
    for (const cidr of CF_V6) for (let i = 0; i < sample; i++) out.push(randomIPFromCidr(cidr));
  }
  return out;
}

// ============ TCP Ping ============
function tcpPing(ip, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const sock = net.connect({ port, host: ip, family: isV6(ip) ? 6 : 4 });
    const to = setTimeout(() => {
      sock.destroy();
      resolve(0);
    }, timeoutMs);
    sock.once('connect', () => {
      clearTimeout(to);
      const rtt = Number(process.hrtime.bigint() - t0) / 1e6;
      sock.destroy();
      resolve(rtt);
    });
    sock.once('error', () => {
      clearTimeout(to);
      sock.destroy();
      resolve(0);
    });
  });
}

// ============ 地区识别（纯 Socket，避开 WAF） ============
function rawTrace(ip, port, useTls) {
  return new Promise((resolve) => {
    let body = '';
    const opts = { host: ip, port, servername: 'speed.cloudflare.com', rejectUnauthorized: false };
    const sock = useTls ? tls.connect(opts, onConnect) : net.connect(opts, onConnect);
    sock.setTimeout(5000);
    function onConnect() {
      sock.write(
        'GET /cdn-cgi/trace HTTP/1.1\r\nHost: speed.cloudflare.com\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n',
      );
    }
    sock.on('data', (c) => {
      if (body.length < 8192) body += c.toString('utf8');
    });
    sock.on('end', () => {
      const m = body.match(/colo=(\S+)/);
      const code = m ? m[1].trim().toUpperCase() : '';
      resolve(code && code !== 'UNKNOWN' ? code : '');
    });
    sock.on('error', () => resolve(''));
    sock.on('timeout', () => {
      sock.destroy();
      resolve('');
    });
  });
}
async function getIata(ip, port) {
  let r = await rawTrace(ip, port, true);
  if (!r) r = await rawTrace(ip, port, false);
  return r;
}

// ============ 测速 ============
function rawSpeedTest(ip, port, useTls, seconds, signal) {
  return new Promise((resolve) => {
    const opts = {
      hostname: ip,
      port: port,
      path: '/__down?bytes=50000000',
      timeout: 8000,
      headers: {
        Host: 'speed.cloudflare.com',
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*',
        Connection: 'close',
      },
    };
    if (useTls) opts.servername = 'speed.cloudflare.com';

    const WARMUP = 300; // 跳过 TCP 慢启动，只测稳态带宽
    let settled = false,
      counting = false,
      winBytes = 0,
      totalBytes = 0;
    let tResp = null,
      tWin = null,
      warmTimer = null,
      endTimer = null;
    const done = (v, err) => {
      if (settled) return;
      settled = true;
      clearTimeout(warmTimer);
      clearTimeout(endTimer);
      resolve({ speed: Math.round(v * 10) / 10, err: err || '' });
    };
    const req = (useTls ? https : http).get(opts, (res) => {
      if (res.statusCode !== 200) {
        res.destroy();
        return done(0, `HTTP ${res.statusCode}`);
      }
      tResp = process.hrtime.bigint();
      warmTimer = setTimeout(() => {
        counting = true;
        tWin = process.hrtime.bigint();
      }, WARMUP);
      endTimer = setTimeout(
        () => {
          const dt = Number(process.hrtime.bigint() - tWin) / 1e9;
          req.destroy();
          done(winBytes / 1048576 / Math.max(dt, 0.1));
        },
        WARMUP + seconds * 1000,
      );
      res.on('data', (c) => {
        totalBytes += c.length;
        if (counting) winBytes += c.length;
      });
      res.on('end', () => {
        // 50MB 提前下完 = 快线，用实际窗口数据算稳态速度
        const now = process.hrtime.bigint();
        if (counting) done(winBytes / 1048576 / Math.max(Number(now - tWin) / 1e9, 0.05));
        else done(totalBytes / 1048576 / Math.max(Number(now - tResp) / 1e9, 0.05));
      });
      res.on('error', (e) => {
        if (counting) done(winBytes / 1048576 / Math.max(Number(process.hrtime.bigint() - tWin) / 1e9, 0.1), e.code);
        else done(0, e.code);
      });
    });
    req.on('error', (e) => done(0, e.code || e.message));
    req.on('timeout', () => {
      req.destroy();
      done(0, 'TIMEOUT');
    });
    signal?.addEventListener(
      'abort',
      () => {
        req.destroy();
        done(0, 'ABORTED');
      },
      { once: true },
    );
  });
}

async function speedTest(ip, port, seconds, signal) {
  const useTlsFirst = TLS_PORTS.has(port);
  let lastErr = '';
  for (const useTls of [useTlsFirst, !useTlsFirst]) {
    if (signal?.aborted) return { speed: 0, err: 'ABORTED' };
    const r = await rawSpeedTest(ip, port, useTls, seconds, signal);
    if (r.speed > 0) return r;
    lastErr = r.err || lastErr;
  }
  return { speed: 0, err: lastErr || 'FAIL' };
}

async function pool(limit, items, worker, signal) {
  let i = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (i < items.length) {
      if (signal?.aborted) return;
      const item = items[i++];
      try {
        await worker(item);
      } catch (e) {}
    }
  });
  await Promise.all(runners);
}

function sse(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.socket.setNoDelay(true);
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  const send = (e, d) => {
    if (!ac.signal.aborted && !res.writableEnded) {
      try {
        res.write(`event:${e}\ndata:${JSON.stringify(d)}\n\n`);
      } catch (_) {}
    }
  };
  return { ac, send };
}

app.post('/api/scan', (req, res) => {
  const { family, threads, latency, count, port } = req.body;
  const { ac, send } = sse(req, res);
  (async () => {
    const sample = count || 5;
    const ips = generateIPs(family, sample);
    const t0 = Date.now();
    send('log', {
      msg: `已生成 ${ips.length} 个随机${family} IP (采样:${sample}) | 线程:${threads} 阈值:${latency}ms 端口:${port}`,
    });
    send('progress', { current: 0, total: ips.length, speed: 0 });
    let done = 0;
    const alive = [];
    await pool(
      threads,
      ips,
      async (ip) => {
        if (ac.signal.aborted) return;
        const rtt = await tcpPing(ip, port, 1000);
        if (rtt > 0 && rtt <= latency) {
          const iata = await getIata(ip, port);
          const item = {
            ip,
            rtt: Math.round(rtt),
            colo: iata || 'UNKNOWN',
            name: iata ? AIRPORT_CN[iata] || iata : '未知地区',
          };
          alive.push(item);
          send('ping', item);
        }
        done++;
        if (done % 25 === 0 || done === ips.length) {
          send('progress', { current: done, total: ips.length, speed: done / Math.max((Date.now() - t0) / 1000, 0.1) });
        }
      },
      ac.signal,
    );
    send('progress', { current: done, total: ips.length, speed: done / Math.max((Date.now() - t0) / 1000, 0.1) });
    if (!ac.signal.aborted) {
      alive.sort((a, b) => a.rtt - b.rtt);
      send('log', { msg: `扫描结束，共发现 ${alive.length} 个可用IP` });
      send('alive', { ips: alive });
      send('done', {});
    }
    res.end();
  })();
});

app.post('/api/speedtest', (req, res) => {
  const { targets, port, seconds, concurrent } = req.body;
  const limit = concurrent ? 8 : 1;
  const { ac, send } = sse(req, res);
  (async () => {
    let done = 0,
      ok = 0,
      fail = 0;
    send('log', { msg: `开始测速: ${targets.length} 个IP (${concurrent ? '并发8线程' : '逐条串行'}, 端口${port})` });
    send('progress', { current: 0, total: targets.length });
    await pool(
      limit,
      targets,
      async (t) => {
        if (ac.signal.aborted) return;
        const r = await speedTest(t.ip, port, seconds, ac.signal);
        done++;
        send('progress', { current: done, total: targets.length });
        if (r.speed > 0) {
          ok++;
          send('result', { ...t, speed: r.speed });
        } else {
          fail++;
          send('log', { msg: `✖ ${t.ip} 测速失败: ${r.err}` });
        }
      },
      ac.signal,
    );
    if (!ac.signal.aborted) {
      send('log', { msg: `测速结束: 成功 ${ok} / 失败 ${fail}` });
      send('done', {});
    }
    res.end();
  })();
});

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      try {
        server.close();
      } catch (_) {}
      resolve(ok);
    };
    server.once('error', () => done(false));
    server.once('listening', () => done(true));
    server.listen(port); // 不传 host，与 app.listen 一致
  });
}

function askPort(occupiedPort) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`⚠️  端口 ${occupiedPort} 已被占用。\n请输入新端口（留空则随机生成）：`, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === '') return resolve(0);
      const num = Number(trimmed);
      if (!Number.isInteger(num) || num < 1 || num > 65535) {
        console.log('❌ 端口无效，将随机生成一个。');
        return resolve(0);
      }
      resolve(num);
    });
  });
}

async function resolvePort() {
  let port = Number(process.env.PORT) || 3000;
  const isInteractive = process.stdin.isTTY;

  while (!(await checkPort(port))) {
    console.log(`⚠️  端口 ${port} 已被占用。`);
    if (!isInteractive) {
      console.log('ℹ️  当前为非交互环境，自动使用随机端口。');
      return 0;
    }
    port = await askPort(port);
    if (port === 0) return 0;
  }
  return port;
}

function listenWithRetry(port, maxRetry = 3) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once('listening', () => resolve(server));
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && maxRetry > 0) {
        console.log(`⚠️  监听 ${port === 0 ? '随机端口' : port} 时仍被占用，重试中...`);
        try {
          server.close();
        } catch (_) {}
        resolve(listenWithRetry(port, maxRetry - 1));
      } else {
        reject(err);
      }
    });
  });
}

// ---------- 启动 ----------
(async () => {
  try {
    const port = await resolvePort();
    const server = await listenWithRetry(port);
    const actualPort = server.address().port;
    console.log('Cloudflare IP Scanner - 优选IP扫描器');
    console.log('项目地址: https://github.com/Stoeaves/Cloudflare-IP-Scanner');
    console.log('');
    console.log(`🚀已在 http://localhost:${actualPort} 启动`);
  } catch (err) {
    console.error('❌ 启动失败：', err.message);
    process.exit(1);
  }
})();

const nodemailer = require('nodemailer');

const recentRequests = new Map();

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function clientAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

function rateLimited(req) {
  const now = Date.now();
  const key = clientAddress(req);
  const history = (recentRequests.get(key) || []).filter(time => now - time < 60_000);
  if (history.length >= 3) return true;
  history.push(now);
  recentRequests.set(key, history);
  return false;
}

module.exports = async function handler(req, res) {
  // 兼容正式网站及直接双击本地 index.html 预览；不向其他来源开放邮件接口。
  const requestOrigin = req.headers.origin;
  const configuredOrigin = process.env.ALLOWED_ORIGIN;
  const permittedOrigins = new Set([
    configuredOrigin,
    'https://yjchen-fqyv.vercel.app',
    'https://cyj0208.github.io',
    'null'
  ].filter(Boolean));

  if (requestOrigin && permittedOrigins.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    if (requestOrigin && !permittedOrigins.has(requestOrigin)) {
      return sendJson(res, 403, { ok: false, message: '请求来源未获许可' });
    }
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: '仅支持 POST 请求' });
  }

  if (requestOrigin && !permittedOrigins.has(requestOrigin)) {
    return sendJson(res, 403, { ok: false, message: '请求来源未获许可' });
  }

  if (rateLimited(req)) {
    return sendJson(res, 429, { ok: false, message: '信鸽需要歇息片刻，请一分钟后再试' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { ok: false, message: '书信格式不正确' });
    }
  }

  const signature = String(body.signature || '').trim();
  const content = String(body.content || '').trim();
  const honeypot = String(body.website || '').trim();

  if (honeypot) return sendJson(res, 200, { ok: true, message: '书信已送达' });
  if (!signature || !content) return sendJson(res, 400, { ok: false, message: '请填写署名与书信内容' });
  if (signature.length > 30) return sendJson(res, 400, { ok: false, message: '署名不能超过 30 个字符' });
  if (content.length > 2000) return sendJson(res, 400, { ok: false, message: '书信不能超过 2000 个字符' });

  const account = process.env.QQ_EMAIL;
  const authCode = process.env.QQ_SMTP_AUTH_CODE;
  const recipient = process.env.MAIL_TO || account;
  if (!account || !authCode || !recipient) {
    return sendJson(res, 500, { ok: false, message: '邮件服务尚未完成配置' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: { user: account, pass: authCode }
    });

    await transporter.sendMail({
      from: `飞鸽传书 <${account}>`,
      to: recipient,
      subject: `飞鸽传书｜${signature.replace(/[\r\n]/g, ' ')}`,
      text: `署名：${signature}\n\n书信内容：\n${content}\n\n—— 来自陈彦君个人简介网站`
    });

    return sendJson(res, 200, { ok: true, message: '信鸽已将书信送达' });
  } catch (error) {
    console.error('MAIL_SEND_FAILED', error?.message || error);
    return sendJson(res, 502, { ok: false, message: '信鸽暂未送达，请稍后重试' });
  }
};

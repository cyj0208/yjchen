# 飞鸽传书部署说明

## 一、获取 QQ 邮箱 SMTP 授权码

1. 登录 `mail.qq.com`。
2. 打开“设置”→“账号与安全”→“安全设置”。
3. 找到“POP3/IMAP/SMTP/Exchange/CardDAV 服务”。
4. 开启 SMTP 服务，按页面提示生成授权码。
5. 授权码不是 QQ 密码，不要写入 HTML、代码或提交到 GitHub。

## 二、上传到 GitHub

将整个“个人简历”文件夹上传至一个 GitHub 仓库。至少包含：

- `index.html`
- `api/send-letter.js`
- `package.json`
- `vercel.json`
- 证书与页面图片

`.env` 和授权码不能上传。

## 三、部署到 Vercel

1. 登录 `vercel.com`，使用 GitHub 账号授权。
2. 点击“Add New”→“Project”，选择个人简介仓库。
3. Framework Preset 选择“Other”，其余保持默认并部署。
4. 在项目“Settings”→“Environment Variables”添加：

   - `QQ_EMAIL`：`3251029051@qq.com`
   - `QQ_SMTP_AUTH_CODE`：刚生成的 QQ SMTP 授权码
   - `MAIL_TO`：`3251029051@qq.com`
   - `ALLOWED_ORIGIN`：Vercel 提供的正式站点地址，例如 `https://xxx.vercel.app`

5. 环境变量保存后，在“Deployments”中重新部署一次。

## 四、验证

打开 Vercel 站点，进入“飞鸽传书”，填写署名与内容并放飞。成功时页面显示“信鸽已将书信送达”，QQ 邮箱会收到邮件。

如果提示“邮件服务尚未完成配置”，检查环境变量；如果提示“暂未送达”，优先检查授权码和 SMTP 服务是否已开启。

# Cloudflare IP Scanner (Cloudflare 优选 IP 扫描器)

基于 Node.js 开发的高性能 Cloudflare 优选 IP 扫描与测速工具。提供直观的 Web 界面，支持 IPv4 和 IPv6 地址随机生成、TCPing 延迟测试、数据中心节点（Colo）精准识别以及多线程下载测速功能。

## ✨ 主要特性

- **🌐 全面的 IP 支持**：内置 Cloudflare 官方公布的 IPv4 和 IPv6 CIDR 段，支持按网段随机生成可用 IP 进行扫描。
- **⚡ TCP Ping 测延迟**：通过建立底层 TCP 连接精确测量 RTT 延迟，支持自定义端口和延迟阈值过滤。
- **📍 数据中心 (Colo) 识别**：利用原生 Socket 绕过 WAF 请求 `/cdn-cgi/trace`，精准获取节点 IATA 机场代码，并自动映射为中文地区名称（如 `HKG` -> 香港，`SJC` -> 圣何塞）。
- **🚀 真实下载测速**：通过下载 50MB 测试文件 (`/__down?bytes=50000000`)，智能跳过 TCP 慢启动阶段，精准测量稳态带宽速度 (Mbps)。
- **🧵 多线程与并发控制**：支持自定义扫描线程数，以及测速时的并发控制，大幅提升扫描与测速效率。
- **🖥️ 实时 Web 界面**：基于 Server-Sent Events (SSE) 技术，将扫描日志、实时进度条和可用 IP 无缝推送到浏览器。
- **🛡️ 智能端口管理**：启动时自动检测端口占用情况，支持命令行交互修改或自动分配随机端口，完美适配各类运行环境。

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (建议 v20 及以上版本)
- npm (随 Node.js 一起安装)

### 安装与运行

1. **克隆项目到本地**
   ```bash
   git clone https://github.com/Stoeaves/Cloudflare-IP-Scanner.git
   cd Cloudflare-IP-Scanner
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **运行项目**
   ```bash
   npm start
   ```
> 启动后，控制台会输出访问地址（默认为 localhost:3000）。在浏览器中打开该地址即可使用 Web 界面进行扫描。

### 利用 Github Actions 进行编译为可执行文件

1. **Fork 项目**
   Fork 本项目到你的 Github 账户。

2. **启用 Github Actions**
   点击仓库右上角的 "Actions" 按钮，启用所有工作流。

3. **运行 Workflows**
   进入Actions页面后，在左侧找到 `Build and Package`，点击 `Run workflow` 按钮，等待编译完成。

4. **下载编译产物**
   编译完成后，进入 `Actions` 页面，找到 `Build and Package` 工作流，点击 `Artifacts` 下载编译产物。

### 编译产物的不同平台使用方法

#### Windows

下载 `cf-scanner-windows-x64`，解压后运行 `cf-scanner.exe`。

#### macOS 和 Linux

下载 `cf-scanner-linux` 或 `cf-scanner-macos`，赋予执行权限并运行：

```bash
# 1. 赋予执行权限
chmod +x cf-scanner-linux  # macOS 用户替换为 cf-scanner-macos

# 2. 运行程序
./cf-scanner-linux
```

## ⚙️ 功能说明

### 1. IP 扫描 (Scan)

- **IP 类型:** 选择扫描 IPv4 或 IPv6。
- **采样率:** 每个 CIDR 网段生成的随机 IP 数量。
- **线程数:** 同时执行 TCPing 的并发数。
- **延迟阈值:** 自动过滤掉 RTT 高于该值的劣质 IP。
- **端口:** 目标测试端口（如 443, 80, 2053, 2083, 8443 等常用 CDN 端口）。

### 2. 下载测速 (SpeedTest)

在扫描出可用 IP 后，可一键勾选部分或全部 IP 进行带宽测速。
支持设置**测速时长**（秒）和**并发模式**（单线程串行或 8 线程并发测速）。

**测速原理**：向 Cloudflare 测速节点发起 HTTP/HTTPS GET 请求，记录特定时间窗口内的下载字节数，计算出真实的 Mbps 速度。

## 📦 技术栈

**后端**: Node.js, Express.js
**网络请求**: Node.js 原生 `net`, `tls`, `http`, `https` 模块
**IP 处理**: ipaddr.js
**前后端通信**: Server-Sent Events (SSE)
**前端**: HTML5, CSS3, Vanilla JavaScript

## ⚠️ 免责声明
本工具仅供学习、网络测试及研究使用。

请遵守当地法律法规以及 Cloudflare 的服务条款，严禁将本工具用于任何恶意攻击、非法扫描或破坏他人网络的行为。

高频扫描可能会导致你的本地 IP 被目标网络或本地运营商防火墙暂时封禁，请在合理范围内设置线程数和采样率。

使用本工具所产生的一切后果由使用者自行承担，作者不承担任何连带责任。

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。
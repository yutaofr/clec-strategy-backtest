# Linux 本地测试与部署架构指南

本指南旨在为本项目的 Linux 环境开发、测试和部署提供标准化的流程。

## 1. 架构概览

本项目是一个典型的 **Vite + React + Tailwind CSS** 前端单页应用 (SPA)。其核心逻辑（金融回测计算）运行在客户端浏览器/容器中。

### 技术栈
- **构建工具**: Vite
- **运行时**: Node.js (构建期), Nginx (运行期/静态资源服务)
- **部署方式**: Docker 容器化

---

## 2. 本地测试方案 (Docker)

为了确保环境一致性，我们推荐使用 Docker 进行本地测试。

### 2.1 构建镜像
在项目根目录下执行：
```bash
docker build -t qqq-qld-backtester .
```

### 2.2 运行容器
使用命令行运行：
```bash
docker run -d -p 8080:80 --name backtester-test qqq-qld-backtester
```
访问地址: `http://localhost:8080`

### 2.3 使用 Docker Compose (推荐)
对于复杂的测试场景或多环境模拟，使用 `docker-compose.yml`:
```bash
# 启动生产模拟镜像
docker-compose up -d prod-test
```
访问地址: `http://localhost:3000`

---

## 3. 测试重点与策略

由于项目包含大量的金融回测逻辑 (`services/simulationEngine.ts`, `services/financeMath.ts`)，测试应集中在以下方面：

### 3.1 精度与计算一致性
- **单元测试**: 对 `financeMath.ts` 中的复利、回撤等核心算法进行单元测试。
- **回归测试**: 确保新的代码更改不会改变已知输入集的模拟结果。

### 3.2 环境一致性
- 确保本地构建的 `dist` 文件夹与 Docker 镜像中的内容一致。
- 验证生产环境下的 Nginx 配置（如 404 页面重定向到 `index.html`）。

---

## 4. 部署架构建议

### 4.1 静态托管 (推荐)
由于是纯客户端应用，最佳方案是直接托管在 CDN 或 静态服务器上：
- **方案 A**: Nginx Server (使用 Dockerfile 中的 Nginx 模式)。
- **方案 B**: 静态平台 (Vercel, Netlify, GitHub Pages)。

### 4.2 CI/CD 集成
建议在 GitHub Actions 中集成以下步骤：
1. `npm install`
2. `npm run build`
3. `docker build` & `docker push`
4. 部署到目标服务器。

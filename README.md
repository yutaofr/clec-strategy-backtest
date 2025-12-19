<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 📈 CLEC Strategy Backtest

**A High-Performance Investment Simulation & Strategic Risk Analysis Platform**

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

[Explore App in AI Studio](https://ai.studio/apps/drive/1W04ATWSNHiveWwzGJnm1XwiIBt9ivfYp)

</div>

---

## 🚀 Overview

**CLEC Strategy Backtest** is a sophisticated financial tool designed for serious investors to simulate, analyze, and optimize investment strategies using historical market data (specifically focusing on QQQ/QLD assets). It goes beyond simple calculators by modeling complex scenarios including leverage, margin calls, interest accrual, and inflation-adjusted living expenses.

## ✨ Key Features

### 🛠 Powerful Simulation Engine
- **Multi-Asset Allocation**: Mix and match QQQ (Nasdaq-100) and QLD (2x Leveraged Nasdaq-100).
- **Advanced Leverage Modeling**: 
  - Interactive LTV (Loan-to-Value) tracking.
  - Automatic margin call/liquidation triggers when safety limits are breached.
  - Capitalized interest for unpaid loan balances.
- **Dynamic Cash Management**: Supports interest-bearing cash reserves and flexible contribution intervals.

### 🧠 Investment Strategies
- **Lump Sum + Annual Top-up**: Strategic entry with periodic capital injections.
- **Standard DCA**: Classic Dollar Cost Averaging with configurable intervals.
- **Yearly Rebalancing**: Automated maintenance of target asset allocations.
- **Smart Adjust**: A proprietary algorithm that harvests profits in bull markets and "buys the dip" during corrections using cash reserves.

### 📊 Professional Analytics & Reporting
- **In-depth Metrics**: CAGR, IRR, Sharpe Ratio, Ulcer Index (Pain Index), Max Drawdown, and Calmar Ratio.
- **AI-Readable PDF Reports**: Generate comprehensive PDF summaries with charts and tables optimized for both humans and AI analysis.
- **Real-time Visualization**: Interactive charts powered by Recharts for equity curves and risk metrics.

### 🌐 Global & Versatile
- **i18n Ready**: Fully localized interface support.
- **Cross-Platform**: Built with Capacitor for seamless transition to mobile platforms (Android/iOS).

---

## 🛠 Tech Stack

- **Frontend**: React 18 with Vite
- **Language**: TypeScript (Strict Typing)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **PDF Generation**: jsPDF + jspdf-autotable + html2canvas
- **Mobile**: Capacitor
- **Deployment**: Docker & Docker Compose

---

## 💻 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- Docker (Optional, for containerized deployment)

### Local Development
1. **Clone & Install**:
   ```bash
   npm install
   ```
2. **Configure Environment**:
   Set `GEMINI_API_KEY` in `.env.local` for AI-enhanced features.
3. **Launch**:
   ```bash
   npm run dev
   ```

### Docker Deployment
```bash
docker-compose up -d
```

### Mobile Sync (Capacitor)
```bash
npm run mobile:sync
```

---

## 📂 Project Structure

- `components/`: Modular UI components (ResultsDashboard, ConfigPanel, etc.)
- `services/`: Core logic (simulationEngine, financeMath, strategyDefinitions)
- `docs/`: Evolution path and documentation.
- `constants.ts`: Global configuration and initial data sets.
- `types.ts`: Shared TypeScript interfaces.

---

<div align="center">
Made with ❤️ for Strategic Investors
</div>

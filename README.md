# AI Agent Platform

简体中文说明文档 — 一个用于快速搭建和开发 AI Agent 平台的工程模板。

## 📁 目录结构

```
├── backend/     # 后端服务（API、Agent 管理、模型接入等）
├── frontend/    # Web 前端（管理控制台、监控、调试界面）
└── mini-app/    # 小程序或轻量客户端示例
```

## 🚀 项目简介

这是一个用于构建 AI Agent 平台的参考实现/模板，包含后端、前端和小程序示例。

## ✨ 主要功能

- **Agent 管理** - 完整的生命周期管理（创建、启动、停止、监控）
- **多模型支持** - 本地模型 / 云模型适配层
- **插件体系** - 可扩展的插件与策略体系
- **可视化控制** - 前端控制台用于可视化管理与调试

## ⚡ 部署指南

#### 开发环境搭建

- 安装git和docker软件；
- 克隆仓库代码并切换到最新发布的稳定版本；

  ```shell
  git clone https://github.com/HuxJiang/ai_agent_platform.git
  git checkout release
  ```
- 下载

后端docker镜像单独构建指令：

```cmd

cd backend
mvn clean package -DskipTests
docker build -t ai-agent-backend:test .
```

#### 部署

一键部署启动指令：

```
docker-compose -f docker-compose.prod.yml -p ai-platform up -d --build
```

开发环境一键配置指令：

```
docker-compose -f docker-compose.dev.yml -p ai-platform-dev up -d
```

## 🔧贡献代码

### 分支管理

- 提交前请创建分支：`feature/xxx` 或 `fix/xxx`
- 提交说明清晰简短，包含变更目的与影响范围
  - fix:修复以往的问题；
  - add:添加的文件
  - feat:新增的功能

### 贡献指南

- 欢迎提交 Issue 与 Pull Request
- 在 PR 中描述测试步骤与预期行为

## 📞 联系与许可

- **作者/维护者**：见仓库元信息
- **许可证**：请查看仓库根目录下的 `LICENSE` 文件

---

*如有问题，请参考脚本内的详细提示或提交 Issue*

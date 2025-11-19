@echo off
setlocal

:: 配置仓库信息
set "MY_REPO=https://github.com/yangyuchen123/internet_dev"
set "UPSTREAM_REPO=https://github.com/HuxJiang/ai_agent_platform"
set "MY_BRANCH=feature/yangyuchen"
set "UPSTREAM_BRANCH=main"


:: 构建 PR 链接
set "PR_URL=%UPSTREAM_REPO%/compare/%UPSTREAM_BRANCH%...yangyuchen123:internet_dev:%MY_BRANCH%?expand=1"

:: 打开浏览器
start "" "%PR_URL%"

echo >>>>>PR created: %PR_URL%
endlocal


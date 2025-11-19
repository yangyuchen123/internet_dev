@echo off
setlocal

:: 配置仓库信息
set "MY_REPO=https://github.com/yangyuchen123/internet_dev"
set "UPSTREAM_REPO=https://github.com/HuxJiang/ai_agent_platform"
set "MY_BRANCH=feature/yangyuchen"
set "UPSTREAM_BRANCH=main"

:: 输出 PR 信息并打开浏览器
echo 即将打开浏览器创建 Pull Request...
echo 源仓库: %MY_REPO%:%MY_BRANCH%
echo 目标仓库: %UPSTREAM_REPO%:%UPSTREAM_BRANCH%

:: 构建 PR 链接
set "PR_URL=%UPSTREAM_REPO%/compare/%UPSTREAM_BRANCH%...yangyuchen123:internet_dev:%MY_BRANCH%?expand=1"

:: 打开浏览器
start "" "%PR_URL%"

echo 请在浏览器中完成 PR 创建流程
endlocal
pause

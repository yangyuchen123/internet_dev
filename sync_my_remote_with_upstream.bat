@echo off
setlocal

:: 配置仓库信息
set "UPSTREAM_NAME=upstream"  :: 原主仓库的远程名
set "UPSTREAM_REPO=https://github.com/HuxJiang/ai_agent_platform"
set "MY_REMOTE=origin"        :: 自己 fork 仓库的远程名
set "MY_BRANCH=feature/yangyuchen"
set "UPSTREAM_BRANCH=main"

:: 检查是否已添加原主仓库远程
git remote | findstr /i "%UPSTREAM_NAME%" >nul
if %errorlevel% neq 0 (
    echo 添加原主仓库远程...
    git remote add %UPSTREAM_NAME% %UPSTREAM_REPO%
)

:: 拉取原主仓库最新代码
echo 拉取原主仓库最新代码...
git fetch %UPSTREAM_NAME%

:: 合并到本地分支
echo 合并原主仓库代码到本地分支...
git checkout %MY_BRANCH%
git merge %UPSTREAM_NAME%/%UPSTREAM_BRANCH%

:: 推送到自己的远程仓库
echo 推送到自己的远程仓库...
git push %MY_REMOTE% %MY_BRANCH%

echo 同步完成！
endlocal
pause

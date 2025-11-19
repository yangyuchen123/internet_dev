@echo off

setlocal

:: 加载环境变量
call load_env.bat || exit /b 1

:: 设置远程仓库名称
set "UPSTREAM_NAME=upstream"  :: 原主仓库的远程名
set "MY_REMOTE=origin"        :: 自己 fork 仓库的远程名

:: 检查是否已添加原主仓库远程
git remote | findstr /i "%UPSTREAM_NAME%" >nul
if %errorlevel% neq 0 (
    echo 添加 %UPSTREAM_NAME% %UPSTREAM_REPO_URL%...
    git remote add %UPSTREAM_NAME% %UPSTREAM_REPO_URL%
)

:: 拉取原主仓库最新代码
echo 拉取 %UPSTREAM_NAME% 最新代码...
git fetch %UPSTREAM_NAME%

:: 合并到本地分支
echo 合并 %UPSTREAM_NAME%/%UPSTREAM_BRANCH_NAME% 到 %MY_BRANCH_NAME%...
git checkout %MY_BRANCH_NAME%
git merge %UPSTREAM_NAME%/%UPSTREAM_BRANCH_NAME%

:: 推送到自己的远程仓库
echo 推送代码到 %MY_REMOTE%/%MY_BRANCH_NAME%...
git push %MY_REMOTE% %MY_BRANCH_NAME%

echo 同步上游仓库到我的远程仓库完成！
endlocal
pause


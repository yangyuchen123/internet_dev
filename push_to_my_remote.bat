@echo off
setlocal enabledelayedexpansion

:: 配置仓库信息
set "LOCAL_BRANCH=feature/yangyuchen"
set "REMOTE_NAME=origin"  :: 通常 fork 仓库的远程名为 origin

:: 拉取最新代码避免冲突
echo 拉取远程仓库最新代码...
git pull %REMOTE_NAME% %LOCAL_BRANCH%

:: 检查是否有变更
git status
set /p "COMMIT_MSG=请输入提交信息: "

:: 提交变更
git add .
git commit -m "!COMMIT_MSG!"

:: 推送到远程仓库
echo 推送到 %REMOTE_NAME%/%LOCAL_BRANCH%...
git push %REMOTE_NAME% %LOCAL_BRANCH%

echo 操作完成！
endlocal
pause

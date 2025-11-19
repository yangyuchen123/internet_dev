@echo off
setlocal

:: 配置仓库信息
set "LOCAL_BRANCH=feature/yangyuchen"
set "REMOTE_NAME=origin"

echo 同步本地仓库与 %REMOTE_NAME%/%LOCAL_BRANCH%...
git fetch %REMOTE_NAME%
git checkout %LOCAL_BRANCH%
git pull %REMOTE_NAME% %LOCAL_BRANCH%

echo 同步完成！
endlocal
pause

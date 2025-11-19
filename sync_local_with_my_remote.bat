@echo off
setlocal

:: 配置仓库信息
set "LOCAL_BRANCH=feature/yangyuchen"
set "REMOTE_NAME=origin"

echo >>>>>syncing %REMOTE_NAME%/%LOCAL_BRANCH%...
git fetch %REMOTE_NAME%
git checkout %LOCAL_BRANCH%
git pull %REMOTE_NAME% %LOCAL_BRANCH%

echo >>>>>complete.............
endlocal


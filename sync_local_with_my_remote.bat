@echo off

setlocal

:: 加载环境变量
call load_env.bat || exit /b 1

:: 设置远程仓库名称（默认使用origin）
set "REMOTE_NAME=origin"

echo 同步 %REMOTE_NAME%/%MY_BRANCH_NAME%...
git fetch %REMOTE_NAME%
git checkout %MY_BRANCH_NAME%
git pull %REMOTE_NAME% %MY_BRANCH_NAME%

echo 本地仓库已与远程同步完成！
endlocal
pause


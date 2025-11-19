@echo off
setlocal

:: 加载环境变量
call load_env.bat || exit /b 1

:: 从MY_REPO_URL中提取用户名和仓库名
for /f "tokens=4,5 delims=/\" %%a in ("%MY_REPO_URL%") do (
    set "USER_NAME=%%a"
    set "REPO_NAME=%%b"
)

:: 移除REPO_NAME中的.git后缀（如果有）
if "!REPO_NAME:~-4!"==".git" set "REPO_NAME=!REPO_NAME:~0,-4!"

:: 构建 PR 链接
set "PR_URL=%UPSTREAM_REPO_URL%/compare/%UPSTREAM_BRANCH_NAME%...%USER_NAME%:%REPO_NAME%:%MY_BRANCH_NAME%?expand=1"

:: 打开浏览器
start "" "%PR_URL%"

echo 创建PR: %PR_URL%
echo 请在浏览器中完成PR的创建
endlocal
pause


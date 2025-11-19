@echo off

setlocal enabledelayedexpansion

:: 检查 .env 文件是否存在
if not exist ".env" (
    echo 错误：未找到 .env 文件，请根据 .env_temp 创建并填写信息
    exit /b 1
)

:: 读取 .env 文件并设置环境变量
for /f "usebackq tokens=1,2 delims==" %%a in (.env) do (
    if not "%%a"=="" (
        set "%%a=%%b"
    )
)

:: 验证必要变量是否存在
if "!MY_REPO_URL!"=="" (echo 错误：.env 中未设置 MY_REPO_URL & exit /b 1)
if "!MY_BRANCH_NAME!"=="" (echo 错误：.env 中未设置 MY_BRANCH_NAME & exit /b 1)
if "!UPSTREAM_REPO_URL!"=="" (echo 错误：.env 中未设置 UPSTREAM_REPO_URL & exit /b 1)
if "!UPSTREAM_BRANCH_NAME!"=="" (echo 错误：.env 中未设置 UPSTREAM_BRANCH_NAME & exit /b 1)

endlocal & (
    set "MY_REPO_URL=%MY_REPO_URL%"
    set "MY_BRANCH_NAME=%MY_BRANCH_NAME%"
    set "UPSTREAM_REPO_URL=%UPSTREAM_REPO_URL%"
    set "UPSTREAM_BRANCH_NAME=%UPSTREAM_BRANCH_NAME%"
)

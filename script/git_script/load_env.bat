@echo off

:: Check .env file
if not exist ".env" (
    echo Error: .env file not found
    exit /b 1
)

:: Load environment variables (filter out comments and empty lines)
for /f "usebackq tokens=1* delims==" %%A in (
    `findstr /v /c:"#" ".env" ^| findstr /r /v "^$"`  
) do (
    if not "%%A"=="" set "%%A=%%B"
)

:: Validate required variables
if "%MY_BRANCH_NAME%"=="" (
    echo Error: MY_BRANCH_NAME not set
    exit /b 1
)

:: 可选：验证其他必要变量
if "%MY_REPO_URL%"=="" (
    echo Error: MY_REPO_URL not set
    exit /b 1
)

echo Environment variables loaded successfully:
echo MY_REPO_URL=%MY_REPO_URL%
echo MY_BRANCH_NAME=%MY_BRANCH_NAME%
echo UPSTREAM_REPO_URL=%UPSTREAM_REPO_URL%
echo UPSTREAM_BRANCH_NAME=%UPSTREAM_BRANCH_NAME%
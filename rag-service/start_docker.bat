@echo off

:: 简化的RAG服务Docker启动脚本

:: 检查Docker是否已安装
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker not found. Please install Docker Desktop and start it first.
    pause
    exit /b 1
)

:: 检查Docker服务是否运行
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker service is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

:: 创建必要的目录
if not exist data\kb (
    echo Creating data directory...
    mkdir data\kb 2>nul
)

:: 启动服务
echo Starting RAG services...
docker compose up -d --build
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to start services.
    pause
    exit /b 1
)

:: 等待初始化
echo Waiting for services to initialize...
ping -n 11 127.0.0.1 >nul

echo Services started successfully!
echo RAG Service: http://localhost:8000
echo MySQL: localhost:3307
echo To view logs: docker compose logs -f
echo To stop: docker compose down

pause
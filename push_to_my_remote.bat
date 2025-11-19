@echo off

setlocal

:: 加载环境变量
call load_env.bat || exit /b 1

:: 拉取最新代码
echo 拉取远程仓库 %MY_REPO_URL%:%MY_BRANCH_NAME% 最新代码...
git pull origin %MY_BRANCH_NAME%

:: 提交操作
git status
set /p "COMMIT_MSG=请输入提交信息: "
git add .
git commit -m "%COMMIT_MSG%"

:: 推送到远程
echo 推送到 %MY_REPO_URL%:%MY_BRANCH_NAME%...
git push origin %MY_BRANCH_NAME%

echo 操作完成！
endlocal
pause


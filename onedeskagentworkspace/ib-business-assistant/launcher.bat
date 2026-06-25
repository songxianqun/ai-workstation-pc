@echo off
REM 投行业务参与助手 启动脚本

set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

python main.py %*

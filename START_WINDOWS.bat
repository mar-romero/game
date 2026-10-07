@echo off
cd /d "%~dp0"
title Factory Wars v1.5 - Servidor local
where py >nul 2>nul
if %errorlevel%==0 (
  py serve.py
) else (
  python serve.py
)
pause

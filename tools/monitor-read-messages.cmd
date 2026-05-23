@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0monitor-read-messages.ps1" %*

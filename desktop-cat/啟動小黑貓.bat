@echo off
rem 啟動樂衍小黑貓（關閉：在小黑貓上按右鍵 > 結束小黑貓）
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0LeyanCat.ps1"

@echo off
cd /d "%~dp0"
:menu
cls
echo OUFEIDUN - MAY NHAN VIEN
echo 1. Mo app
echo 2. Cap nhat app (may da cai)
echo 3. Kiem tra ket noi
echo 4. Sua IP ket noi
echo 5. Cai lan dau
echo 0. Thoat
choice /c 123450 /n /m "Chon: "
set "choiceCode=%errorlevel%"
if "%choiceCode%"=="6" exit /b
if "%choiceCode%"=="5" call "%~dp0CAI-MAY-NHAN-VIEN.bat"
if "%choiceCode%"=="4" call "%~dp0SUA-KET-NOI.bat"
if "%choiceCode%"=="3" call "%~dp0KIEM-TRA-KET-NOI.bat"
if "%choiceCode%"=="2" call "%~dp0CAP-NHAT.bat"
if "%choiceCode%"=="1" call "%~dp0MO-APP.bat"
goto menu

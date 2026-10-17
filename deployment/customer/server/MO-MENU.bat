@echo off
cd /d "%~dp0"
:menu
cls
echo OUFEIDUN - MAY CHU
echo 1. Chay may chu
echo 2. Kiem tra loi
echo 3. Khoi dong lai
echo 4. Sua cau hinh
echo 5. Cap nhat phien ban
echo 6. Sao luu
echo 7. Tao bo may nhan vien
echo 8. Dung API va HTTPS
echo 9. Cai LAN DAU (khong dung cho may da cai)
echo 0. Thoat
choice /c 1234567890 /n /m "Chon: "
set "choiceCode=%errorlevel%"
if "%choiceCode%"=="10" exit /b
if "%choiceCode%"=="9" call "%~dp0CAI-MAY-CHU.bat"
if "%choiceCode%"=="8" call "%~dp0DUNG-MAY-CHU.bat"
if "%choiceCode%"=="7" call "%~dp0TAO-BO-MAY-NHAN-VIEN.bat"
if "%choiceCode%"=="6" call "%~dp0SAO-LUU.bat"
if "%choiceCode%"=="5" call "%~dp0CAP-NHAT.bat"
if "%choiceCode%"=="4" call "%~dp0SUA-CAU-HINH.bat"
if "%choiceCode%"=="3" call "%~dp0KHOI-DONG-LAI.bat"
if "%choiceCode%"=="2" call "%~dp0KIEM-TRA-LOI.bat"
if "%choiceCode%"=="1" call "%~dp0CHAY-MAY-CHU.bat"
goto menu

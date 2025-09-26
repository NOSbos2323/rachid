[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName=Waali Gas Station
AppVersion=1.0.0
AppVerName=Waali Gas Station 1.0.0
AppPublisher=Waali Gas Station Team
AppPublisherURL=https://waali-gas.com
AppSupportURL=https://waali-gas.com/support
AppUpdatesURL=https://waali-gas.com/updates
DefaultDirName={autopf}\Waali Gas Station
DefaultGroupName=Waali Gas Station
AllowNoIcons=yes
LicenseFile=LICENSE.txt
InfoBeforeFile=README.txt
OutputDir=installer
OutputBaseFilename=WaaliGasStation-Setup-v1.0.0
SetupIconFile=src-tauri\icons\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0.17763
DisableProgramGroupPage=yes
DisableReadyPage=no
DisableFinishedPage=no
ShowLanguageDialog=yes
UsePreviousLanguage=no

[Languages]
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1
Name: "startup"; Description: "تشغيل تلقائي مع بدء النظام"; GroupDescription: "خيارات إضافية"; Flags: unchecked

[Files]
Source: "src-tauri\target\release\waali-gas-station.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "src-tauri\icons\*"; DestDir: "{app}\icons"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion; DestName: "README.txt"
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion; DestName: "LICENSE.txt"

[Icons]
Name: "{group}\Waali Gas Station"; Filename: "{app}\waali-gas-station.exe"; IconFilename: "{app}\icons\icon.ico"
Name: "{group}\{cm:UninstallProgram,Waali Gas Station}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Waali Gas Station"; Filename: "{app}\waali-gas-station.exe"; IconFilename: "{app}\icons\icon.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\Waali Gas Station"; Filename: "{app}\waali-gas-station.exe"; IconFilename: "{app}\icons\icon.ico"; Tasks: quicklaunchicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "WaaliGasStation"; ValueData: "{app}\waali-gas-station.exe --minimized"; Tasks: startup

[Run]
Filename: "{app}\waali-gas-station.exe"; Description: "{cm:LaunchProgram,Waali Gas Station}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
procedure InitializeWizard();
begin
  WizardForm.RightToLeft := True;
end;

function InitializeSetup(): Boolean;
var
  Version: TWindowsVersion;
begin
  GetWindowsVersionEx(Version);
  if Version.Major < 10 then begin
    MsgBox('يتطلب هذا التطبيق Windows 10 أو أحدث.', mbError, MB_OK);
    Result := False;
  end else
    Result := True;
end;
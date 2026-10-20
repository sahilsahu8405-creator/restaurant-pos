const { packager } = require('@electron/packager');
const path = require('path');

async function build() {
  console.log('Packaging RestoHub Desktop Software for Windows x64...');
  try {
    const appPaths = await packager({
      dir: path.resolve(__dirname, '..'),
      out: path.resolve(__dirname, '../dist-electron'),
      name: 'RestoHub POS',
      platform: 'win32',
      arch: 'x64',
      overwrite: true,
      asar: true,
      prune: true,
      appVersion: '1.0.0',
      appCopyright: 'Copyright 2026 RestoHub',
      win32metadata: {
        CompanyName: 'RestoHub Inc.',
        FileDescription: 'RestoHub — Modern Restaurant Operating System',
        OriginalFilename: 'RestoHub POS.exe',
        ProductName: 'RestoHub POS',
        InternalName: 'RestoHub POS'
      },
      ignore: [
        /^\/\.git($|\/)/,
        /^\/\.vscode($|\/)/,
        /^\/release($|\/)/,
        /^\/dist-electron($|\/)/,
        /^\/supabase($|\/)/,
        /^\/src($|\/)/,
        /\.ts$/,
        /\.tsx$/,
        /tsconfig.*\.json$/,
        /\.oxlintrc\.json$/
      ]
    });

    const fs = require('fs');
    appPaths.forEach(appDir => {
      // 1. Create Desktop Shortcut Batch File
      const batContent = `@echo off\r\ntitle RestoHub POS - Desktop Shortcut Setup\r\necho ========================================================\r\necho   Creating RestoHub POS Shortcut on your Windows Desktop...\r\necho ========================================================\r\npowershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'RestoHub POS.lnk')); $s.TargetPath = '%~dp0RestoHub POS.exe'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0RestoHub POS.exe,0'; $s.Description = 'RestoHub Modern Restaurant POS'; $s.Save()"\r\necho.\r\necho [SUCCESS] RestoHub POS icon created on your Desktop!\r\necho You can now launch RestoHub POS directly from your screen.\r\necho.\r\npause\r\n`;
      fs.writeFileSync(path.join(appDir, 'Create Desktop Shortcut.bat'), batContent);

      // 2. Create User Instructions
      const readmeContent = `RestoHub POS — Windows Desktop Software\r\n=========================================\r\n\r\nQUICK START:\r\n1. DO NOT move or cut 'RestoHub POS.exe' alone out of this folder (it requires the accompanying files to run).\r\n2. Double-click 'Create Desktop Shortcut.bat' to put a working shortcut on your Desktop screen.\r\n3. Or double-click 'RestoHub POS.exe' directly from this folder to start billing!\r\n\r\nFEATURES:\r\n- Built-in Silent ESC/POS thermal printing on port 9100\r\n- Press F11 anytime to toggle full-screen counter kiosk mode\r\n- Press F12 to inspect developer tools if needed\r\n`;
      fs.writeFileSync(path.join(appDir, 'README - HOW TO USE.txt'), readmeContent);
    });

    console.log('\n======================================================');
    console.log('SUCCESS! Windows Desktop App generated successfully:');
    appPaths.forEach(p => console.log(` -> ${p}`));
    console.log('Executable: RestoHub POS.exe');
    console.log('Helper: Create Desktop Shortcut.bat added');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Packaging failed:', err);
    process.exit(1);
  }
}

build();

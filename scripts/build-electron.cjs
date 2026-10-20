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

    console.log('\n======================================================');
    console.log('SUCCESS! Windows Desktop App generated successfully:');
    appPaths.forEach(p => console.log(` -> ${p}`));
    console.log('Executable: RestoHub POS.exe');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Packaging failed:', err);
    process.exit(1);
  }
}

build();

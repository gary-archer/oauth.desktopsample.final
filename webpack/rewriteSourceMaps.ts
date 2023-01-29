import fs from 'fs';

/*
 * Finalize source maps that could be used for debugging
 */
export function removeSourceMapReferences(bundleNames: string[]): void {

    bundleNames.forEach(bundleName => {
        removeSourcemapReference(`dist/${bundleName}`);
    });
}

/*
 * We build source map files and use them to look up exception stack traces if ever needed
 * This prevents 'missing sourcemap' warning lines potentially being shown in the Electron devtools
 */
function removeSourcemapReference(filePath: string): void {

    const textData = fs.readFileSync(filePath, 'utf8');
    const correctedTextData = textData
        .split('\n')
        .filter((line) => line.indexOf('sourceMappingURL') === -1)
        .join('\n');

    fs.writeFileSync(filePath, correctedTextData);
}

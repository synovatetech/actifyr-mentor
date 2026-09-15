const fs = require('fs');
const path = require('path');

const directoryPath = path.join(process.cwd(), 'src/app');

function replaceRecursively(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceRecursively(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Pattern: const programId = searchParams.get('programId');
            if (content.includes('const programId = searchParams.get(\'programId\')')) {
                // Add import to useProgramId
                if (!content.includes('import { useProgramId } from')) {
                    content = content.replace(
                        /(import.*?from 'next\/navigation';\r?\n)/,
                        `$1import { useProgramId } from '@/hooks/useProgramId';\n`
                    );
                }

                // Replace implementation block where it might have `|| 1` or not
                const regex1 = /const searchParams = useSearchParams\(\);\s*const programId = searchParams\.get\('programId'\);/;

                content = content.replace(regex1, `const { programId } = useProgramId();`);

                const regex2 = /const searchParams = useSearchParams\(\);\s*const programId = searchParams\.get\('programId'\) \|\| 1;/;
                content = content.replace(regex2, `const { programId } = useProgramId();`);

                // Remove now unused next/navigation import if searchParams isn't used
                if (content.includes('import { useProgramId }') && content.includes('useSearchParams') && !content.includes('const searchParams =')) {
                    content = content.replace(/import { useSearchParams(?:, [^}]*)? } from 'next\/navigation';\r?\n/, '');
                }

                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated at: ${fullPath}`);
            }
        }
    });
}

replaceRecursively(directoryPath);

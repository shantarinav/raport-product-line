const fs = require('fs');
let content = fs.readFileSync('src/features/print/components/PrintDashboardPage.tsx', 'utf8');

if (!content.includes('import { motion, AnimatePresence }')) {
    content = content.replace(
        'import { useEffect, useMemo, useState } from "react";',
        'import { useEffect, useMemo, useState } from "react";\nimport { motion, AnimatePresence } from "motion/react";'
    );
}

content = content.replace(
    /\{viewMode === "analyst" \? <PrintPagesTrendChart data=\{printHistory\} \/> : null\}/,
    `<AnimatePresence mode="popLayout" initial={false}>
            {viewMode === "analyst" ? (
              <motion.div layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <PrintPagesTrendChart data={printHistory} />
              </motion.div>
            ) : null}
          </AnimatePresence>`
);

content = content.replace(
    /\{!isManagerView \? \([^]*?\) : null\}/g,
    (match) => {
        // filter out small pieces like in filters? 
        // Actually, let's just wrap specific big blocks.
        return match;
    }
);

// We need to wrap specific cards:
// The `isManagerView` metric cards.
// The `!isManagerView` full tables at the bottom.
content = content.replace(
    /\{isManagerView \? \(\s*<div className="grid gap-4 md:grid-cols-3">[^]*?<\/div>\s*\) : null\}/,
    (match) => {
        return `<AnimatePresence mode="popLayout" initial={false}>
            {isManagerView ? (
              <motion.div layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="grid gap-4 md:grid-cols-3">
                ` + match.match(/<div className="grid gap-4 md:grid-cols-3">([^]*?)<\/div>\s*\) : null/)[1] + `
              </motion.div>
            ) : null}
          </AnimatePresence>`;
    }
);

content = content.replace(
    /\{!isManagerView \? \(\s*<>\s*<div className="grid gap-4 xl:grid-cols-2">[^]*?<\/SectionCard>\s*<\/>\s*\) : null\}/,
    (match) => {
        return `<AnimatePresence mode="popLayout" initial={false}>
            {!isManagerView ? (
              <motion.div layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                ` + match.match(/<>\s*([^]*?)<\/>\s*\) : null/)[1] + `
              </motion.div>
            ) : null}
          </AnimatePresence>`;
    }
);

fs.writeFileSync('src/features/print/components/PrintDashboardPage.tsx', content);

const fs = require('fs');
let content = fs.readFileSync('src/features/print/components/PrintDashboardPage.tsx', 'utf8');

/* Replace static cards with motion.div wrapper */
content = content.replace(
    /<SectionCard title="Главный вывод"/g,
    '<motion.div layout><SectionCard title="Главный вывод"'
).replace(
    /<\/SectionCard>\s*(<SectionCard\s+title="Топ пользователей по страницам"|<AnimatePresence mode="popLayout" initial=\{false\}>\s*\{!isManagerView)/g,
    (match) => {
        return '</SectionCard></motion.div>\n          ' + match;
    }
);

content = content.replace(
    /<SectionCard\s+title="Топ пользователей по страницам"/g,
    '<motion.div layout>\n          <SectionCard title="Топ пользователей по страницам"'
).replace(
    /<\/SectionCard>\s*\{\!isManagerView/g,
    '</SectionCard>\n          </motion.div>\n\n          {!isManagerView'
);

content = content.replace(
    /<div className="grid gap-4">\s*<FilterStatusBar/g,
    '<motion.div layout className="grid gap-4">\n          <FilterStatusBar'
).replace(
    /<\/FilterStatusBar>\s*<\/div>/g,
    '</FilterStatusBar>\n          </motion.div>'
);

fs.writeFileSync('src/features/print/components/PrintDashboardPage.tsx', content);

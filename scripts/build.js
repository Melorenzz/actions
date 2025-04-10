const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');

console.log('Building...');

const viewsDir = path.join(__dirname ,'../src/views');
const pagesDir = path.join(viewsDir ,'pages');
const buildDir = path.join(__dirname ,'../build');
const partialsDir = path.join(viewsDir ,'partials');
const scriptsSrcDir = path.join(__dirname, '../src/scripts/');
const scriptsDestDir = path.join(buildDir, 'scripts');


fs.emptyDirSync(buildDir);
fs.copySync(scriptsSrcDir, scriptsDestDir);

const extractScripts = (templateContent) => {
    const match = templateContent.match(/{{!--\s*scripts:\s*(\[.*?\])\s*--}}/s);
    if(match) {
        try{
            return JSON.parse(match[1]);
        }catch(err){
            console.log('❌ Error!',err)
        }
    }
    return [];
}

// Доработать функцию extractScripts() так чтобы она возвращала все совпадения для скриптов
// а не только первое как в примере ниже
// console.log(extractScripts(`{{!-- scripts: ["scripts/script.js"] --}}
// ` + `<!doctype html>` + `<html lang="en">`))

const mainTemplateSource = fs.readFileSync(
    path.join(viewsDir ,'layouts/main.hbs'),
    'utf8'
);
const mainTemplate = handlebars.compile(mainTemplateSource);


// Зробити цю частинку скрипта бiльш унiверсалiзованою в в планi того щоб partial можна було розкидати по директорiях
// Фактично в readdirSync мае викликатись рекурсивно ще один readdirSync якщо ми зiткнулись з директорiею а не файлом
// Можна реалiзувати до 2 рiвня вложностi папок
fs.readdirSync(partialsDir).forEach(file => {
    // const = pathname
    const partialName = path.basename(file, '.hbs');
    const partialContent = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    handlebars.registerPartial(partialName, partialContent);
})

fs.readdirSync(pagesDir).forEach(file => {
    const pageName = path.basename(file, '.hbs');
    const filePath = path.join(pagesDir, file);
    const pageContent = fs.readFileSync(filePath, 'utf8');
    const pageTemplate = handlebars.compile(pageContent);

    let scripts = extractScripts(pageContent);

    // поиск скриптов в partials
    fs.readdirSync(partialsDir).forEach(partialsFile => {
        const partialContent = fs.readFileSync(path.join(partialsDir, partialsFile), 'utf8');
        const partialName = path.basename(partialsFile, '.hbs');
        const usedInPage = pageContent.includes(`{{> ${partialName}}`)
        if(usedInPage){
            const partialScript = extractScripts(partialContent);
            scripts = scripts.concat(partialScript);
        }
    })

    // Удаление дубликатов за счет того что scripts инициализируется в SET()
    scripts = [...new Set(scripts)];
    console.log(scripts);

    // Рендер финальной страницы
    const finalHTML = mainTemplate({
        title: pageName,
        body: pageTemplate({}),
        scripts
    })
    fs.writeFileSync(path.join(buildDir, `${pageName}.html`), finalHTML);
})
console.log('✅ Done!')

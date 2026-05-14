const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src/pages');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const target = 'className="d-none d-sm-block"';
    const replacement = 'className="d-block"';
    
    // We only want to replace it in the <nav aria-label="breadcrumb"...> tag
    if (content.includes('aria-label="breadcrumb"') && content.includes(target)) {
        // Regex to replace the class inside the nav tag
        const regex = /<nav[^>]*aria-label="breadcrumb"[^>]*className="d-none d-sm-block"[^>]*>/g;
        let newContent = content.replace(regex, match => {
            return match.replace(target, replacement);
        });
        
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            count++;
            console.log(`Updated: ${file}`);
        }
    }
});

console.log(`Successfully updated ${count} files.`);

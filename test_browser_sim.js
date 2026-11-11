const fs = require('fs');

// Load files
const htmlContent = fs.readFileSync('index.html', 'utf8');
const appJsContent = fs.readFileSync('app.js', 'utf8');
const colaboradoresTxt = fs.readFileSync('colaboradores.txt', 'utf8');

console.log("Files read successfully.");
console.log("HTML length:", htmlContent.length);
console.log("App.js length:", appJsContent.length);
console.log("Colaboradores.txt length:", colaboradoresTxt.length);

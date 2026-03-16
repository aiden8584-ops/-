const fs = require('fs');

// A simple 1x1 transparent PNG base64
const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(base64, 'base64');

fs.writeFileSync('public/icon-192.png', buffer);
fs.writeFileSync('public/icon-512.png', buffer);

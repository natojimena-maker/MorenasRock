const fs = require("fs");
const path = require("path");

// Carpeta donde están tus imágenes
const uploadsDir = path.join(__dirname, "public/uploads");

// Archivo productos.js
const productosFile = path.join(__dirname, "productos.js");

// Leer productos.js
let productos = require(productosFile);

// Leer todos los archivos en uploads
const files = fs.readdirSync(uploadsDir);

let cambios = false;

productos.forEach((p, index) => {
    // Tomamos el nombre original de la imagen
    let imgPath = p.imagen.replace("/uploads/", "");
    let file = files.find(f => f.includes(imgPath) || f === imgPath);

    if (file) {
        // Crear un nombre limpio sin espacios ni paréntesis
        const ext = path.extname(file);
        const newName = `camiseta${index + 1}${ext}`;
        const oldPath = path.join(uploadsDir, file);
        const newPath = path.join(uploadsDir, newName);

        if (oldPath !== newPath) {
            fs.renameSync(oldPath, newPath);
            console.log(`Renombrado: ${file} -> ${newName}`);
            // Actualizar ruta en productos
            p.imagen = `/uploads/${newName}`;
            cambios = true;
        }
    }
});

// Guardar cambios en productos.js
if (cambios) {
    const contenido = `const productos = ${JSON.stringify(productos, null, 2)};\n\nmodule.exports = productos;`;
    fs.writeFileSync(productosFile, contenido, "utf8");
    console.log("productos.js actualizado correctamente.");
} else {
    console.log("No se encontraron cambios necesarios.");
}
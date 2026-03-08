const express = require("express");
const multer = require("multer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 7000;

// Stripe
const stripe = Stripe(process.env.STRIPE_SECRET || "TU_SECRET_KEY_DE_STRIPE");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Carpeta uploads
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Datos estáticos para Render ---
const productos = require("./listaProductos");

// Middleware token
function verificarToken(req,res,next){
    const authHeader = req.headers['authorization'];
    if(!authHeader) return res.status(401).json({ error:"Token requerido" });
    const token = authHeader.split(' ')[1];
    jwt.verify(token,"secreto123",(err,user)=>{
        if(err) return res.status(403).json({ error:"Token inválido" });
        req.user = user;
        next();
    });
}

// LOGIN ADMIN
app.post("/login",(req,res)=>{
    const { username,password } = req.body;
    if(username==="admin" && password==="admin123"){
        const token = jwt.sign({ username },"secreto123",{ expiresIn:"2h" });
        return res.json({ token });
    }
    res.status(401).json({ error:"Usuario o contraseña incorrectos" });
});

// LISTAR PRODUCTOS
app.get("/productos",(req,res)=> {
    res.json(productos);
});

// AGREGAR PRODUCTO
app.post("/productos", verificarToken, multer({ storage: multer.diskStorage({
    destination: (req,file,cb)=> cb(null,"public/uploads"),
    filename: (req,file,cb)=> cb(null, Date.now()+"-"+file.originalname)
})}).single("imagen"), (req,res)=>{
    if(!req.file) return res.status(400).json({ error:"Imagen requerida" });

    const { nombre, precio, tallaS, tallaM, tallaL, tallaXL, stock } = req.body;
    const id = productos.length + 1;
    const imagen = "/uploads/" + req.file.filename;

    productos.push({ id, nombre, precio: parseFloat(precio), tallaS:+tallaS, tallaM:+tallaM, tallaL:+tallaL, tallaXL:+tallaXL, stock:+stock, imagen });
    res.json({ mensaje:"Producto agregado" });
});

// EDITAR PRODUCTO
app.put("/productos/:id", verificarToken, (req,res)=>{
    const { id } = req.params;
    const prod = productos.find(p=>p.id==id);
    if(!prod) return res.status(404).json({ error:"Producto no encontrado" });

    const { nombre, precio, tallaS, tallaM, tallaL, tallaXL, stock } = req.body;
    prod.nombre = nombre; prod.precio = parseFloat(precio);
    prod.tallaS = +tallaS; prod.tallaM = +tallaM; prod.tallaL = +tallaL; prod.tallaXL = +tallaXL;
    prod.stock = +stock;
    res.json({ mensaje:"Producto actualizado" });
});

// ELIMINAR PRODUCTO
app.delete("/productos/:id", verificarToken, (req,res)=>{
    const { id } = req.params;
    const index = productos.findIndex(p=>p.id==id);
    if(index===-1) return res.status(404).json({ error:"Producto no encontrado" });
    productos.splice(index,1);
    res.json({ mensaje:"Producto eliminado" });
});

// COMPRAR PRODUCTO
app.post("/comprar/:id", (req,res)=>{
    const { id } = req.params;
    let { cantidad } = req.body;
    cantidad = parseInt(cantidad)||0;

    const prod = productos.find(p=>p.id==id);
    if(!prod) return res.status(404).json({ error:"Producto no encontrado" });
    if(cantidad>prod.stock) return res.status(400).json({ error:"No hay suficiente stock" });

    prod.stock -= cantidad;
    res.json({ mensaje:"Compra realizada", nuevoStock: prod.stock });
});

// PAGO ONLINE (Stripe)
app.post("/pago", async (req,res)=>{
    try{
        const { monto, descripcion } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(monto*100),
            currency: "usd",
            payment_method_types: ["card"],
            description
        });
        res.json({ clientSecret: paymentIntent.client_secret });
    }catch(err){ res.status(500).json({ error: err.message }); }
});

app.listen(PORT, ()=> console.log(`Servidor corriendo en Render en puerto ${PORT}`));
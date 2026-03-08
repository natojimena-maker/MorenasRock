const express = require("express");
const multer = require("multer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const sql = require("mssql");
const path = require("path");
const fs = require("fs");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 7000;

// Stripe secret key
const stripe = Stripe("TU_SECRET_KEY_DE_STRIPE"); // reemplaza con tu clave

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Carpeta uploads
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Config SQL
const dbConfig = {
    user: "jimena",
    password: "jimena1993",
    server: "localhost",
    database: "MorenasRockDB",
    options: { encrypt: false, trustServerCertificate: true }
};
const pool = new sql.ConnectionPool(dbConfig);
pool.connect().then(()=>console.log("Conectado a SQL Server")).catch(err=>console.log(err));

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

// Multer
const storage = multer.diskStorage({
    destination: (req,file,cb)=> cb(null,"public/uploads"),
    filename: (req,file,cb)=> cb(null, Date.now()+"-"+file.originalname)
});
const upload = multer({ storage });

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
app.get("/productos", async (req,res)=>{
    try{
        const result = await pool.request().query("SELECT * FROM productos");
        res.json(result.recordset);
    }catch(err){ res.status(500).json({ error: err.message }); }
});

// AGREGAR PRODUCTO
app.post("/productos", verificarToken, upload.single("imagen"), async (req,res)=>{
    try{
        let { nombre, precio, tallaS, tallaM, tallaL, tallaXL, stock } = req.body;
        stock = parseInt(stock) || 0;
        if(!req.file) return res.status(400).json({ error:"Imagen requerida" });
        const imagen = "/uploads/" + req.file.filename;
        await pool.request()
            .input("nombre", sql.VarChar, nombre)
            .input("precio", sql.Decimal(10,2), precio)
            .input("tallaS", sql.Int, tallaS)
            .input("tallaM", sql.Int, tallaM)
            .input("tallaL", sql.Int, tallaL)
            .input("tallaXL", sql.Int, tallaXL)
            .input("stock", sql.Int, stock)
            .input("imagen", sql.VarChar, imagen)
            .query(`INSERT INTO productos (nombre, precio, tallaS, tallaM, tallaL, tallaXL, stock, imagen)
                    VALUES (@nombre,@precio,@tallaS,@tallaM,@tallaL,@tallaXL,@stock,@imagen)`);
        res.json({ mensaje:"Producto agregado" });
    }catch(err){ res.status(500).json({ error: err.message }); }
});

// EDITAR PRODUCTO
app.put("/productos/:id", verificarToken, upload.single("imagen"), async (req,res)=>{
    try{
        const { id } = req.params;
        let { nombre, precio, tallaS, tallaM, tallaL, tallaXL, stock } = req.body;
        precio = parseFloat(precio)||0;
        tallaS = parseInt(tallaS)||0;
        tallaM = parseInt(tallaM)||0;
        tallaL = parseInt(tallaL)||0;
        tallaXL = parseInt(tallaXL)||0;
        stock = parseInt(stock)||0;

        let query = `UPDATE productos SET nombre=@nombre, precio=@precio, tallaS=@tallaS, tallaM=@tallaM, tallaL=@tallaL, tallaXL=@tallaXL, stock=@stock`;
        if(req.file) query += `, imagen=@imagen`;
        query += ` WHERE id=@id`;

        const request = pool.request()
            .input("id", sql.Int, id)
            .input("nombre", sql.VarChar, nombre)
            .input("precio", sql.Decimal(10,2), precio)
            .input("tallaS", sql.Int, tallaS)
            .input("tallaM", sql.Int, tallaM)
            .input("tallaL", sql.Int, tallaL)
            .input("tallaXL", sql.Int, tallaXL)
            .input("stock", sql.Int, stock);
        if(req.file) request.input("imagen", sql.VarChar, "/uploads/"+req.file.filename);
        await request.query(query);
        res.json({ mensaje:"Producto actualizado" });
    }catch(err){ res.status(500).json({ error: err.message }); }
});

// ELIMINAR PRODUCTO
app.delete("/productos/:id", verificarToken, async (req,res)=>{
    try{
        const { id } = req.params;
        await pool.request().input("id", sql.Int, id).query("DELETE FROM productos WHERE id=@id");
        res.json({ mensaje:"Producto eliminado" });
    }catch(err){ res.status(500).json({ error: err.message }); }
});

// COMPRAR PRODUCTO (actualiza stock)
app.post("/comprar/:id", async (req,res)=>{
    try{
        const { id } = req.params;
        let { cantidad } = req.body;
        cantidad = parseInt(cantidad)||0;

        const result = await pool.request().input("id", sql.Int, id)
            .query("SELECT stock FROM productos WHERE id=@id");
        if(result.recordset.length===0) return res.status(404).json({ error:"Producto no encontrado" });

        let stockActual = parseInt(result.recordset[0].stock);
        if(cantidad>stockActual) return res.status(400).json({ error:"No hay suficiente stock" });

        stockActual -= cantidad;

        await pool.request()
            .input("id", sql.Int, id)
            .input("stock", sql.Int, stockActual)
            .query("UPDATE productos SET stock=@stock WHERE id=@id");

        res.json({ mensaje:"Compra realizada", nuevoStock:stockActual });
    }catch(err){ res.status(500).json({ error: err.message }); }
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

app.listen(PORT, ()=> console.log(`Servidor corriendo en http://localhost:${PORT}`));
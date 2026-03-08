let token = "";

async function login(){
    const user = document.getElementById("adminUser").value;
    const pass = document.getElementById("adminPass").value;

    const res = await fetch("/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username:user, password:pass })
    });
    const data = await res.json();
    if(data.token){
        token = data.token;
        document.getElementById("adminPanel").style.display="block";
        listarProductos();
    }else{
        alert("Usuario o contraseña incorrectos");
    }
}

// Agregar producto
document.getElementById("formAgregar").addEventListener("submit", async e=>{
    e.preventDefault();
    const formData = new FormData();
    formData.append("nombre", document.getElementById("nombre").value);
    formData.append("precio", document.getElementById("precio").value);
    formData.append("tallaS", document.getElementById("tallaS").value);
    formData.append("tallaM", document.getElementById("tallaM").value);
    formData.append("tallaL", document.getElementById("tallaL").value);
    formData.append("tallaXL", document.getElementById("tallaXL").value);
    formData.append("stock", document.getElementById("stock").value);
    formData.append("imagen", document.getElementById("imagen").files[0]);

    const res = await fetch("/productos",{
        method:"POST",
        headers:{ "Authorization": "Bearer "+token },
        body: formData
    });
    const data = await res.json();
    if(data.mensaje){
        alert("Producto agregado");
        listarProductos();
    }else{
        alert(data.error);
    }
});

// Listar productos
async function listarProductos(){
    const res = await fetch("/productos");
    const productos = await res.json();
    const container = document.getElementById("productosContainer");
    container.innerHTML = "";

    productos.forEach(p=>{
        const div = document.createElement("div");
        div.className = "producto";
        div.innerHTML = `
            <img src="${p.imagen}" alt="${p.nombre}">
            <p>Nombre: <input type="text" value="${p.nombre}" id="nombre-${p.id}"></p>
            <p>Precio: <input type="number" value="${p.precio}" id="precio-${p.id}"></p>
            <p>Tallas: S <input type="number" value="${p.tallaS}" id="tallaS-${p.id}" style="width:35px;">
                      M <input type="number" value="${p.tallaM}" id="tallaM-${p.id}" style="width:35px;">
                      L <input type="number" value="${p.tallaL}" id="tallaL-${p.id}" style="width:35px;">
                      XL <input type="number" value="${p.tallaXL}" id="tallaXL-${p.id}" style="width:35px;"></p>
            <p>Stock: <input type="number" value="${p.stock}" id="stock-${p.id}" style="width:40px;"></p>
            <button onclick="editarProducto(${p.id})">Editar</button>
            <button onclick="eliminarProducto(${p.id})">Eliminar</button>
        `;
        container.appendChild(div);
    });
}

// Editar producto
async function editarProducto(id){
    const nombre = document.getElementById(`nombre-${id}`).value;
    const precio = document.getElementById(`precio-${id}`).value;
    const tallaS = document.getElementById(`tallaS-${id}`).value;
    const tallaM = document.getElementById(`tallaM-${id}`).value;
    const tallaL = document.getElementById(`tallaL-${id}`).value;
    const tallaXL = document.getElementById(`tallaXL-${id}`).value;
    const stock = document.getElementById(`stock-${id}`).value;

    const res = await fetch(`/productos/${id}`,{
        method:"PUT",
        headers:{
            "Content-Type":"application/json",
            "Authorization":"Bearer "+token
        },
        body: JSON.stringify({ nombre, precio, tallaS, tallaM, tallaL, tallaXL, stock })
    });
    const data = await res.json();
    if(data.mensaje){
        alert("Producto actualizado");
        listarProductos();
    }else{
        alert(data.error);
    }
}

// Eliminar producto
async function eliminarProducto(id){
    if(!confirm("¿Seguro quieres eliminar este producto?")) return;
    const res = await fetch(`/productos/${id}`,{
        method:"DELETE",
        headers:{ "Authorization":"Bearer "+token }
    });
    const data = await res.json();
    if(data.mensaje){
        alert("Producto eliminado");
        listarProductos();
    }else{
        alert(data.error);
    }
}
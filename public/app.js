const contenedor = document.getElementById("productos");

fetch("/productos")
.then(res => res.json())
.then(data => {
    data.forEach(p => {
        contenedor.innerHTML += `
            <div class="card">
                <h3>${p.nombre}</h3>
                <p>${p.descripcion}</p>
                <p>$${p.precio}</p>
                <button onclick="agregar('${p.nombre}', ${p.precio})">
                    Agregar
                </button>
            </div>
        `;
    });
});

function agregar(nombre, precio){
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    carrito.push({nombre, precio});
    localStorage.setItem("carrito", JSON.stringify(carrito));
    alert("Agregado al carrito 🖤");
}
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
const lista = document.getElementById("lista");

function mostrar(){
    let total = 0;
    lista.innerHTML = "";

    carrito.forEach((p, index) => {
        total += p.precio;

        lista.innerHTML += `
            <p>${p.nombre} - $${p.precio}
            <button onclick="eliminar(${index})">X</button></p>
        `;
    });

    document.getElementById("total").innerText = "Total: $" + total;
}

function eliminar(index){
    carrito.splice(index,1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    mostrar();
}

function pagar(){
    fetch("/factura",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({carrito})
    })
    .then(res=>res.json())
    .then(data=>{
        alert("Factura generada Total: $" + data.total);
        localStorage.removeItem("carrito");
        location.reload();
    });
}

mostrar();
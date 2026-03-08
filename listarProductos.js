const sql = require("mssql");

const config = {
    user: "jimena",
    password: "jimena1993",
    server: "localhost",
    database: "MorenasRockDB",
    options: { trustServerCertificate: true }
};

sql.connect(config).then(async () => {
    const result = await sql.query("SELECT * FROM productos");
    console.log(result.recordset);
}).catch(err => console.error(err));
const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    user: 'codificador',
    password: 'J4053k123',
    options: { encrypt: true, trustServerCertificate: false }
};

async function seedBudget() {
    try {
        await sql.connect(config);
        const resObr = await sql.query`SELECT id_obra FROM Operaciones.obras WHERE codigo_obra = 'OB-2401'`;
        
        if(resObr.recordset.length > 0) {
            const id = resObr.recordset[0].id_obra;
            console.log('Insertando Partidas para Obra ID:', id);
            
            await sql.query`
                INSERT INTO Operaciones.partidas_presupuestarias 
                (id_obra, codigo_partida, descripcion, id_unidad_medida, cantidad_estimada, precio_unitario)
                VALUES 
                (${id}, '01.01', 'Obras Provisionales y Preliminares', 6, 1, 50000.00),
                (${id}, '02.01', 'Movimiento de Tierras y Excavaciones', 2, 850, 45.00),
                (${id}, '03.01', 'Concreto Armado (Columnas y Vigas)', 2, 420, 580.00),
                (${id}, '04.01', 'Instalaciones Eléctricas Generales', 6, 1, 125000.00),
                (${id}, '05.01', 'Acabados y Pintura Exteriores', 1, 1500, 35.00)
            `;
            console.log('--- PARTIDAS CARGADAS CON ÉXITO ---');
        } else {
            console.log('No se encontró la obra OB-2401');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
seedBudget();

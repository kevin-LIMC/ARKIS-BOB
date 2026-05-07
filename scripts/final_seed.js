const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    user: 'codificador',
    password: 'J4053k123',
    options: { encrypt: true, trustServerCertificate: false }
};

async function finalSeed() {
    try {
        await sql.connect(config);
        const resObr = await sql.query`SELECT TOP 2 id_obra FROM Operaciones.obras ORDER BY id_obra DESC`;
        const o1 = resObr.recordset[0].id_obra;
        const o2 = resObr.recordset[1].id_obra;

        console.log('Insertando Gastos para Dashboard...');
        await sql.query`
            INSERT INTO Finanzas.gastos (id_obra, fecha_gasto, concepto, monto_total, id_forma_pago, estado_gasto, numero_factura)
            VALUES 
            (${o1}, GETDATE(), 'Cemento y Fierro - Fase 1', 25000.00, 2, 2, 'F-999'),
            (${o2}, GETDATE(), 'Mano de Obra Especializada', 12000.00, 1, 2, 'P-888'),
            (${o1}, DATEADD(day, -10, GETDATE()), 'Acero Corrugado', 15000.00, 2, 2, 'F-998')
        `;

        console.log('Insertando Alertas demo...');
        await sql.query`
            INSERT INTO Auditoria.alertas (id_obra, tipo_alerta, titulo, mensaje, id_nivel, leida, fecha_creacion, id_usuario_destino)
            VALUES 
            (${o1}, 'PRESUPUESTO', 'Presupuesto Limite', 'Se ha alcanzado el 80% del presupuesto de materiales.', 3, 0, GETDATE(), 2),
            (${o2}, 'AVANCE', 'Inicio de Excavación', 'Se ha dado inicio a las labores de movimiento de tierras.', 1, 0, GETDATE(), 2)
        `;

        console.log('--- CARGA FINAL COMPLETADA ---');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
finalSeed();

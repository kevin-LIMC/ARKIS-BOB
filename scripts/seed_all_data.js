const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    user: 'codificador',
    password: 'J4053k123',
    options: { encrypt: true, trustServerCertificate: false }
};

async function seed() {
    try {
        await sql.connect(config);
        console.log('--- Iniciando Carga de Datos ---');

        // 1. Clientes
        console.log('Insertando Clientes...');
        await sql.query`
            INSERT INTO Operaciones.clientes (razon_social, ruc, direccion, contacto_nombre, telefono)
            VALUES 
            ('Inmobiliaria Sol Naciente S.A.C.', '20123456789', 'Av. Las Palmas 123', 'Juan Perez', '987654321'),
            ('Centro Comercial Portal Marina', '20876543210', 'Calle Comercio 456', 'Maria Garcia', '999888777')
        `;

        // Obtener IDs de clientes (asumiendo IDs autogenerados)
        const resCli = await sql.query`SELECT TOP 2 id_cliente FROM Operaciones.clientes ORDER BY id_cliente DESC`;
        const cli1 = resCli.recordset[0].id_cliente;
        const cli2 = resCli.recordset[1].id_cliente;

        // 2. Obras
        console.log('Insertando Obras...');
        await sql.query`
            INSERT INTO Operaciones.obras (codigo_obra, nombre_proyecto, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato, fecha_inicio_contrato, direccion)
            VALUES 
            ('OB-2401', 'Edificio Residencial Las Torras', ${cli1}, 1, 2, 5000000, GETDATE(), 'Distrito Financiero Central'),
            ('OB-2402', 'Remodelación Centro Comercial', ${cli2}, 2, 1, 1200000, DATEADD(month, 1, GETDATE()), 'Zona Costera Sur'),
            ('OB-2403', 'Mantenimiento Planta Industrial', ${cli1}, 3, 2, 850000, DATEADD(day, -10, GETDATE()), 'Parque Industrial Norte')
        `;

        const resObr = await sql.query`SELECT TOP 3 id_obra FROM Operaciones.obras ORDER BY id_obra DESC`;
        const obr1 = resObr.recordset[0].id_obra;
        const obr2 = resObr.recordset[1].id_obra;

        // 3. Personal
        console.log('Insertando Trabajadores...');
        await sql.query`
            INSERT INTO Operaciones.trabajadores (dni, nombre_completo, puesto, especialidad, id_tipo_contrato, tarifa_hora, activo)
            VALUES 
            ('12345678', 'Carlos Mendoza Ruiz', 'Residente de Obra', 'Ingeniero Civil', 1, 85.50, 1),
            ('87654321', 'Jorge Lopez Toro', 'Maestro de Obra', 'Albañileria', 1, 35.00, 1),
            ('45678912', 'Miguel Angel Vazquez', 'Peón', 'Ayudante General', 1, 15.00, 1),
            ('98765432', 'Lucía Fernandez', 'Administradora de Obra', 'Contabilidad', 1, 45.00, 1)
        `;

        // 4. Inventario
        console.log('Insertando Inventario...');
        await sql.query`
            INSERT INTO Almacen.materiales (codigo_material, nombre_material, id_unidad_medida, categoria_material, stock_minimo, costo_promedio)
            VALUES 
            ('MAT-001', 'Cemento Portland Tipo I', 4, 'Básico', 100, 25.50),
            ('MAT-002', 'Varilla Corrugada 1/2', 4, 'Hierros', 50, 48.00),
            ('MAT-003', 'Ladrillo King Kong', 6, 'Cerámicos', 1000, 1.20)
        `;

        await sql.query`
            INSERT INTO Equipos.maquinaria (descripcion, placa_identificacion, id_tipo_maquinaria, tarifa_alquiler, estado_operativo)
            VALUES 
            ('Excavadora CAT 320', 'CAT-9988', 1, 150.00, 'OPERATIVO'),
            ('Cargador Frontal Volvo', 'VOL-7712', 1, 180.00, 'MANTENIMIENTO'),
            ('Mezcladora de Concreto 11p3', 'MEZ-4400', 2, 25.00, 'OPERATIVO')
        `;

        // 5. Gastos
        console.log('Insertando Gastos para Dashboard...');
        await sql.query`
            INSERT INTO Finanzas.gastos (id_obra, fecha_gasto, concepto, monto_total, id_forma_pago, estado_gasto, numero_factura)
            VALUES 
            (${obr1}, GETDATE(), 'Compra de 200 bolsas de cemento', 5100.00, 2, 2, 'F001-001'),
            (${obr1}, DATEADD(day, -5, GETDATE()), 'Alquiler de maquinaria pesada', 12500.00, 2, 2, 'F001-002'),
            (${obr2}, DATEADD(day, -2, GETDATE()), 'Pago de planilla semana 15', 45000.00, 1, 2, 'P-001'),
            (${obr1}, DATEADD(day, -1, GETDATE()), 'Compra de agregados (arena y piedra)', 3200.00, 2, 2, 'F001-003'),
            (${obr1}, GETDATE(), 'Suministro de fierro de construcción', 15800.00, 2, 2, 'F001-004')
        `;

        // 6. Alertas
        console.log('Insertando Alertas...');
        await sql.query`
            INSERT INTO Auditoria.alertas (id_obra, tipo_alerta, titulo, mensaje, id_nivel, leida, fecha_creacion, id_usuario_destino)
            VALUES 
            (${obr1}, 'PRESUPUESTO', 'Exceso de Gasto en Cemento', 'El gasto en cemento ha superado el 15% del presupuesto asignado para esta partida.', 3, 0, GETDATE(), 1),
            (${obr2}, 'AVANCE', 'Retraso en Inicio de Obra', 'La obra presenta un retraso de 3 días respecto al cronograma inicial.', 2, 0, GETDATE(), 1)
        `;

        console.log('--- Carga Completa con Éxito ---');
    } catch (e) {
        console.error('ERROR SEEDING:', e);
    } finally {
        process.exit(0);
    }
}

seed();

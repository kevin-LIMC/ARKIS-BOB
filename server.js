const express = require('express');
const path = require('path');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Configuración compatible con Render y Windows
let dbConfig = {
    server: 'localhost',
    database: 'BOB_CONSTRUYE',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    authentication: {
        type: 'default',
        options: { userName: '', password: '' }
    }
};

// En Azure/Render usaremos una cadena de conexión simple
const connectionString = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ENDPOINTS (V2)
// ==========================================

const bcrypt = require('bcrypt'); // Añadir al inicio de los endpoints

// Login real
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT u.*, r.nombre_rol 
            FROM Seguridad.usuarios u
            JOIN Seguridad.roles r ON u.id_rol = r.id_rol
            WHERE u.username = ${username}
        `;
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                delete user.password;
                res.json(user);
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        } else {
            res.status(401).json({ error: 'Usuario no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Obras (con progreso real)
app.get('/api/obras', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                o.*, 
                o.monto_contrato as presupuesto_total,
                c.razon_social as cliente_nombre,
                e.nombre as estado_nombre,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos WHERE id_obra = o.id_obra), 0) as total_gastado
            FROM Operaciones.obras o
            LEFT JOIN Operaciones.clientes c ON o.id_cliente = c.id_cliente
            LEFT JOIN Config.estados_obra e ON o.id_estado_obra = e.id_estado
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear Nueva Obra
app.post('/api/obras', async (req, res) => {
    const { codigo_obra, nombre_proyecto, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Operaciones.obras (codigo_obra, nombre_proyecto, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato)
            VALUES (${codigo_obra}, ${nombre_proyecto}, ${id_cliente}, ${id_tipo_obra}, ${id_estado_obra}, ${monto_contrato})
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Gasto
app.post('/api/gastos', async (req, res) => {
    const { id_obra, fecha_gasto, numero_comprobante, proveedor, concepto, monto_total, id_forma_pago, id_estado_gasto } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Finanzas.gastos (id_obra, fecha_gasto, numero_comprobante, proveedor, concepto, monto_total, id_forma_pago, id_estado_gasto)
            VALUES (${id_obra}, ${fecha_gasto}, ${numero_comprobante}, ${proveedor}, ${concepto}, ${monto_total}, ${id_forma_pago}, ${id_estado_gasto})
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Listado de Gastos
app.get('/api/gastos', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                g.*, 
                o.nombre_proyecto as obra_nombre
            FROM Finanzas.gastos g
            LEFT JOIN Operaciones.obras o ON g.id_obra = o.id_obra
            ORDER BY g.fecha_gasto DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Presupuesto por Obra
app.get('/api/obras/:id/presupuesto', async (req, res) => {
    const { id } = req.params;
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                p.*, 
                u.nombre as unidad_nombre,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos WHERE id_obra = p.id_obra AND concepto LIKE '%' + p.descripcion + '%'), 0) as gastado_real
            FROM Operaciones.partidas_presupuestarias p
            LEFT JOIN Config.unidades_medida u ON p.id_unidad_medida = u.id_unidad
            WHERE p.id_obra = ${id}
            ORDER BY p.codigo_partida
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/*
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
*/

app.listen(port, () => {
    console.log(`BobConstruye V2 corriendo en http://localhost:${port}`);
});

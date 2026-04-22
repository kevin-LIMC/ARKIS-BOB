// ==========================================
// BOB CONSTRUYE V2 - CORE APPLICATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let usuarioActual = null;

function initApp() {
    // Manejo de Login
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (response.ok) {
                    usuarioActual = await response.json();
                    document.getElementById('loginPage').classList.add('hidden');
                    document.getElementById('appContainer').classList.remove('hidden');
                    navegarA('dashboard');
                } else {
                    alert('Usuario o contraseña incorrectos');
                }
            } catch (error) {
                alert('Error de conexión con el servidor');
            }
        });
    }

    // Manejo de Menú Lateral
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                navegarA(page);
            }
        });
    });

    // Cerrar Modal
    const btnClose = document.getElementById('btnCloseModal');
    if(btnClose) {
        btnClose.onclick = () => {
            document.getElementById('modalContainer').classList.add('hidden');
        };
    }

    // Botón Salir
    // Utilidad para formatear moneda
const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.onclick = () => { location.reload(); };
    }
}

function abrirModal(titulo, html) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalContainer').classList.remove('hidden');
}

async function navegarA(pagina) {
    const area = document.getElementById('contentArea');
    const title = document.getElementById('pageTitle');
    const subtitle = document.getElementById('pageSubtitle');
    area.innerHTML = '<div style="padding:50px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    switch(pagina) {
        case 'dashboard':
            title.textContent = 'Dashboard General';
            subtitle.textContent = 'Resumen de actividades y métricas principales';
            renderDashboard();
            break;
        case 'obras':
            title.textContent = 'Gestión de Obras';
            subtitle.textContent = 'Administre y monitoree todas las obras';
            renderObras();
            break;
        case 'gastos':
            title.textContent = 'Registro de Gastos';
            subtitle.textContent = 'Control y seguimiento de todos los gastos';
            renderGastos();
            break;
        case 'presupuesto':
            title.textContent = 'Control de Presupuesto';
            subtitle.textContent = 'Seguimiento por partidas presupuestarias';
            renderPresupuesto();
            break;
        case 'personal':
            title.textContent = 'Gestión de Personal';
            subtitle.textContent = 'Administre su equipo de trabajo y cargos';
            renderPersonal();
            break;
        case 'inventario':
            title.textContent = 'Control de Inventario';
            subtitle.textContent = 'Gestión de materiales y maquinaria pesada';
            renderInventario();
            break;
        case 'reportes':
            title.textContent = 'Reportes Financieros';
            subtitle.textContent = 'Estado consolidado de presupuestos y gastos';
            renderReportes();
            break;
        case 'alertas':
            title.textContent = 'Centro de Alertas';
            subtitle.textContent = 'Notificaciones y avisos del sistema';
            renderAlertas();
            break;
        case 'usuarios':
            title.textContent = 'Gestión de Accesos';
            subtitle.textContent = 'Configuración de usuarios y roles';
            renderUsuarios();
            break;
        default:
            area.innerHTML = `<h3>Sección ${pagina} en construcción</h3>`;
    }
}

// ---------------------------------------------------------
// VISTAS
// ---------------------------------------------------------

async function renderDashboard() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card"><div class="stat-info"><div class="label">Total Gastado</div><div class="value" id="stat_gto">...</div></div><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Presupuesto Total</div><div class="value" id="stat_pre">...</div></div><div class="stat-icon"><i class="fas fa-wallet"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Obras Activas</div><div class="value" id="stat_obr">...</div></div><div class="stat-icon"><i class="fas fa-building"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Alertas Pendientes</div><div class="value" id="stat_ale">...</div></div><div class="stat-icon"><i class="fas fa-bell"></i></div></div>
        </div>
        <div class="charts-grid">
            <div class="card"><h3>Gastos Mensuales</h3><div class="chart-container"><canvas id="chartGastos"></canvas></div></div>
            <div class="card"><h3>Distribución de Presupuesto</h3><div class="chart-container"><canvas id="chartPresupuesto"></canvas></div></div>
        </div>
    `;

    try {
        const res = await fetch('/api/dashboard/stats');
        const stats = await res.json();
        
        document.getElementById('stat_gto').textContent = fmt.format(stats.gasto_total);
        document.getElementById('stat_pre').textContent = fmt.format(stats.presupuesto_total);
        document.getElementById('stat_obr').textContent = stats.total_obras;
        document.getElementById('stat_ale').textContent = stats.total_alertas;
    } catch (err) {
        console.error('Error cargando stats:', err);
    }
    
    setTimeout(() => { initCharts(); }, 150);
}

function renderObras() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <input type="text" placeholder="Buscar..." class="form-control" style="width:300px; padding:8px;">
                <button class="btn btn-primary" id="btnNuevaObra"><i class="fas fa-plus"></i> Nueva Obra</button>
            </div>
            <table>
                <thead><tr><th>Código</th><th>Proyecto</th><th>Ubicación</th><th>Presupuesto</th><th>Gastado</th></tr></thead>
                <tbody id="listaObras"></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevaObra').onclick = mostrarFormObra;
    
    fetch('/api/obras').then(r => r.json()).then(obras => {
        const tbody = document.getElementById('listaObras');
        tbody.innerHTML = obras.map(o => `
            <tr><td>${o.codigo_obra}</td><td><strong>${o.nombre_proyecto}</strong></td><td>${o.ubicacion_exacta || '-'}</td><td>${fmt.format(o.presupuesto_total || 0)}</td><td>${fmt.format(o.total_gastado || 0)}</td></tr>
        `).join('');
    });
}

function renderGastos() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h3>Listado de Gastos</h3>
                <button class="btn btn-primary" id="btnNuevoGasto"><i class="fas fa-plus"></i> Registrar Gasto</button>
            </div>
            <table>
                <thead><tr><th>Fecha</th><th>Obra</th><th>Concepto</th><th>Proveedor</th><th>Monto</th></tr></thead>
                <tbody id="listaGastos"><tr><td colspan="5" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevoGasto').onclick = mostrarFormGasto;

    fetch('/api/gastos').then(r => r.json()).then(gastos => {
        const tbody = document.getElementById('listaGastos');
        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay gastos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = gastos.map(g => {
            const fecha = g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString() : '-';
            return `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${g.obra_nombre || 'S/O'}</strong></td>
                    <td>${g.concepto}</td>
                    <td>${g.proveedor}</td>
                    <td><strong>$${(g.monto_total || 0).toLocaleString()}</strong></td>
                </tr>`;
        }).join('');
    });
}

function renderPresupuesto() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
            <select id="selectObraPres" style="padding:10px; width:300px;">
                <option value="">Seleccione una obra...</option>
            </select>
        </div>
        <div id="presupuestoContent" class="hidden">
            <div class="stats-grid">
                <div class="card stat-card"><div class="stat-info"><div class="label">Presupuesto Total</div><div class="value" id="cardPresTotal"></div></div></div>
                <div class="card stat-card"><div class="stat-info"><div class="label">Gastado Real</div><div class="value" id="cardPresGastado"></div></div></div>
            </div>
            <div class="card" style="margin-top:20px;"><div class="chart-container"><canvas id="chartPresReal"></canvas></div></div>
        </div>
    `;
    
    fetch('/api/obras').then(r => r.json()).then(obras => {
        const sel = document.getElementById('selectObraPres');
        obras.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id_obra; opt.textContent = o.nombre_proyecto;
            sel.appendChild(opt);
        });
        sel.onchange = (e) => {
            if(e.target.value) cargarPresupuesto(e.target.value);
        };
    });
}

async function cargarPresupuesto(id) {
    document.getElementById('presupuestoContent').classList.remove('hidden');
    const res = await fetch(`/api/obras/${id}/presupuesto`);
    const partidas = await res.json();
    let totalP = 0; let totalG = 0;
    partidas.forEach(p => {
        totalP += (p.cantidad_estimada * p.precio_unitario);
        totalG += (p.gastado_real || 0);
    });
    document.getElementById('cardPresTotal').textContent = '$' + totalP.toLocaleString();
    document.getElementById('cardPresGastado').textContent = '$' + totalG.toLocaleString();

    setTimeout(() => {
        const ctx = document.getElementById('chartPresReal');
        if(window.chartP) window.chartP.destroy();
        window.chartP = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: partidas.map(p => p.descripcion),
                datasets: [
                    { label: 'Presupuesto', data: partidas.map(p => p.cantidad_estimada * p.precio_unitario), backgroundColor: '#1a2b4b' },
                    { label: 'Gastado', data: partidas.map(p => p.gastado_real), backgroundColor: '#e67e22' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }, 100);
}

// ---------------------------------------------------------
// FORMULARIOS (POST)
// ---------------------------------------------------------

function mostrarFormObra() {
    const html = `
        <form id="formObra">
            <div class="form-group-modal"><label>Proyecto</label><input type="text" id="fn_nom" required></div>
            <div class="form-group-modal"><label>Código</label><input type="text" id="fn_cod" required></div>
            <div class="form-group-modal"><label>Presupuesto</label><input type="number" id="fn_mon" required></div>
            <button class="btn btn-primary btn-block">Guardar Obra</button>
        </form>
    `;
    abrirModal('Nueva Obra', html);
    document.getElementById('formObra').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            nombre_proyecto: document.getElementById('fn_nom').value,
            codigo_obra: document.getElementById('fn_cod').value,
            monto_contrato: document.getElementById('fn_mon').value,
            id_cliente: 1, id_tipo_obra: 1, id_estado_obra: 1
        };
        await fetch('/api/obras', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
        document.getElementById('modalContainer').classList.add('hidden');
        showToast('Obra registrada exitosamente');
        renderObras();
    };
}

function mostrarFormGasto() {
    const html = `
        <form id="formGasto">
            <div class="form-group-modal"><label>Obra</label><select id="fg_obr" required></select></div>
            <div class="form-group-modal"><label>Concepto</label><input type="text" id="fg_con" required></div>
            <div class="form-group-modal"><label>Monto</label><input type="number" id="fg_mon" required></div>
            <div class="form-group-modal"><label>Proveedor</label><input type="text" id="fg_pro" required></div>
            <button class="btn btn-primary btn-block">Guardar Gasto</button>
        </form>
    `;
    abrirModal('Registrar Gasto', html);
    fetch('/api/obras').then(r => r.json()).then(obras => {
        const sel = document.getElementById('fg_obr');
        obras.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id_obra; opt.textContent = o.nombre_proyecto;
            sel.appendChild(opt);
        });
    });
    document.getElementById('formGasto').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_obra: document.getElementById('fg_obr').value,
            concepto: document.getElementById('fg_con').value,
            monto_total: document.getElementById('fg_mon').value,
            proveedor: document.getElementById('fg_pro').value,
            fecha_gasto: new Date().toISOString().split('T')[0],
            numero_comprobante: 'TMP-' + Date.now(), id_forma_pago: 1, id_estado_gasto: 1
        };
        await fetch('/api/gastos', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
        document.getElementById('modalContainer').classList.add('hidden');
        showToast('Gasto registrado exitosamente');
        renderGastos();
    };
}
function renderReportes() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h3>Estado Financiero por Obra</h3>
                <button class="btn btn-primary" id="btnExportPDF"><i class="fas fa-file-pdf"></i> Descargar PDF</button>
            </div>
            <div id="reporteTablaWrapper">
                <table id="tablaReporte">
                    <thead>
                        <tr><th>Código</th><th>Proyecto</th><th>Presupuesto</th><th>Gasto Total</th><th>Saldo</th></tr>
                    </thead>
                    <tbody id="bodyReporte"><tr><td colspan="5" style="text-align:center">Cargando datos financieros...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('btnExportPDF').onclick = exportarPDF;

    fetch('/api/reportes/financiero').then(r => r.json()).then(data => {
        const tbody = document.getElementById('bodyReporte');
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay datos suficientes para generar el reporte</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.codigo_obra}</td>
                <td><strong>${r.nombre_proyecto}</strong></td>
                <td>${fmt.format(r.presupuesto)}</td>
                <td style="color:red;">${fmt.format(r.gasto_total)}</td>
                <td style="color:${r.saldo < 0 ? 'red' : 'green'}; font-weight:bold;">${fmt.format(r.saldo)} ${r.saldo < 0 ? '⚠️' : '✅'}</td>
            </tr>
        `).join('');
    });
}

function exportarPDF() {
    const element = document.getElementById('reporteTablaWrapper');
    const opt = {
        margin: 10,
        filename: `reporte_financiero_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
    showToast('Generando documento PDF...');
}

function renderAlertas() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <h3>Historial de Alertas</h3>
            <div id="listaAlertas" style="margin-top:20px;">Cargando...</div>
        </div>
    `;
    fetch('/api/alertas').then(r => r.json()).then(alertas => {
        const div = document.getElementById('listaAlertas');
        if(alertas.length === 0) {
            div.innerHTML = '<p style="text-align:center; padding:20px;">No hay alertas en el historial</p>';
            return;
        }
        div.innerHTML = alertas.map(a => `
            <div class="alert-item" style="padding:15px; border-left:4px solid ${a.id_nivel === 3 ? '#e74c3c' : '#f1c40f'}; margin-bottom:10px; background:#f9f9f9;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${a.titulo}</strong>
                    <small>${new Date(a.fecha_creacion).toLocaleString()}</small>
                </div>
                <p style="margin:5px 0;">${a.mensaje}</p>
                <small style="color:#666;">Obra: ${a.obra_nombre || 'General'}</small>
            </div>
        `).join('');
    });
}

function renderUsuarios() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <table>
                <thead><tr><th>ID</th><th>Usuario</th><th>Nombre Completo</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead>
                <tbody id="listaUsuarios"></tbody>
            </table>
        </div>
    `;
    fetch('/api/usuarios').then(r => r.json()).then(data => {
        const tbody = document.getElementById('listaUsuarios');
        tbody.innerHTML = data.map(u => `
            <tr>
                <td>${u.id_usuario}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.nombre_completo}</td>
                <td>${u.correo}</td>
                <td><span class="badge" style="background:#1a2b4b; color:white;">${u.nombre_rol}</span></td>
                <td>${u.activo ? '<span style="color:green">● Activo</span>' : '<span style="color:red">● Inactivo</span>'}</td>
            </tr>
        `).join('');
    });
}

function showToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 100);
    setTimeout(() => { 
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
function renderInventario() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div class="tabs-container" style="margin-bottom:20px; border-bottom:1px solid #ddd;">
                <button class="tab-btn active" id="tabMat" style="padding:10px 20px; cursor:pointer;">Materiales</button>
                <button class="tab-btn" id="tabMaq" style="padding:10px 20px; cursor:pointer;">Maquinaria</button>
            </div>
            <div id="invContent">
                <table id="tablaInv">
                    <thead id="headInv"></thead>
                    <tbody id="bodyInv"><tr><td style="text-align:center">Cargando...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    const tabMat = document.getElementById('tabMat');
    const tabMaq = document.getElementById('tabMaq');

    const cargarMateriales = () => {
        tabMat.classList.add('active'); tabMaq.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Código</th><th>Material</th><th>Categoría</th><th>Stock Mín.</th><th>Costo Prom.</th></tr>';
        fetch('/api/inventario/materiales').then(r => r.json()).then(data => {
            const tbody = document.getElementById('bodyInv');
            if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay materiales registrados</td></tr>'; return; }
            tbody.innerHTML = data.map(m => `
                <tr><td>${m.codigo_material}</td><td><strong>${m.nombre_material}</strong></td><td>${m.categoria_material}</td><td>${m.stock_minimo}</td><td>${fmt.format(m.costo_promedio)}</td></tr>
            `).join('');
        });
    };

    const cargarMaquinaria = () => {
        tabMaq.classList.add('active'); tabMat.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Placa</th><th>Descripción</th><th>Estado</th><th>Tarifa Alquiler</th></tr>';
        fetch('/api/inventario/maquinaria').then(r => r.json()).then(data => {
            const tbody = document.getElementById('bodyInv');
            if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No hay maquinaria registrada</td></tr>'; return; }
            tbody.innerHTML = data.map(m => `
                <tr><td>${m.placa_identificacion}</td><td><strong>${m.descripcion}</strong></td><td><span class="badge">${m.estado_operativo}</span></td><td>${fmt.format(m.tarifa_alquiler)}</td></tr>
            `).join('');
        });
    };

    tabMat.onclick = cargarMateriales;
    tabMaq.onclick = cargarMaquinaria;

    cargarMateriales(); // Por defecto
}

function renderPersonal() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <input type="text" placeholder="Buscar trabajador..." class="form-control" style="width:300px; padding:8px;">
                <button class="btn btn-primary" id="btnNuevoTrabajador"><i class="fas fa-plus"></i> Nuevo Trabajador</button>
            </div>
            <table>
                <thead><tr><th>DNI</th><th>Nombre Completo</th><th>Puesto</th><th>Especialidad</th><th>Tarifa/Hr</th><th>Teléfono</th></tr></thead>
                <tbody id="listaPersonal"><tr><td colspan="6" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevoTrabajador').onclick = mostrarFormPersonal;

    fetch('/api/personal').then(r => r.json()).then(empleados => {
        const tbody = document.getElementById('listaPersonal');
        if(empleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay personal registrado</td></tr>';
            return;
        }
        tbody.innerHTML = empleados.map(e => `
            <tr>
                <td>${e.dni}</td>
                <td><strong>${e.nombre_completo}</strong></td>
                <td>${e.puesto}</td>
                <td>${e.especialidad || '-'}</td>
                <td>${fmt.format(e.tarifa_hora)}</td>
                <td>${e.telefono || '-'}</td>
            </tr>
        `).join('');
    });
}

function mostrarFormPersonal() {
    const html = `
        <form id="formPersonal">
            <div class="form-group-modal"><label>DNI / Identificación</label><input type="text" id="fp_dni" required></div>
            <div class="form-group-modal"><label>Nombre Completo</label><input type="text" id="fp_nom" required></div>
            <div class="form-group-modal"><label>Puesto / Cargo</label><input type="text" id="fp_pue" required></div>
            <div class="form-group-modal"><label>Especialidad</label><input type="text" id="fp_esp"></div>
            <div class="form-group-modal"><label>Tarifa por Hora</label><input type="number" id="fp_tar" required></div>
            <div class="form-group-modal"><label>Teléfono</label><input type="text" id="fp_tel"></div>
            <button class="btn btn-primary btn-block">Registrar Trabajador</button>
        </form>
    `;
    abrirModal('Nuevo Trabajador', html);
    document.getElementById('formPersonal').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            dni: document.getElementById('fp_dni').value,
            nombre_completo: document.getElementById('fp_nom').value,
            puesto: document.getElementById('fp_pue').value,
            especialidad: document.getElementById('fp_esp').value,
            tarifa_hora: document.getElementById('fp_tar').value,
            telefono: document.getElementById('fp_tel').value
        };
        await fetch('/api/personal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        document.getElementById('modalContainer').classList.add('hidden');
        renderPersonal();
    };
}

// ---------------------------------------------------------
// CHARTS
// ---------------------------------------------------------
function initCharts() {
    const c1 = document.getElementById('chartGastos');
    if(c1) {
        new Chart(c1, { type: 'bar', data: { labels: [], datasets: [{ label: 'Gastos $', data: [], backgroundColor: '#1a2b4b' }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    const c2 = document.getElementById('chartPresupuesto');
    if(c2) {
        new Chart(c2, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#e67e22', '#1a2b4b', '#95a5a6', '#34495e'] }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
}

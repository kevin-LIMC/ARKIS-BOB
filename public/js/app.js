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
        default:
            area.innerHTML = `<h3>Sección ${pagina} en construcción</h3>`;
    }
}

// ---------------------------------------------------------
// VISTAS
// ---------------------------------------------------------

function renderDashboard() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card"><div class="stat-info"><div class="label">Total Gastado</div><div class="value">$4,935,000</div></div><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Presupuesto Disponible</div><div class="value">$2,565,000</div></div><div class="stat-icon"><i class="fas fa-wallet"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Obras Activas</div><div class="value">12</div></div><div class="stat-icon"><i class="fas fa-building"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Alertas Pendientes</div><div class="value">8</div></div><div class="stat-icon"><i class="fas fa-bell"></i></div></div>
        </div>
        <div class="charts-grid">
            <div class="card"><h3>Gastos Mensuales</h3><div class="chart-container"><canvas id="chartGastos"></canvas></div></div>
            <div class="card"><h3>Distribución de Presupuesto</h3><div class="chart-container"><canvas id="chartPresupuesto"></canvas></div></div>
        </div>
    `;
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
            <tr><td>${o.codigo_obra}</td><td><strong>${o.nombre_proyecto}</strong></td><td>${o.ubicacion_exacta || '-'}</td><td>$${(o.presupuesto_total || 0).toLocaleString()}</td><td>$${(o.total_gastado || 0).toLocaleString()}</td></tr>
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
        renderGastos();
    };
}

// ---------------------------------------------------------
// CHARTS
// ---------------------------------------------------------
function initCharts() {
    const c1 = document.getElementById('chartGastos');
    if(c1) {
        new Chart(c1, { type: 'bar', data: { labels: ['Ene','Feb','Mar','Abr','May','Jun'], datasets: [{ label: 'Gastos $', data: [45,52,48,61,55,68], backgroundColor: '#1a2b4b' }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    const c2 = document.getElementById('chartPresupuesto');
    if(c2) {
        new Chart(c2, { type: 'doughnut', data: { labels: ['Mano Obra','Materiales','Equipos','Otros'], datasets: [{ data: [30,45,15,10], backgroundColor: ['#e67e22', '#1a2b4b', '#95a5a6', '#34495e'] }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
}

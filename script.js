// script.js atualizado para filtros e gráficos dinâmicos no painel de relatórios

const db = firebase.firestore();
let comparativoChart, categoriasChart;

firebase.auth().onAuthStateChanged(user => {
  if (!user) return (window.location.href = "index.html");
  carregarCategorias(user.uid);
});

async function carregarCategorias(uid) {
  const vendasSnap = await db.collection("vendas").where("uid", "==", uid).get();
  const gastosSnap = await db.collection("gastos").where("uid", "==", uid).get();

  const categoriasVenda = new Set(), categoriasGasto = new Set();
  vendasSnap.forEach(doc => categoriasVenda.add(doc.data().categoria || "Outros"));
  gastosSnap.forEach(doc => categoriasGasto.add(doc.data().categoria || "Outros"));

  const vendaSelect = document.getElementById("categoriaVenda");
  const gastoSelect = document.getElementById("categoriaGasto");

  if (vendaSelect && gastoSelect) {
    vendaSelect.innerHTML = '<option value="todas">Todas</option>';
    gastoSelect.innerHTML = '<option value="todas">Todas</option>';

    categoriasVenda.forEach(c => vendaSelect.innerHTML += `<option value="${c}">${c}</option>`);
    categoriasGasto.forEach(c => gastoSelect.innerHTML += `<option value="${c}">${c}</option>`);
  }
}

async function aplicarFiltros() {
  const user = firebase.auth().currentUser;
  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;
  const catVenda = document.getElementById("categoriaVenda").value;
  const catGasto = document.getElementById("categoriaGasto").value;

  const vendasSnap = await db.collection("vendas").where("uid", "==", user.uid).get();
  const gastosSnap = await db.collection("gastos").where("uid", "==", user.uid).get();

  let vendas = [], gastos = [];
  vendasSnap.forEach(doc => {
    const d = doc.data();
    const data = new Date(d.data);
    if (
      (!inicio || new Date(inicio) <= data) &&
      (!fim || data <= new Date(fim)) &&
      (catVenda === "todas" || d.categoria === catVenda)
    ) vendas.push(d);
  });
  gastosSnap.forEach(doc => {
    const d = doc.data();
    const data = new Date(d.data);
    if (
      (!inicio || new Date(inicio) <= data) &&
      (!fim || data <= new Date(fim)) &&
      (catGasto === "todas" || d.categoria === catGasto)
    ) gastos.push(d);
  });

  atualizarGraficos(vendas, gastos);
  mostrarResumo(vendas, gastos);
}

function atualizarGraficos(vendas, gastos) {
  const lucroPorDia = Array(7).fill(0), gastoPorDia = Array(7).fill(0);
  const categoriasGasto = {};

  vendas.forEach(v => {
    const d = new Date(v.data).getDay();
    lucroPorDia[d] += v.valor;
  });
  gastos.forEach(g => {
    const d = new Date(g.data).getDay();
    gastoPorDia[d] += g.valor;
    const cat = g.categoria || 'Outros';
    categoriasGasto[cat] = (categoriasGasto[cat] || 0) + g.valor;
  });

  if (comparativoChart) comparativoChart.destroy();
  if (categoriasChart) categoriasChart.destroy();

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  comparativoChart = new Chart(document.getElementById('comparativoChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: diasSemana,
      datasets: [
        { label: 'Lucro (R$)', data: lucroPorDia, borderColor: '#2e7d32', fill: true, backgroundColor: 'rgba(46, 125, 50, 0.2)' },
        { label: 'Gastos (R$)', data: gastoPorDia, borderColor: '#c62828', fill: true, backgroundColor: 'rgba(198, 40, 40, 0.2)' }
      ]
    }
  });

  categoriasChart = new Chart(document.getElementById('categoriasChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: Object.keys(categoriasGasto),
      datasets: [{
        label: 'Gasto total (R$)',
        data: Object.values(categoriasGasto),
        backgroundColor: '#2962ff'
      }]
    }
  });
}

function mostrarResumo(vendas, gastos) {
  const totalVendas = vendas.reduce((s, v) => s + v.valor, 0);
  const totalGastos = gastos.reduce((s, g) => s + g.valor, 0);
  const lucro = totalVendas - totalGastos;
  const ticketMedio = vendas.length ? (totalVendas / vendas.length).toFixed(2) : 0;
  const gastoMedio = gastos.length ? (totalGastos / gastos.length).toFixed(2) : 0;

  document.getElementById("resumoBox").innerHTML = `
    <div class="info-box">
      <h3>Resumo Financeiro</h3>
      <p><strong>Vendas:</strong> R$ ${totalVendas.toFixed(2)} (${vendas.length} registros)</p>
      <p><strong>Gastos:</strong> R$ ${totalGastos.toFixed(2)} (${gastos.length} registros)</p>
      <p><strong>Lucro Líquido:</strong> R$ ${lucro.toFixed(2)}</p>
      <p><strong>Ticket Médio:</strong> R$ ${ticketMedio}</p>
      <p><strong>Gasto Médio:</strong> R$ ${gastoMedio}</p>
    </div>
  `;
}

function logout() {
  firebase.auth().signOut().then(() => window.location.href = "index.html");
}

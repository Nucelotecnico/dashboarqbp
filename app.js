// Estado global da aplicação
let listaColaboradores = [];
let dadosFiltrados = [];

let cargoChart;
let cidadeChart;
let nivelChart;
let faixaChart;

const PALETA_CORES = [
    "#0078d4", "#00b894", "#e17055", "#6c5ce7", "#fdcb6e",
    "#e84393", "#00cec9", "#ff7675", "#a29bfe", "#ffeaa7",
    "#fab1a0", "#74b9ff", "#55efc4", "#81ecec", "#636e72",
    "#2d3436", "#0984e3", "#f39c12", "#27ae60", "#8e44ad",
    "#16a085", "#d35400", "#c0392b", "#2c3e50"
];

function obterCores(quantidade){
    let cores = [];
    for(let i = 0; i < quantidade; i++){
        cores.push(PALETA_CORES[i % PALETA_CORES.length]);
    }
    return cores;
}

// Analisador do formato TSV de colaboradores.txt
function parsearColaboradoresTxt(texto){
    if (!texto) return [];
    const linhas = texto.split(/\r?\n/).filter(linha => linha.trim().length > 0);
    if (linhas.length <= 1) return [];

    const cabecalho = linhas[0].split("\t").map(h => h.trim().toLowerCase());

    const idxMatricula = cabecalho.findIndex(h => h.includes("matricula"));
    const idxNome = cabecalho.findIndex(h => h.includes("nome"));
    const idxCargo = cabecalho.findIndex(h => h.includes("cargo"));
    const idxNivel = cabecalho.findIndex(h => h.includes("nivel"));
    const idxFaixa = cabecalho.findIndex(h => h.includes("faixa"));
    const idxInicio = cabecalho.findIndex(h => h.includes("inicio"));
    const idxFim = cabecalho.findIndex(h => h.includes("fim"));
    const idxSuper = cabecalho.findIndex(h => h.includes("super"));
    const idxGerencia = cabecalho.findIndex(h => h.includes("gerencia"));
    const idxCidade = cabecalho.findIndex(h => h.includes("cidade"));

    const lista = [];
    for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i].split("\t");
        if (cols.length < 2) continue;

        lista.push({
            matricula: (cols[idxMatricula] || "").trim(),
            nome: (cols[idxNome] || "").trim(),
            cargo: (cols[idxCargo] || "").trim(),
            nivel: (cols[idxNivel] || "").trim(),
            faixa: (cols[idxFaixa] || "").trim(),
            inicio: (cols[idxInicio] || "").trim(),
            fim: (cols[idxFim] || "").trim(),
            superintendencia: (cols[idxSuper] || "").trim(),
            gerencia: (cols[idxGerencia] || "").trim(),
            cidade: (cols[idxCidade] || "").trim()
        });
    }
    return lista;
}

// Inicialização da aplicação e carregamento de colaboradores.txt
async function inicializarAplicacao(){
    configurarEventos();

    const statusOrigem = document.getElementById("statusOrigem");
    const btnSelecionar = document.getElementById("btnSelecionarArquivo");

    try {
        const resp = await fetch("colaboradores.txt");
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const texto = await resp.text();
        listaColaboradores = parsearColaboradoresTxt(texto);

        if (listaColaboradores.length > 0) {
            if (statusOrigem) {
                statusOrigem.textContent = `Fonte: colaboradores.txt (${listaColaboradores.length} registros)`;
            }
            carregarDados(listaColaboradores);
            return;
        }
        throw new Error("Arquivo colaboradores.txt vazio ou formato inválido");
    } catch (err) {
        console.warn("Leitura direta de colaboradores.txt não foi possível:", err);

        // Fallback 1: se dados.js foi carregado no escopo
        if (typeof colaboradores !== "undefined" && Array.isArray(colaboradores) && colaboradores.length > 0) {
            listaColaboradores = [...colaboradores];
            if (statusOrigem) {
                statusOrigem.textContent = `Fonte: dados.js (${listaColaboradores.length} registros)`;
            }
            if (btnSelecionar) btnSelecionar.style.display = "inline-block";
            carregarDados(listaColaboradores);
            return;
        }

        // Fallback 2: exibe botão para seleção manual caso fetch local seja bloqueado pelo navegador
        if (statusOrigem) {
            statusOrigem.textContent = "Selecione o arquivo colaboradores.txt";
        }
        if (btnSelecionar) {
            btnSelecionar.style.display = "inline-block";
        }
    }
}

function carregarDados(dados){
    listaColaboradores = dados;
    dadosFiltrados = [...dados];
    carregarFiltros();
    atualizarDashboard();
}

function obterTipoColaborador(cargo){
    const c = (cargo || "").toLowerCase();
    if (c.includes("eng.") || c.includes("engenheiro")) {
        return "ENGENHEIROS";
    }
    if (c.includes("téc.") || c.includes("tec.") || c.includes("técnico") || c.includes("tecnico")) {
        return "TECNICO";
    }
    if (c.includes("gerente") || c.includes("supervisor") || c.includes("superintendente") || c.includes("gestor") || c.includes("coordenador") || c.includes("lider")) {
        return "LIDERANCAS";
    }
    return "OUTROS";
}

function configurarEventos(){
    const inputPesquisa = document.getElementById("pesquisa");
    const selectGerencia = document.getElementById("filtroGerencia");
    const selectCidade = document.getElementById("filtroCidade");
    const selectTipo = document.getElementById("filtroTipo");
    const inputArquivo = document.getElementById("inputArquivo");

    if (inputPesquisa) inputPesquisa.addEventListener("keyup", aplicarFiltros);
    if (selectGerencia) selectGerencia.addEventListener("change", aplicarFiltros);
    if (selectCidade) selectCidade.addEventListener("change", aplicarFiltros);
    if (selectTipo) selectTipo.addEventListener("change", aplicarFiltros);

    if (inputArquivo) {
        inputArquivo.addEventListener("change", (e) => {
            const arquivo = e.target.files && e.target.files[0];
            if (!arquivo) return;

            const reader = new FileReader();
            reader.onload = (evento) => {
                const texto = evento.target.result;
                const dados = parsearColaboradoresTxt(texto);
                if (dados.length > 0) {
                    const statusOrigem = document.getElementById("statusOrigem");
                    if (statusOrigem) {
                        statusOrigem.textContent = `Fonte: ${arquivo.name} (${dados.length} registros)`;
                    }
                    carregarDados(dados);
                } else {
                    alert("O arquivo selecionado não contém dados válidos de colaboradores.");
                }
            };
            reader.readAsText(arquivo, "UTF-8");
        });
    }
}

function carregarFiltros(){
    const gerencias = [...new Set(listaColaboradores.map(c => c.gerencia).filter(Boolean))].sort();
    const cidades = [...new Set(listaColaboradores.map(c => c.cidade).filter(Boolean))].sort();

    const selectGerencia = document.getElementById("filtroGerencia");
    const selectCidade = document.getElementById("filtroCidade");

    if (selectGerencia) {
        selectGerencia.innerHTML = '<option value="">Todas as Gerências</option>' +
            gerencias.map(g => `<option value="${g}">${g}</option>`).join("");
    }
    if (selectCidade) {
        selectCidade.innerHTML = '<option value="">Todas as Cidades</option>' +
            cidades.map(c => `<option value="${c}">${c}</option>`).join("");
    }
}

function aplicarFiltros(){
    const gerencia = document.getElementById("filtroGerencia") ? document.getElementById("filtroGerencia").value : "";
    const cidade = document.getElementById("filtroCidade") ? document.getElementById("filtroCidade").value : "";
    const tipo = document.getElementById("filtroTipo") ? document.getElementById("filtroTipo").value : "";
    const texto = document.getElementById("pesquisa") ? document.getElementById("pesquisa").value.toLowerCase().trim() : "";

    dadosFiltrados = listaColaboradores.filter(item => {
        const filtroGerencia = !gerencia || item.gerencia === gerencia;
        const filtroCidade = !cidade || item.cidade === cidade;
        const filtroTipo = !tipo || obterTipoColaborador(item.cargo) === tipo;
        const filtroPesquisa = !texto ||
            (item.nome || "").toLowerCase().includes(texto) ||
            (item.cargo || "").toLowerCase().includes(texto) ||
            (item.matricula || "").toString().toLowerCase().includes(texto);

        return filtroGerencia && filtroCidade && filtroTipo && filtroPesquisa;
    });

    atualizarDashboard();
}

function atualizarDashboard(){
    atualizarKPIs();
    atualizarTabela();
    atualizarRanking();
    atualizarGraficos();
}

function atualizarKPIs(){
    const totalEl = document.getElementById("totalColaboradores");
    if (totalEl) totalEl.textContent = dadosFiltrados.length;

    const engenheiros = dadosFiltrados.filter(x =>
        (x.cargo || "").includes("Eng.")
    );

    const tecnicos = dadosFiltrados.filter(x =>
        (x.cargo || "").includes("Téc.") || (x.cargo || "").includes("Tec.")
    );

    const lideres = dadosFiltrados.filter(x => {
        const c = (x.cargo || "").toLowerCase();
        return c.includes("gerente") ||
               c.includes("supervisor") ||
               c.includes("superintendente") ||
               c.includes("gestor") ||
               c.includes("coordenador");
    });

    const engEl = document.getElementById("totalEngenheiros");
    if (engEl) engEl.textContent = engenheiros.length;

    const tecEl = document.getElementById("totalTecnicos");
    if (tecEl) tecEl.textContent = tecnicos.length;

    const lidEl = document.getElementById("totalLider");
    if (lidEl) lidEl.textContent = lideres.length;
}

function atualizarTabela(){
    const tbody = document.querySelector("#colaboradores tbody");
    if (!tbody) return;

    tbody.innerHTML = dadosFiltrados.map(item => `
        <tr>
            <td>${item.matricula || ""}</td>
            <td>${item.nome || ""}</td>
            <td>${item.cargo || ""}</td>
            <td>${item.nivel || ""}</td>
            <td>${item.faixa || ""}</td>
            <td>${item.cidade || ""}</td>
            <td>${item.gerencia || ""}</td>
        </tr>
    `).join("");
}

function atualizarRanking(){
    const cidades = contar("cidade");
    const ranking = Object.entries(cidades).sort((a,b) => b[1] - a[1]);
    const tbody = document.querySelector("#rankingTabela tbody");
    if (!tbody) return;

    tbody.innerHTML = ranking.map(item => `
        <tr>
            <td>${item[0]}</td>
            <td>${item[1]}</td>
        </tr>
    `).join("");
}

function contar(campo){
    let resultado = {};
    dadosFiltrados.forEach(item => {
        let valor = (item[campo] || "").trim() || "Não informado";
        resultado[valor] = (resultado[valor] || 0) + 1;
    });
    return resultado;
}

function renderizarGraficoFallback(canvasId, dadosObj, corPadrao){
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const entradas = Object.entries(dadosObj).sort((a,b) => b[1] - a[1]);
    const max = Math.max(...entradas.map(e => e[1]), 1);

    container.innerHTML = `
        <div class="chart-fallback-list">
            ${entradas.map((e, idx) => {
                const percent = Math.round((e[1] / max) * 100);
                const cor = Array.isArray(corPadrao) ? corPadrao[idx % corPadrao.length] : corPadrao;
                return `
                <div class="chart-fallback-item">
                    <div class="chart-fallback-header">
                        <span><strong>${e[0]}</strong></span>
                        <span>${e[1]}</span>
                    </div>
                    <div class="chart-fallback-bar-bg">
                        <div class="chart-fallback-bar-fill" style="width:${percent}%; background:${cor};"></div>
                    </div>
                </div>`;
            }).join("")}
        </div>
    `;
}

// Plugin customizado para exibir o valor no topo/ponta externa de cada barra
const pluginValoresNoTopo = {
    id: "valoresNoTopo",
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const isHorizontal = chart.options.indexAxis === "y";
        const pluginOpts = chart.options.plugins?.valoresNoTopo || {};
        const exibirPercentual = !!pluginOpts.exibirPercentual;

        ctx.save();
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta.hidden) return;

            const total = dataset.data.reduce((acc, v) => acc + (Number(v) || 0), 0);

            meta.data.forEach((element, index) => {
                const valor = dataset.data[index];
                if (valor === undefined || valor === null || valor === "") return;

                const perc = total > 0 ? ((Number(valor) / total) * 100).toFixed(1).replace(".", ",") + "%" : "0%";

                if (isHorizontal) {
                    // Barra horizontal: valor à direita da ponta externa da barra
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    const x = element.x + 6;
                    const y = element.y;

                    if (exibirPercentual) {
                        ctx.fillStyle = "#2c3e50";
                        ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                        ctx.fillText(`${valor} (${perc})`, x, y);
                    } else {
                        ctx.fillStyle = "#2c3e50";
                        ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                        ctx.fillText(valor, x, y);
                    }
                } else {
                    // Barra vertical: valor no topo externo da barra
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    const x = element.x;
                    const y = element.y - 4;

                    if (exibirPercentual) {
                        // Linha 1: Valor absoluto (em negrito)
                        ctx.fillStyle = "#2c3e50";
                        ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                        ctx.fillText(valor, x, y - 14);

                        // Linha 2: Percentual (em cinza médio)
                        ctx.fillStyle = "#636e72";
                        ctx.font = "600 10px 'Segoe UI', Arial, sans-serif";
                        ctx.fillText(`(${perc})`, x, y);
                    } else {
                        ctx.fillStyle = "#2c3e50";
                        ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                        ctx.fillText(valor, x, y);
                    }
                }
            });
        });
        ctx.restore();
    }
};

function atualizarGraficos(){
    const cargos = contar("cargo");
    const cidades = contar("cidade");
    const niveis = contar("nivel");
    const faixas = contar("faixa");

    if (typeof Chart === "undefined") {
        renderizarGraficoFallback("cargoChart", cargos, "#0078d4");
        renderizarGraficoFallback("cidadeChart", cidades, "#e17055");
        renderizarGraficoFallback("nivelChart", niveis, "#6c5ce7");
        renderizarGraficoFallback("faixaChart", faixas, "#00b894");
        return;
    }

    if (cargoChart) cargoChart.destroy();
    if (cidadeChart) cidadeChart.destroy();
    if (nivelChart) nivelChart.destroy();
    if (faixaChart) faixaChart.destroy();

    // 1. Gráfico de Cargos (Eixos Invertidos: Barras Horizontais com altura dinâmica)
    const canvasCargo = document.getElementById("cargoChart");
    if (canvasCargo) {
        const totalItensCargo = Object.keys(cargos).length;
        // Aloca 34px por cargo para garantir espaçamento confortável dos nomes
        const alturaCargo = Math.max(380, totalItensCargo * 34 + 60);
        if (canvasCargo.parentElement) {
            canvasCargo.parentElement.style.height = `${alturaCargo}px`;
        }

        cargoChart = new Chart(canvasCargo, {
            type: "bar",
            data: {
                labels: Object.keys(cargos),
                datasets: [{
                    label: "Quantidade",
                    data: Object.values(cargos),
                    backgroundColor: "#0078d4",
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { right: 35, top: 10, bottom: 10 }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grace: "12%",
                        ticks: { precision: 0 }
                    },
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 12 }
                        }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }

    // 2. Gráfico de Cidades (Eixos Invertidos: Barras Horizontais com altura dinâmica)
    const canvasCidade = document.getElementById("cidadeChart");
    if (canvasCidade) {
        const totalItensCidade = Object.keys(cidades).length;
        // Aloca 32px por cidade para garantir legibilidade dos municípios
        const alturaCidade = Math.max(380, totalItensCidade * 32 + 60);
        if (canvasCidade.parentElement) {
            canvasCidade.parentElement.style.height = `${alturaCidade}px`;
        }

        cidadeChart = new Chart(canvasCidade, {
            type: "bar",
            data: {
                labels: Object.keys(cidades),
                datasets: [{
                    label: "Quantidade",
                    data: Object.values(cidades),
                    backgroundColor: "#e17055",
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { right: 35, top: 10, bottom: 10 }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grace: "12%",
                        ticks: { precision: 0 }
                    },
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 12 }
                        }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }

    // 3. Gráfico de Níveis (Barras com Valor Absoluto e Percentual)
    const canvasNivel = document.getElementById("nivelChart");
    if (canvasNivel) {
        const labelsNivel = Object.keys(niveis);
        nivelChart = new Chart(canvasNivel, {
            type: "bar",
            data: {
                labels: labelsNivel,
                datasets: [{
                    label: "Quantidade",
                    data: Object.values(niveis),
                    backgroundColor: "#6c5ce7",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 32 }
                },
                plugins: {
                    legend: { display: false },
                    valoresNoTopo: {
                        exibirPercentual: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = Number(context.raw) || 0;
                                const total = context.dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
                                const perc = total > 0 ? ((val / total) * 100).toFixed(1).replace(".", ",") + "%" : "0%";
                                return ` Colaboradores: ${val} (${perc})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: "18%",
                        ticks: { precision: 0 }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }

    // 4. Gráfico de Faixas (Barras)
    const canvasFaixa = document.getElementById("faixaChart");
    if (canvasFaixa) {
        faixaChart = new Chart(canvasFaixa, {
            type: "bar",
            data: {
                labels: Object.keys(faixas),
                datasets: [{
                    label: "Quantidade",
                    data: Object.values(faixas),
                    backgroundColor: "#00b894",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 22 }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: "12%",
                        ticks: { precision: 0 }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }
}

// Inicia o carregamento assim que o DOM estiver pronto
window.addEventListener("DOMContentLoaded", inicializarAplicacao);

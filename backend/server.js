const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../'));

// ===== FUNÇÕES PARA GERAR FIGURAS GEOMÉTRICAS =====
function gerarCirculo(pintadas, partes) {
    const cx = 50, cy = 50, raio = 45;
    const anguloPorParte = 360 / partes;
    let pathD = '';
    for (let i = 0; i < partes; i++) {
        const anguloInicio = i * anguloPorParte;
        const anguloFim = (i + 1) * anguloPorParte;
        const x1 = cx + raio * Math.sin(anguloInicio * Math.PI / 180);
        const y1 = cy - raio * Math.cos(anguloInicio * Math.PI / 180);
        const x2 = cx + raio * Math.sin(anguloFim * Math.PI / 180);
        const y2 = cy - raio * Math.cos(anguloFim * Math.PI / 180);
        const cor = (i < pintadas) ? '#3498db' : '#f0f0f0';
        pathD += `<path d="M${cx},${cy} L${x1},${y1} A${raio},${raio} 0 0,1 ${x2},${y2} Z" fill="${cor}" stroke="#333" stroke-width="1.5"/>`;
    }
    return `<svg viewBox="0 0 100 100" width="80" height="80" style="display:block; margin:0 auto;">${pathD}<circle cx="${cx}" cy="${cy}" r="${raio}" fill="none" stroke="#333" stroke-width="2"/></svg>`;
}

function gerarRetangulo(pintadas, partes) {
    const largura = 80, altura = 60;
    const larguraParte = largura / partes;
    let rets = '';
    for (let i = 0; i < partes; i++) {
        const x = i * larguraParte;
        const cor = (i < pintadas) ? '#3498db' : '#f0f0f0';
        rets += `<rect x="${x}" y="0" width="${larguraParte}" height="${altura}" fill="${cor}" stroke="#333" stroke-width="1.5"/>`;
    }
    return `<svg viewBox="0 0 ${largura} ${altura}" width="80" height="60" style="display:block; margin:0 auto;">${rets}<rect x="0" y="0" width="${largura}" height="${altura}" fill="none" stroke="#333" stroke-width="2"/></svg>`;
}

// ===== BARALHO =====
const VALORES = [
    { id: 1, fracao: '1/2', decimal: '0,5', porcentagem: '50%', figura: gerarCirculo(1,2), valor: 0.5 },
    { id: 2, fracao: '1/4', decimal: '0,25', porcentagem: '25%', figura: gerarRetangulo(1,4), valor: 0.25 },
    { id: 3, fracao: '3/4', decimal: '0,75', porcentagem: '75%', figura: gerarRetangulo(3,4), valor: 0.75 },
    { id: 4, fracao: '3/5', decimal: '0,6', porcentagem: '60%', figura: gerarRetangulo(3,5), valor: 0.6 },
    { id: 5, fracao: '4/5', decimal: '0,8', porcentagem: '80%', figura: gerarCirculo(4,5), valor: 0.8 },
    { id: 6, fracao: '1/5', decimal: '0,2', porcentagem: '20%', figura: gerarRetangulo(1,5), valor: 0.2 },
    { id: 7, fracao: '7/10', decimal: '0,7', porcentagem: '70%', figura: gerarCirculo(7,10), valor: 0.7 },
    { id: 8, fracao: '2/8', decimal: '0,25', porcentagem: '25%', figura: gerarCirculo(2,8), valor: 0.25 },
    { id: 9, fracao: '2/5', decimal: '0,4', porcentagem: '40%', figura: gerarRetangulo(2,5), valor: 0.4 },
    { id: 10, fracao: '3/10', decimal: '0,3', porcentagem: '30%', figura: gerarCirculo(3,10), valor: 0.3 },
    { id: 11, fracao: '3/8', decimal: '0,375', porcentagem: '37,5%', figura: gerarCirculo(3,8), valor: 0.375 },
    { id: 12, fracao: '7/8', decimal: '0,875', porcentagem: '87,5%', figura: gerarCirculo(7,8), valor: 0.875 },
    { id: 13, fracao: '3/12', decimal: '0,25', porcentagem: '25%', figura: gerarCirculo(3,12), valor: 0.25 },
    { id: 14, fracao: '6/12', decimal: '0,5', porcentagem: '50%', figura: gerarCirculo(6,12), valor: 0.5 },
    { id: 15, fracao: '9/12', decimal: '0,75', porcentagem: '75%', figura: gerarCirculo(9,12), valor: 0.75 },
    { id: 16, fracao: '9/20', decimal: '0,45', porcentagem: '45%', figura: gerarCirculo(9,20), valor: 0.45 },
];

function criarBaralho() {
    const baralho = [];
    VALORES.forEach((v) => {
        baralho.push({ id: v.id, tipo: 'fração', texto: v.fracao, valorDecimal: v.valor, representacao: v.fracao });
        baralho.push({ id: v.id, tipo: 'decimal', texto: v.decimal, valorDecimal: v.valor, representacao: v.decimal });
        baralho.push({ id: v.id, tipo: 'porcentagem', texto: v.porcentagem, valorDecimal: v.valor, representacao: v.porcentagem });
        baralho.push({ id: v.id, tipo: 'figura', texto: v.figura, valorDecimal: v.valor, representacao: `${v.fracao} (figura)` });
    });
    return baralho;
}

function embaralhar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===== SALAS =====
const salas = {};

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    socket.on('criar-sala', ({ maxJogadores, nome, tempoJogada }) => {
        const salaId = Math.random().toString(36).substring(2, 8);
        const baralho = embaralhar(criarBaralho());
        salas[salaId] = {
            jogadores: [{ id: socket.id, nome: nome || 'Jogador' }],
            maxJogadores: maxJogadores || 2,
            tempoJogada: tempoJogada || 30,
            baralho,
            descarte: [],
            descarteVisivel: null,
            maos: {},
            montagens: {},
            nomes: {},
            turno: 0,
            fase: 'aguardando',
            vencedor: null,
            vezDeComprar: false,
            timerInterval: null,
            tempoRestante: 0,
        };
        salas[salaId].nomes[socket.id] = nome || 'Jogador';
        salas[salaId].maos[socket.id] = [];
        salas[salaId].montagens[socket.id] = [];
        socket.join(salaId);
        socket.emit('sala-criada', salaId);
        console.log(`Sala ${salaId} criada por ${socket.id} (${nome}) com tempo ${tempoJogada}s`);
    });

    socket.on('entrar-sala', ({ salaId, nome }) => {
        const sala = salas[salaId];
        if (!sala) {
            socket.emit('erro', 'Sala não encontrada');
            return;
        }
        if (sala.jogadores.length >= sala.maxJogadores) {
            socket.emit('erro', 'Sala cheia');
            return;
        }
        sala.jogadores.push({ id: socket.id, nome: nome || 'Jogador' });
        sala.nomes[socket.id] = nome || 'Jogador';
        sala.maos[socket.id] = [];
        sala.montagens[socket.id] = [];
        socket.join(salaId);
        socket.emit('entrou-sala', salaId);
        io.to(salaId).emit('jogadores', sala.jogadores);
        if (sala.jogadores.length === sala.maxJogadores) {
            iniciarJogo(salaId);
        }
        console.log(`${socket.id} entrou na sala ${salaId} (${nome})`);
    });

    // COMPRAR DO MONTE
    socket.on('comprar', ({ salaId }) => {
        const sala = salas[salaId];
        if (!sala || sala.fase !== 'jogando') return;
        const jogadorId = socket.id;
        if (sala.jogadores[sala.turno].id !== jogadorId) {
            socket.emit('erro', 'Não é sua vez!');
            return;
        }
        if (sala.vezDeComprar) {
            socket.emit('erro', 'Você já comprou neste turno!');
            return;
        }
        if (sala.baralho.length === 0) {
            if (sala.descarte.length === 0) {
                socket.emit('erro', 'Baralho e descarte vazios!');
                return;
            }
            const ultima = sala.descarte.pop();
            sala.baralho = embaralhar(sala.descarte);
            sala.descarte = [];
            sala.descarte.push(ultima);
        }
        const carta = sala.baralho.pop();
        sala.maos[jogadorId].push(carta);
        sala.vezDeComprar = true;
        pararTimer(salaId);
        // Se houver carta visível, ninguém pegou, então vai para o descarte comum
        if (sala.descarteVisivel) {
            sala.descarte.push(sala.descarteVisivel);
            sala.descarteVisivel = null;
        }
        io.to(salaId).emit('estado-jogo', {
            maos: sala.maos,
            montagens: sala.montagens,
            turno: sala.turno,
            jogadores: sala.jogadores,
            baralhoRestante: sala.baralho.length,
            descarte: sala.descarte,
            descarteVisivel: sala.descarteVisivel,
            nomes: sala.nomes,
            vezDeComprar: sala.vezDeComprar,
            fase: sala.fase,
            tempoRestante: sala.tempoRestante
        });
    });

    // PEGAR DO DESCARTE VISÍVEL
    socket.on('pegar-descarte', ({ salaId }) => {
        const sala = salas[salaId];
        if (!sala || sala.fase !== 'jogando') return;
        const jogadorId = socket.id;
        if (sala.jogadores[sala.turno].id !== jogadorId) {
            socket.emit('erro', 'Não é sua vez!');
            return;
        }
        if (sala.vezDeComprar) {
            socket.emit('erro', 'Você já comprou neste turno!');
            return;
        }
        if (!sala.descarteVisivel) {
            socket.emit('erro', 'Não há carta disponível para pegar!');
            return;
        }
        const carta = sala.descarteVisivel;
        sala.descarteVisivel = null; // Remove a visibilidade
        sala.maos[jogadorId].push(carta);
        sala.vezDeComprar = true;
        pararTimer(salaId);
        io.to(salaId).emit('estado-jogo', {
            maos: sala.maos,
            montagens: sala.montagens,
            turno: sala.turno,
            jogadores: sala.jogadores,
            baralhoRestante: sala.baralho.length,
            descarte: sala.descarte,
            descarteVisivel: sala.descarteVisivel,
            nomes: sala.nomes,
            vezDeComprar: sala.vezDeComprar,
            fase: sala.fase,
            tempoRestante: sala.tempoRestante
        });
    });

    // DESCARTAR
    socket.on('descartar', ({ salaId, cartaId }) => {
        const sala = salas[salaId];
        if (!sala || sala.fase !== 'jogando') return;
        const jogadorId = socket.id;
        if (sala.jogadores[sala.turno].id !== jogadorId) {
            socket.emit('erro', 'Não é sua vez!');
            return;
        }
        if (!sala.vezDeComprar) {
            socket.emit('erro', 'Você precisa comprar ou pegar uma carta primeiro!');
            return;
        }
        const index = sala.maos[jogadorId].findIndex(c => c.id === cartaId);
        if (index === -1) {
            socket.emit('erro', 'Carta não encontrada na sua mão!');
            return;
        }
        const carta = sala.maos[jogadorId].splice(index, 1)[0];
        // Se havia uma carta visível, vai para o descarte comum
        if (sala.descarteVisivel) {
            sala.descarte.push(sala.descarteVisivel);
        }
        sala.descarteVisivel = carta; // nova carta visível
        sala.vezDeComprar = false;
        pararTimer(salaId);
        if (verificarVitoria(sala.montagens[jogadorId])) {
            sala.fase = 'finalizado';
            sala.vencedor = jogadorId;
            io.to(salaId).emit('fim-de-jogo', { vencedor: jogadorId, maos: sala.maos, montagens: sala.montagens, nomes: sala.nomes });
            return;
        }
        // Passa o turno (a carta visível permanece)
        sala.turno = (sala.turno + 1) % sala.jogadores.length;
        sala.vezDeComprar = false;
        sala.tempoRestante = sala.tempoJogada;
        iniciarTimer(salaId);
        io.to(salaId).emit('estado-jogo', {
            maos: sala.maos,
            montagens: sala.montagens,
            turno: sala.turno,
            jogadores: sala.jogadores,
            baralhoRestante: sala.baralho.length,
            descarte: sala.descarte,
            descarteVisivel: sala.descarteVisivel,
            nomes: sala.nomes,
            vezDeComprar: false,
            fase: sala.fase,
            tempoRestante: sala.tempoRestante
        });
    });

    // PASSAR VEZ
    socket.on('passar-vez', ({ salaId }) => {
        const sala = salas[salaId];
        if (!sala || sala.fase !== 'jogando') return;
        const jogadorId = socket.id;
        if (sala.jogadores[sala.turno].id !== jogadorId) {
            socket.emit('erro', 'Não é sua vez!');
            return;
        }
        // Se não comprou, força compra
        if (!sala.vezDeComprar) {
            if (sala.baralho.length === 0) {
                if (sala.descarte.length === 0) {
                    socket.emit('erro', 'Não há cartas!');
                    return;
                }
                const ultima = sala.descarte.pop();
                sala.baralho = embaralhar(sala.descarte);
                sala.descarte = [];
                sala.descarte.push(ultima);
            }
            const carta = sala.baralho.pop();
            sala.maos[jogadorId].push(carta);
            sala.vezDeComprar = true;
        }
        // Descartar aleatório
        const mao = sala.maos[jogadorId];
        if (mao.length > 0) {
            const idx = Math.floor(Math.random() * mao.length);
            const carta = mao.splice(idx, 1)[0];
            if (sala.descarteVisivel) {
                sala.descarte.push(sala.descarteVisivel);
            }
            sala.descarteVisivel = carta;
        }
        sala.vezDeComprar = false;
        pararTimer(salaId);
        if (verificarVitoria(sala.montagens[jogadorId])) {
            sala.fase = 'finalizado';
            sala.vencedor = jogadorId;
            io.to(salaId).emit('fim-de-jogo', { vencedor: jogadorId, maos: sala.maos, montagens: sala.montagens, nomes: sala.nomes });
            return;
        }
        sala.turno = (sala.turno + 1) % sala.jogadores.length;
        sala.vezDeComprar = false;
        sala.tempoRestante = sala.tempoJogada;
        iniciarTimer(salaId);
        io.to(salaId).emit('estado-jogo', {
            maos: sala.maos,
            montagens: sala.montagens,
            turno: sala.turno,
            jogadores: sala.jogadores,
            baralhoRestante: sala.baralho.length,
            descarte: sala.descarte,
            descarteVisivel: sala.descarteVisivel,
            nomes: sala.nomes,
            vezDeComprar: false,
            fase: sala.fase,
            tempoRestante: sala.tempoRestante
        });
    });

    // MOVER PARA MONTAGEM
    socket.on('mover-para-montagem', ({ salaId, cartaId }) => {
        const sala = salas[salaId];
        if (!sala || sala.fase !== 'jogando') return;
        const jogadorId = socket.id;
        if (sala.jogadores[sala.turno].id !== jogadorId) {
            socket.emit('erro', 'Não é sua vez!');
            return;
        }
        const index = sala.maos[jogadorId].findIndex(c => c.id === cartaId);
        if (index === -1) {
            socket.emit('erro', 'Carta não encontrada na sua mão!');
            return;
        }
        const carta = sala.maos[jogadorId].splice(index, 1)[0];
        const montagem = sala.montagens[jogadorId] || [];
        if (montagem.length === 0) {
            sala.montagens[jogadorId] = [carta];
        } else {
            const valorRef = montagem[0].valorDecimal;
            if (carta.valorDecimal !== valorRef) {
                sala.maos[jogadorId].push(carta);
                socket.emit('erro', 'Carta não compatível com a montagem!');
                return;
            }
            const tiposNaMontagem = montagem.map(c => c.tipo);
            if (tiposNaMontagem.includes(carta.tipo)) {
                sala.maos[jogadorId].push(carta);
                socket.emit('erro', 'Você já tem uma carta desse tipo na montagem!');
                return;
            }
            sala.montagens[jogadorId].push(carta);
        }
        if (verificarVitoria(sala.montagens[jogadorId])) {
            sala.fase = 'finalizado';
            sala.vencedor = jogadorId;
            io.to(salaId).emit('fim-de-jogo', { vencedor: jogadorId, maos: sala.maos, montagens: sala.montagens, nomes: sala.nomes });
            return;
        }
        io.to(salaId).emit('estado-jogo', {
            maos: sala.maos,
            montagens: sala.montagens,
            turno: sala.turno,
            jogadores: sala.jogadores,
            baralhoRestante: sala.baralho.length,
            descarte: sala.descarte,
            descarteVisivel: sala.descarteVisivel,
            nomes: sala.nomes,
            vezDeComprar: sala.vezDeComprar,
            fase: sala.fase,
            tempoRestante: sala.tempoRestante
        });
    });

    // MOVER PARA MÃO
    socket.on('mover-para-mao', ({ salaId, cartaId }) => {
        const sala = salas[salaId];
        if (!sala || sala.fase !== 'jogando') return;
        const jogadorId = socket.id;
        if (sala.jogadores[sala.turno].id !== jogadorId) {
            socket.emit('erro', 'Não é sua vez!');
            return;
        }
        const index = sala.montagens[jogadorId].findIndex(c => c.id === cartaId);
        if (index === -1) {
            socket.emit('erro', 'Carta não encontrada na montagem!');
            return;
        }
        const carta = sala.montagens[jogadorId].splice(index, 1)[0];
        sala.maos[jogadorId].push(carta);
        io.to(salaId).emit('estado-jogo', {
            maos: sala.maos,
            montagens: sala.montagens,
            turno: sala.turno,
            jogadores: sala.jogadores,
            baralhoRestante: sala.baralho.length,
            descarte: sala.descarte,
            descarteVisivel: sala.descarteVisivel,
            nomes: sala.nomes,
            vezDeComprar: sala.vezDeComprar,
            fase: sala.fase,
            tempoRestante: sala.tempoRestante
        });
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
        for (const [salaId, sala] of Object.entries(salas)) {
            const idx = sala.jogadores.findIndex(j => j.id === socket.id);
            if (idx !== -1) {
                sala.jogadores.splice(idx, 1);
                delete sala.nomes[socket.id];
                delete sala.maos[socket.id];
                delete sala.montagens[socket.id];
                io.to(salaId).emit('jogadores', sala.jogadores);
                if (sala.jogadores.length === 0) {
                    if (sala.timerInterval) clearInterval(sala.timerInterval);
                    delete salas[salaId];
                    console.log(`Sala ${salaId} removida (vazia)`);
                } else {
                    if (sala.turno >= sala.jogadores.length) sala.turno = 0;
                    io.to(salaId).emit('estado-jogo', {
                        maos: sala.maos,
                        montagens: sala.montagens,
                        turno: sala.turno,
                        jogadores: sala.jogadores,
                        baralhoRestante: sala.baralho.length,
                        descarte: sala.descarte,
                        descarteVisivel: sala.descarteVisivel,
                        nomes: sala.nomes,
                        vezDeComprar: sala.vezDeComprar,
                        fase: sala.fase,
                        tempoRestante: sala.tempoRestante
                    });
                }
                break;
            }
        }
    });
});

function verificarVitoria(montagem) {
    if (!montagem || montagem.length !== 4) return false;
    const valores = montagem.map(c => c.valorDecimal);
    const tipos = montagem.map(c => c.tipo);
    return valores.every(v => v === valores[0]) && new Set(tipos).size === 4;
}

function iniciarJogo(salaId) {
    const sala = salas[salaId];
    if (!sala) return;
    const baralho = sala.baralho;
    const numJogadores = sala.jogadores.length;
    const cartasPorJogador = 4;
    const total = numJogadores * cartasPorJogador;
    if (baralho.length < total) {
        sala.baralho = embaralhar(criarBaralho());
    }
    sala.maos = {};
    sala.montagens = {};
    sala.jogadores.forEach(j => {
        sala.maos[j.id] = [];
        for (let i = 0; i < cartasPorJogador; i++) {
            const carta = sala.baralho.pop();
            if (carta) sala.maos[j.id].push(carta);
        }
        sala.montagens[j.id] = [];
    });
    sala.turno = 0;
    sala.fase = 'jogando';
    sala.vezDeComprar = false;
    sala.descarte = [];
    sala.descarteVisivel = null;
    sala.tempoRestante = sala.tempoJogada;
    io.to(salaId).emit('inicio-jogo', {
        maos: sala.maos,
        montagens: sala.montagens,
        turno: sala.turno,
        jogadores: sala.jogadores,
        maxJogadores: sala.maxJogadores,
        baralhoRestante: sala.baralho.length,
        descarte: sala.descarte,
        descarteVisivel: sala.descarteVisivel,
        nomes: sala.nomes,
        vezDeComprar: false,
        tempoJogada: sala.tempoJogada,
        tempoRestante: sala.tempoJogada
    });
    iniciarTimer(salaId);
}

function iniciarTimer(salaId) {
    const sala = salas[salaId];
    if (!sala || sala.fase !== 'jogando') return;
    pararTimer(salaId);
    sala.tempoRestante = sala.tempoJogada;
    sala.timerInterval = setInterval(() => {
        sala.tempoRestante--;
        io.to(salaId).emit('timer-update', { tempoRestante: sala.tempoRestante });
        if (sala.tempoRestante <= 0) {
            pararTimer(salaId);
            const jogadorId = sala.jogadores[sala.turno].id;
            // Força a ação (compra e descarte)
            if (!sala.vezDeComprar) {
                if (sala.baralho.length === 0 && sala.descarte.length > 0) {
                    const ultima = sala.descarte.pop();
                    sala.baralho = embaralhar(sala.descarte);
                    sala.descarte = [];
                    sala.descarte.push(ultima);
                }
                if (sala.baralho.length > 0) {
                    const carta = sala.baralho.pop();
                    sala.maos[jogadorId].push(carta);
                }
                sala.vezDeComprar = true;
            }
            const mao = sala.maos[jogadorId] || [];
            if (mao.length > 0) {
                const idx = Math.floor(Math.random() * mao.length);
                const carta = mao.splice(idx, 1)[0];
                if (sala.descarteVisivel) {
                    sala.descarte.push(sala.descarteVisivel);
                }
                sala.descarteVisivel = carta;
            }
            sala.vezDeComprar = false;
            if (verificarVitoria(sala.montagens[jogadorId])) {
                sala.fase = 'finalizado';
                sala.vencedor = jogadorId;
                io.to(salaId).emit('fim-de-jogo', { vencedor: jogadorId, maos: sala.maos, montagens: sala.montagens, nomes: sala.nomes });
                return;
            }
            sala.turno = (sala.turno + 1) % sala.jogadores.length;
            sala.vezDeComprar = false;
            sala.tempoRestante = sala.tempoJogada;
            if (sala.fase === 'jogando') iniciarTimer(salaId);
            io.to(salaId).emit('estado-jogo', {
                maos: sala.maos,
                montagens: sala.montagens,
                turno: sala.turno,
                jogadores: sala.jogadores,
                baralhoRestante: sala.baralho.length,
                descarte: sala.descarte,
                descarteVisivel: sala.descarteVisivel,
                nomes: sala.nomes,
                vezDeComprar: false,
                fase: sala.fase,
                tempoRestante: sala.tempoRestante
            });
        }
    }, 1000);
}

function pararTimer(salaId) {
    const sala = salas[salaId];
    if (sala && sala.timerInterval) {
        clearInterval(sala.timerInterval);
        sala.timerInterval = null;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
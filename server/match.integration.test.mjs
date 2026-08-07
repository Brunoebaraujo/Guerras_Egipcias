/* Teste de integração do servidor: sobe o processo real e joga uma partida
   completa entre dois clientes WebSocket, verificando lobby, filtragem por
   jogador (planejamento oculto), revelação ritmada e avanço de rodadas.
   Rodar:  STEP_MS=15 node server/match.integration.test.mjs   (a partir da raiz)  */
import { spawn } from "child_process";
import { WebSocket } from "ws";
import { fileURLToPath } from "url";
import path from "path";
import { CONTENT_SIG, CARD_KEYS } from "../src/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8199;
const DECK = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "montu", "hathor", "escaravelho", "ammit", "mumia", "sobek"];

let passed = 0, failed = 0;
const check = (cond, label) => { if (cond) { passed++; } else { failed++; console.error("  ✗ " + label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- helper de cliente --------------------------------------------------
function mkClient(name) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
  const c = { ws, name, seat: null, last: null, states: [], msgs: [] };
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    c.msgs.push(m);
    if (m.t === "matchReady") c.seat = m.seat;
    if (m.t === "gameState") {
      c.last = m; c.states.push(m);
      /* Mira pendente do MEU assento trava a revelação até alguém responder.
         O teste não tinha esta resposta, então qualquer partida em que uma
         carta pedisse alvo (Sobek, Ammit, Anúbis…) ficava presa em "revealing"
         e o teste falhava de forma intermitente, conforme o sorteio do deck.
         Aqui resolvo sempre: miro num alvo legal se houver, senão dispenso. */
      const aim = m.state.awaitingAim;
      if (aim && aim.side === m.seat && c.aimRespondida !== aim.uid) {
        c.aimRespondida = aim.uid;
        const alvo = m.state.board.find((x) =>
          !x.dying && x.lane === aim.lane && x.uid !== aim.uid &&
          (aim.needs === "ally" ? x.owner === aim.side : x.owner !== aim.side));
        c.send(alvo ? { t: "aim", targetUid: alvo.uid } : { t: "skipAim" });
      }
    }
  });
  c.send = (o) => ws.send(JSON.stringify(o));
  c.waitOpen = () => new Promise((res) => ws.on("open", res));
  c.waitFor = (pred, ms = 8000) => new Promise((res, rej) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const hit = c.msgs.find(pred);
      if (hit) { clearInterval(iv); res(hit); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error("timeout waiting")); }
    }, 10);
  });
  c.waitState = (pred, ms = 10000) => new Promise((res, rej) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (c.last && pred(c.last)) { clearInterval(iv); res(c.last); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error("timeout state — ultimo: " + JSON.stringify(c.last && {fase:c.last.state.phase, round:c.last.state.round, aim:!!c.last.state.awaitingAim, aimSide:c.last.state.awaitingAim&&c.last.state.awaitingAim.side, ready:c.last.ready}))); }
    }, 10);
  });
  return c;
}

async function main() {
  const srv = spawn("node", [path.join(__dirname, "index.js")], {
    env: { ...process.env, PORT: String(PORT), STEP_MS: "15" }, stdio: "ignore",
  });
  await sleep(1200); // espera o servidor subir (folga para sandbox sob carga)

  const A = mkClient("Alice"), B = mkClient("Bob");
  await Promise.all([A.waitOpen(), B.waitOpen()]);

  // lobby: A cria, B entra
  A.send({ t: "hello", name: "Alice" }); B.send({ t: "hello", name: "Bob" });
  A.send({ t: "createRoom" });
  await A.waitFor((m) => m.t === "roomCreated");
  const roomId = A.msgs.find((m) => m.t === "roomCreated").roomId;
  B.send({ t: "joinRoom", roomId });
  await A.waitFor((m) => m.t === "matchReady");
  await B.waitFor((m) => m.t === "matchReady");
  check(A.seat === 0, "A é assento 0 (anfitrião)");
  check(B.seat === 1, "B é assento 1 (convidado)");

  // decks -> começa a partida
  A.send({ t: "deckReady", deck: DECK }); B.send({ t: "deckReady", deck: DECK });
  await A.waitState((m) => m.state.round === 1 && m.state.phase === "plan");
  await B.waitState((m) => m.state.round === 1 && m.state.phase === "plan");

  // filtragem: cada um vê a própria mão (4), do outro só a contagem
  check(A.last.state.hand[0].length === 4, "A vê a própria mão (4 cartas)");
  check(A.last.state.hand[1].length === 0, "A NÃO vê a mão do adversário");
  check(A.last.state.oppHand === 4, "A vê a contagem da mão do adversário (4)");
  check(A.last.seat === 0 && B.last.seat === 1, "cada cliente recebe seu assento");
  for (const secret of ["trace", "queue", "pendingBuff", "drawBuffReserve"]) {
    check(!(secret in A.last.state), `estado público não expõe ${secret}`);
  }

  // energia inicial 1: joga a carta de custo 0 (servo) se estiver na mão; senão pula
  const aServo = A.last.state.hand[0].find((h) => h.key === "servo");
  if (aServo) {
    A.send({ t: "act", action: { t: "place", hid: aServo.hid, lane: 0 } });
    await A.waitState((m) => m.state.board.some((c) => c.owner === 0 && !c.revealed));
    check(A.last.state.board.some((c) => c.owner === 0), "A vê a própria carta posicionada");
    // planejamento oculto: B NÃO deve ver a carta não revelada de A
    await sleep(60);
    check(!B.last.state.board.some((c) => c.owner === 0 && !c.revealed), "B NÃO vê a jogada oculta de A");
  }
  const bServo = B.last.state.hand[1].find((h) => h.key === "servo");
  if (bServo) B.send({ t: "act", action: { t: "place", hid: bServo.hid, lane: 0 } });
  await sleep(60);

  // ambos prontos -> revelação
  A.send({ t: "ready" }); B.send({ t: "ready" });
  await A.waitState((m) => m.state.phase === "revealed");
  await B.waitState((m) => m.state.phase === "revealed");
  check(A.last.state.phase === "revealed", "revelação concluída para A");
  // após revelar, cartas ficam públicas para os dois
  if (aServo) check(B.last.state.board.some((c) => c.owner === 0 && c.revealed), "B agora vê a carta revelada de A");

  // avança rodada
  A.send({ t: "ready" }); B.send({ t: "ready" });
  await A.waitState((m) => m.state.round === 2 && m.state.phase === "plan");
  check(A.last.state.round === 2, "avançou para a rodada 2");
  check(A.last.state.justDrew[0].length === 1, "A recebeu a compra animada da rodada 2");
  check(A.last.state.justDrew[1].length === 0, "A não vê a compra do adversário");

  // joga até o fim (rodadas 2..6): cada um posiciona 1 carta acessível e dá pronto 2x
  for (let round = 2; round <= 6; round++) {
    for (const cli of [A, B]) {
      const seat = cli.seat;
      const st = cli.last.state;
      const h = st.hand[seat].find((x) => x.printed !== undefined); // primeira carta
      if (h) {
        // tenta posicionar; se falhar por energia/via, ignora
        cli.send({ t: "act", action: { t: "place", hid: h.hid, lane: round % 3 } });
      }
    }
    await sleep(80);
    A.send({ t: "ready" }); B.send({ t: "ready" });
    if (round < 6) {
      await A.waitState((m) => m.state.phase === "revealed");
      A.send({ t: "ready" }); B.send({ t: "ready" });
      await A.waitState((m) => m.state.round === round + 1 || m.state.finished);
    } else {
      await A.waitState((m) => m.state.finished || m.state.phase === "revealed", 5000);
      if (!A.last.state.finished) { A.send({ t: "ready" }); B.send({ t: "ready" }); }
      await A.waitState((m) => m.state.finished, 5000);
    }
  }
  check(A.last.state.finished === true, "partida finalizou");
  check(/vence|Empate/.test(A.last.state.log.join(" ")), "log final apura vencedor/empate");

  // ---- REGRESSÃO: aperto de mão de versão -------------------------------
  const welcome = A.msgs.find((m) => m.t === "welcome");
  check(welcome && welcome.sig === CONTENT_SIG, "welcome traz a assinatura da coleção");
  check(welcome && welcome.cards === CARD_KEYS.length, "welcome traz a contagem de cartas");

  // ---- REGRESSÃO: carta desconhecida recusa SEM derrubar o servidor -----
  // Era esta a falha original: um deck com carta que o servidor não conhece
  // estourava dentro do freshMatch e matava o processo inteiro, deixando o
  // outro jogador preso em "Preparando a partida…".
  A.ws.close(); B.ws.close();
  await sleep(120);
  const C = mkClient("Carol"), D = mkClient("Dan");
  await Promise.all([C.waitOpen(), D.waitOpen()]);
  C.send({ t: "hello", name: "Carol" }); D.send({ t: "hello", name: "Dan" });
  C.send({ t: "createRoom" });
  const rc = await C.waitFor((m) => m.t === "roomCreated");
  D.send({ t: "joinRoom", roomId: rc.roomId });
  await D.waitFor((m) => m.t === "matchReady");
  C.send({ t: "deckReady", deck: DECK });
  D.send({ t: "deckReady", deck: ["cartaQueNaoExiste", ...DECK.slice(1)] });
  const recusa = await C.waitFor(() => false, 300).catch(() => null); // só dá tempo
  const errD = D.msgs.find((m) => m.t === "error" && /desconhecida/.test(m.msg || ""));
  check(!!errD, "deck com carta desconhecida é recusado com mensagem clara");
  check(C.ws.readyState === C.ws.OPEN, "o servidor continua de pé depois da recusa");
  void recusa;

  D.msgs.length = 0;
  D.send({ t: "deckReady", deck: Array(12).fill("servo") });
  await sleep(100);
  check(D.msgs.some((m) => m.t === "error" && /repetidas/.test(m.msg || "")), "deck com cartas repetidas é recusado");

  D.msgs.length = 0;
  D.send({ t: "deckReady", deck: [...DECK.slice(0, 11), "token-gafanhoto"] });
  await sleep(100);
  check(D.msgs.some((m) => m.t === "error" && /desconhecida/.test(m.msg || "")), "deck com ficha é recusado");

  // Um deck válido depois das recusas inicia normalmente a partida.
  D.send({ t: "deckReady", deck: DECK });
  await C.waitState((m) => m.state.round === 1 && m.state.phase === "plan");

  // ---- REGRESSÃO: resetPlan chega ao motor -------------------------------
  // O cliente online já mandava "resetPlan" (Reiniciar rodada), mas a lista
  // branca do servidor só aceitava place/pickup/move e devolvia "Ação inválida".
  D.msgs.length = 0;
  D.send({ t: "act", action: { t: "resetPlan" } });
  await sleep(150);
  const invalida = D.msgs.find((m) => m.t === "error" && /Ação inválida/.test(m.msg || ""));
  check(!invalida, "resetPlan não é mais barrado pela lista branca");

  D.msgs.length = 0;
  D.send({ t: "act", action: { t: "toggleActivate", uid: "inexistente" } });
  await sleep(150);
  check(!D.msgs.some((m) => m.t === "error" && /Ação inválida/.test(m.msg || "")), "toggleActivate chega ao motor online");

  C.ws.close(); D.ws.close();
  srv.kill();
  await sleep(100);

  console.log(`\n  ${passed} verificações OK, ${failed} falhas.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("ERRO:", e); process.exit(1); });

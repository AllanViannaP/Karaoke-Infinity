# Karaoke Local

Programa local de karaoke para Windows: cola um link do YouTube, toca o video e liga o microfone do sistema nos alto-falantes.

## Como abrir

1. Execute `start-karaoke.bat`.
2. O navegador abre em `http://127.0.0.1:4173`.
3. Cole um link do YouTube e clique em `Tocar`.
4. Clique em `Ligar` na area do microfone e permita o acesso quando o navegador pedir.

Tambem funciona pelo terminal com `node server.js` se o Node.js estiver instalado.

## Observacoes

- O audio do microfone sai pela saida padrao do Windows. Se o navegador suportar troca de saida, o seletor `Saida` tambem funciona.
- Para evitar retorno alto, use fones ou deixe o ganho baixo antes de ligar o microfone.
- Alguns videos do YouTube bloqueiam reproducao incorporada; nesses casos o app mostra uma mensagem no topo.

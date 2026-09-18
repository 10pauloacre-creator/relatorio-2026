/*
 * Ciclo de estudos (rodízio) da E.E. Raimundo Hermínio de Melo.
 * Único lugar para mudar a ordem das turmas, os dias e a fila das disciplinas.
 * Usado pela página da Hermínio (Contador) e por planejamento-aulas-2026.html?escola=herminio.
 *
 * Regras (definidas pelo professor em 18/09/2026):
 * - Uma turma por vez. A turma seguinte começa no dia letivo seguinte ao
 *   encerramento de TODAS as disciplinas da turma anterior.
 * - Cada trilha é um conjunto de dias da semana. A disciplina da vez ocupa
 *   esses dias até completar a carga anual (4 bimestres); a próxima da fila
 *   assume a partir daí. Se a disciplina encerra no meio do dia, as horas
 *   restantes daquele dia já entram para a próxima.
 * - Quando a fila de uma trilha acaba e outra trilha ainda tem disciplina,
 *   essa disciplina assume também os dias da trilha que acabou.
 * - Horas em h/aula do Contador: o dia de 4h15 (2h + 2h15) conta 4 h/aula e
 *   sobra 15 min (minutosExtras). A cada 60 min acumulados na disciplina,
 *   aquele dia vale +1 h/aula extra.
 */
window.HERMINIO_CICLO_ESTUDOS = {
  fimAnoLetivo: '2026-12-23',
  // Turmas que já cumpriram a carga mínima e encerraram o ciclo.
  concluidas: ['t1'],
  etapas: [
    {
      turma: 't89',
      trilhas: [
        { nome: 'Português', dias: { 1: 4, 3: 4, 4: 4 }, minutosExtras: { 1: 15, 3: 15, 4: 15 }, fila: ['lp'] },
        { nome: 'Arte', dias: { 2: 4, 3: 4, 5: 4 }, minutosExtras: { 2: 15, 5: 15 }, fila: ['art'] }
      ]
    },
    {
      turma: 't23',
      trilhas: [
        // Segunda 4h15, quarta 4h15 (manhã) e quinta 4h15.
        { nome: 'Português', dias: { 1: 4, 3: 4, 4: 4 }, minutosExtras: { 1: 15, 3: 15, 4: 15 }, fila: ['lp'] },
        // Terça 4h15, quarta 4h (tarde) e sexta 4h15.
        { nome: 'Espanhol → Inglês → Arte → Redação', dias: { 2: 4, 3: 4, 5: 4 }, minutosExtras: { 2: 15, 5: 15 }, fila: ['esp', 'ing', 'art', 'red'] }
      ]
    }
  ]
};

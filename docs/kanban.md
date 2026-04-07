# Kanban Board — Etapa S

Visualização Kanban para tarefas de um projeto, com drag & drop, quick-add inline e toggle Lista/Kanban persistido por projeto.

---

## Acesso

Na página de detalhes de um projeto (`/org/[orgSlug]/projects/[projectId]`), use o toggle no cabeçalho "Tarefas":

- **Lista** — tabela com filtros, bulk actions, inline edit e paginação (comportamento anterior)
- **Kanban** — board com colunas por status, drag & drop e quick-add

A escolha é salva em `localStorage` com a chave `kanban-view:{orgSlug}:{projectId}`, portanto cada projeto mantém a preferência separada.

---

## Colunas

| Coluna | Status | Cor |
|---|---|---|
| A fazer | `TODO` | Cinza |
| Em andamento | `IN_PROGRESS` | Azul |
| Concluído | `DONE` | Verde |
| Cancelado | `CANCELED` | Vermelho |

Cada coluna exibe:
- Header com rótulo + contador de tasks
- Cards com título e chips de tags
- Formulário de quick-add no rodapé (se o usuário tiver permissão `task:create`)

---

## Drag & Drop

- Implementado com **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/utilities`)
- Arrastar um card para outra coluna dispara `PATCH /api/org/[orgSlug]/tasks/[taskId]` com `{ status: novoStatus }`
- **Optimistic update**: o card se move imediatamente no UI; em caso de erro do servidor, faz rollback para o estado anterior + toast de erro
- Arrastar para a mesma coluna não faz nada (status não muda)
- Sensor com `activationConstraint.distance: 8px` para evitar drag acidental em cliques simples

### RBAC e drag

| Permissão | Comportamento |
|---|---|
| `task:update` (OWNER, ADMIN, MEMBER) | Drag ativado — pode mover cards |
| Sem `task:update` (VIEWER) | Drag desativado — cards não são arrastáveis |

---

## Quick Add

Cada coluna tem um botão **"+ Adicionar tarefa"** (visível somente para usuários com `task:create`):

1. Clicar expande um input inline
2. Digitar o título e pressionar **Enter** ou clicar **Adicionar**
3. A tarefa é criada via `POST /api/org/[orgSlug]/projects/[projectId]/tasks` com o status da coluna
4. A query é invalidada → card aparece na coluna após refetch

### Atalhos de teclado
- **Enter** — salva a tarefa
- **Escape** — cancela e fecha o formulário

---

## Edição de Cards

Cada card exibe um ícone de lápis no hover (visível somente com `task:update`). Clicar abre o **TaskFormModal** já existente para edição completa (título, descrição, status, tags).

---

## Arquitetura

```
src/features/tasks/
├── hooks/
│   └── use-kanban-tasks.ts          # fetch + agrupamento por status
└── components/
    └── kanban/
        ├── kanban-board.tsx         # DndContext, DragOverlay, modal de edição
        ├── kanban-column.tsx        # useDroppable, header, cards, quick-add
        ├── kanban-quick-add.tsx     # formulário inline de criação
        ├── task-card.tsx            # useDraggable, título, tags, edit btn
        └── __tests__/
            └── kanban-board.ui.test.tsx
```

O `TasksSection` foi modificado para incluir o toggle e renderizar condicionalmente `<KanbanBoard>` ou a tabela existente.

---

## Limitações Conhecidas

### Ordem dentro da coluna não é persistida

Arrastar um card para cima ou para baixo dentro da mesma coluna reordena visualmente apenas durante o drag. Ao soltar, a ordem não é salva no servidor — as tasks permanecem ordenadas por `createdAt DESC` conforme retornado pela API.

Implementar persistência de ordem exigiria:
1. Adicionar campo `position: Int` no modelo `Task` (migração de schema)
2. Endpoint para atualizar posições em batch
3. Lógica de re-indexação no servidor

### Máximo de 50 tasks no Kanban

O hook `useKanbanTasks` busca com `pageSize: 50` (valor máximo aceito pela API). Projetos com mais de 50 tasks exibirão apenas as 50 mais recentes no Kanban. A visualização em Lista não tem essa limitação (pagina normalmente).

### Filtros não aplicados no Kanban

Na visualização Kanban os filtros de busca/tag do modo Lista não são aplicados — o board sempre mostra todas as tasks do projeto. Para filtrar no Kanban, use o modo Lista.

---

## Testes

```bash
pnpm test:ui --testPathPattern=kanban
```

Cobertos:
- Renderização das 4 colunas com tasks e contadores
- Drag simulado (TODO → IN_PROGRESS, mesma coluna, sem `over`, VIEWER)
- Quick add: abrir formulário, criar task, Enter, Escape, campo vazio
- RBAC: VIEWER não vê botões de add; cards não têm cursor de drag
- Toggle de view: padrão lista, troca para kanban, localStorage persistence

---

## Checklist Manual

1. Abrir um projeto → verificar toggle Lista/Kanban no header
2. Clicar em **Kanban** → board aparece com 4 colunas
3. Arrastar uma task TODO → coluna IN_PROGRESS
   - Card se move imediatamente (optimistic)
   - Após refresh da página, persiste na nova coluna
4. Clicar **+ Adicionar tarefa** na coluna DONE → digitar título → Enter
   - Card aparece na coluna DONE
5. Abrir com conta VIEWER:
   - Não há botões "+ Adicionar tarefa"
   - Cards não são arrastáveis (cursor padrão)
6. Trocar para Lista → modo lista retorna normalmente
7. Fechar e reabrir o projeto → preferência de view é mantida

# Etapa T — Responsável em Tarefas (Assignee)

## Visão Geral

Cada tarefa pode ter um **responsável** (`assigneeUserId`), que deve ser membro da mesma organização. O campo é opcional e nullable.

---

## Acesso e Permissões

| Ação | Permissão mínima |
|------|-----------------|
| Ver responsável | qualquer membro (VIEWER+) |
| Atribuir/remover ao criar tarefa | `task:create` (MEMBER+) |
| Alterar responsável | `task:update` (MEMBER+) |
| Filtrar "Minhas tarefas" | qualquer membro (VIEWER+) |

---

## Banco de Dados

**Modelo `Task`** (adições):
```prisma
assigneeUserId String?
assignee       User?  @relation("TaskAssignee", fields: [assigneeUserId], references: [id], onDelete: SetNull)

@@index([orgId, assigneeUserId])
```

**Modelo `User`** (adição):
```prisma
assignedTasks Task[] @relation("TaskAssignee")
```

`onDelete: SetNull` garante que, se o usuário for deletado, `assigneeUserId` vira `null` em vez de deletar a tarefa.

---

## API

### `GET /api/org/[orgSlug]/members`
Retorna todos os membros da org com dados básicos do usuário. Usado para popular o seletor de responsável.

**Resposta:**
```json
{
  "members": [
    {
      "id": "membership-id",
      "role": "OWNER",
      "userId": "user-id",
      "orgId": "org-id",
      "createdAt": "2026-01-01T00:00:00Z",
      "user": { "id": "user-id", "name": "João Silva", "email": "joao@example.com" }
    }
  ]
}
```

### `POST /api/org/[orgSlug]/projects/[projectId]/tasks`
Campo adicional no body:
```json
{ "assigneeUserId": "user-id-or-null" }
```
Retorna `400` se `assigneeUserId` não for membro da org.

### `PATCH /api/org/[orgSlug]/tasks/[taskId]`
Campo adicional no body:
```json
{ "assigneeUserId": "user-id" }   // atribuir
{ "assigneeUserId": null }         // remover
```
Retorna `400` se `assigneeUserId` não for membro da org.

### `GET /api/org/[orgSlug]/projects/[projectId]/tasks`
Novo parâmetro de query:
```
?assignedTo=me   → filtra tasks atribuídas ao usuário autenticado
```
O valor `"me"` é resolvido no servidor para `ctx.userId`.

---

## Validação

- `assigneeUserId` deve ser um `userId` de membro ativo da mesma org
- Usuário de outra org → `AssigneeNotInOrgError` (HTTP 400)
- Usuário não membro → `AssigneeNotInOrgError` (HTTP 400)
- `null` explícito → remove o responsável (válido sempre)
- `undefined` (campo ausente) → não altera o responsável

---

## UI

### Lista de Tarefas
- Coluna **"Responsável"** na tabela (visível em `lg:`)
- Avatar colorido com iniciais + tooltip (nome/email)
- `NoAssigneeAvatar` (ícone pontilhado) quando sem responsável
- Botão **"Minhas tarefas"** na toolbar de filtros — toggle `assignedTo=me`

### Kanban Board
- Avatar do responsável no rodapé de cada card
- Botão **"Minhas tarefas"** acima das colunas
- Quick-add auto-atribui ao usuário atual quando filtro "Minhas tarefas" está ativo

### TaskFormModal (criar/editar)
- Campo **"Responsável"** com `AssigneeSelector` (Popover + Command com busca)
- Busca incremental por nome ou email
- Opção "Sem responsável" para remover

---

## Arquitetura

```
src/
├── schemas/task.ts                              # taskCreateSchema + taskUpdateSchema + taskQuerySchema
├── server/
│   ├── errors/project-errors.ts                # AssigneeNotInOrgError (status 400)
│   ├── repo/task-repo.ts                       # assigneeUserId em create/update/list params
│   ├── use-cases/
│   │   ├── create-task.ts                      # valida membership + passa assigneeUserId
│   │   ├── update-task.ts                      # valida membership + passa assigneeUserId
│   │   └── list-tasks.ts                       # passa assigneeUserId para repo
│   └── app/api/org/[orgSlug]/
│       ├── members/route.ts                    # GET — lista membros (novo endpoint)
│       ├── projects/[projectId]/tasks/route.ts  # GET resolve assignedTo=me; POST handle error
│       └── tasks/[taskId]/route.ts             # PATCH handle AssigneeNotInOrgError
├── features/tasks/
│   ├── hooks/
│   │   ├── use-tasks.ts                        # assignedTo?: "me" param
│   │   ├── use-org-members.ts                  # staleTime 5min
│   │   └── use-kanban-tasks.ts                 # options.assignedToMe
│   └── components/
│       ├── assignee-avatar.tsx                 # AssigneeAvatar + NoAssigneeAvatar
│       ├── assignee-selector.tsx               # Popover + Command para seleção
│       ├── task-form-modal.tsx                 # campo Responsável
│       ├── tasks-section.tsx                   # coluna + toggle "Minhas tarefas"
│       └── kanban/
│           ├── task-card.tsx                   # avatar no rodapé
│           ├── kanban-column.tsx               # pass-through de membersById
│           ├── kanban-quick-add.tsx            # assigneeUserId param
│           └── kanban-board.tsx                # toggle + fetch members
```

---

## Testes

### Integração (`pnpm test:int -- task-assignee`)
- `create-task`: assignee válido, sem assignee, AssigneeNotInOrgError, cross-org
- `update-task`: atualizar assignee, remover (null), AssigneeNotInOrgError
- `list-tasks`: filtro por `assigneeUserId`, sem filtro

### RTL — modificados para passar com novo prop `currentUserId`
- `tasks-section.ui.test.tsx`
- `tasks-section-view.ui.test.tsx`
- `kanban-board.ui.test.tsx`

---

## Limitações Conhecidas

- A avatar usa iniciais + cor determinística baseada no email (sem imagem de perfil)
- `assignedTo=me` só está disponível no filtro de projeto (não no cross-project `/api/org/tasks`)
- Ordem dos membros no selector: por data de entrada (mais antigo primeiro)
- Kanban: ao mover um card para outra coluna, o assignee não é alterado

---

## Checklist Manual

- [ ] Criar tarefa com responsável → verificar que aparece na lista e no kanban
- [ ] Editar tarefa → trocar responsável pelo modal
- [ ] Remover responsável no modal (selecionar "Sem responsável")
- [ ] Clicar "Minhas tarefas" na lista → filtro ativo (botão destaca)
- [ ] Clicar "Minhas tarefas" no kanban → colunas filtradas
- [ ] Quick-add no kanban com "Minhas tarefas" ativo → tarefa criada com assignee = eu
- [ ] Tentar API: `PATCH /tasks/:id` com `assigneeUserId` de usuário fora da org → 400
- [ ] Tooltip do avatar: hover mostra nome + email
- [ ] Responsável coluna visível em tela `lg+`; oculta em mobile

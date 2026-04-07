# Exportação e Importação de Dados (Etapa Q)

Export/import funcional de dados por organização. Inclui projects e tasks.
**Não substitui backup do banco de dados** — use para migração, backup funcional ou rascunho.

---

## Formato export v1

```json
{
  "version": 1,
  "exportedAt": "2026-03-22T18:00:00.000Z",
  "org": {
    "id": "interno-org-id",
    "slug": "minha-org",
    "name": "Minha Organização"
  },
  "data": {
    "projects": [
      {
        "externalId": "uuid-v4",
        "name": "Nome do Projeto",
        "description": "Descrição opcional",
        "createdAt": "2026-01-15T10:00:00.000Z"
      }
    ],
    "tasks": [
      {
        "externalId": "uuid-v4",
        "projectExternalId": "uuid-v4-do-project",
        "title": "Título da Task",
        "description": null,
        "status": "TODO",
        "tags": ["bug", "urgente"],
        "createdAt": "2026-01-16T12:00:00.000Z"
      }
    ]
  }
}
```

### Campos obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `version` | `1` | Sempre literal 1 (outras versões rejeitadas) |
| `exportedAt` | ISO 8601 | Timestamp do export |
| `org.id`, `org.slug`, `org.name` | string | Metadados da org de origem |
| `data.projects` | array | Lista de projects |
| `data.tasks` | array | Lista de tasks |

### ExternalIds

- `externalId` em projects e tasks: UUIDs v4 gerados no export
- `projectExternalId` em tasks: referencia o `externalId` do project no mesmo payload
- No import, novos IDs internos são gerados — os `externalId` são apenas referência

---

## Limites de import

| Limite | Valor |
|--------|-------|
| Máximo de projects | 500 |
| Máximo de tasks | 5.000 |
| Tamanho do payload | 5 MB |
| Nome do project | 120 chars |
| Título da task | 160 chars |
| Tags por task | 10 tags, cada uma max 24 chars |

---

## Permissões

| Role | data:export | data:import |
|------|-------------|-------------|
| OWNER | ✅ | ✅ |
| ADMIN | ✅ | ✅ |
| MEMBER | ❌ | ❌ |
| VIEWER | ❌ | ❌ |

---

## Rate limits

| Operação | Limite |
|----------|--------|
| Export | 5 req/h por orgId+userId |
| Import | 3 req/h por orgId+userId |

---

## Usar dry run

O import suporta `?dryRun=true` para validar o payload sem persistir dados.
Retorna os mesmos campos de resultado (`createdProjects`, `createdTasks`, `warnings`),
mas `dryRun: true` no response.

```bash
# Validar sem gravar
curl -X POST /api/org/minha-org/import?dryRun=true \
  -H "Content-Type: application/json" \
  -d @export.json

# Importar de verdade
curl -X POST /api/org/minha-org/import \
  -H "Content-Type: application/json" \
  -d @export.json
```

**Recomendação**: sempre faça um dry run antes do import real.

---

## Comportamento no import

- **Append-only**: nunca sobrescreve dados existentes
- **Transação**: tudo ou nada — se criar 400 dos 500 projects falhar, nenhum é criado
- **Tasks inválidas**: tasks cujo `projectExternalId` não existe no payload são ignoradas com warning
- **Isolamento multi-tenant**: projects e tasks são sempre criados na org autenticada, independente do `org.id` no payload

---

## API Endpoints

```
GET  /api/org/[orgSlug]/export
     → application/json, Content-Disposition: attachment; filename="export-{slug}-{date}.json"

POST /api/org/[orgSlug]/import
     Body: ExportPayload (application/json)
     Query: ?dryRun=true
     → { dryRun, createdProjects, createdTasks, skippedTasks, warnings }
```

---

## UI

Acesse em `/org/[orgSlug]/settings/data` (link "Export / Import" na sidebar — visível para OWNER e ADMIN).

---

## O que NÃO é incluído

- Senhas, tokens, secrets, recovery codes
- Members e suas PII (emails, roles)
- Audit logs (volume alto, não é funcional)
- Sessões, dispositivos de confiança

---

## Observação crítica

Este export é **funcional** — serve para migrar dados entre orgs, fazer um backup das tasks,
ou exportar para análise externa. Ele **não é** um backup completo do banco de dados.

Para recuperação de desastres, use os backups automáticos do seu provedor
(Neon, Supabase, Railway, etc.) que capturam o estado completo do banco.

---

## Arquivos relevantes

```
src/
├── schemas/data-export.ts                    # Zod schemas v1 + EXPORT_LIMITS
├── server/use-cases/
│   ├── export-org-data.ts                    # Gera payload v1
│   └── import-org-data.ts                    # Valida + importa (com dryRun)
├── app/api/org/[orgSlug]/
│   ├── export/route.ts                       # GET /api/.../export
│   └── import/route.ts                       # POST /api/.../import
├── app/(tenant)/org/[orgSlug]/settings/data/
│   └── page.tsx                              # UI /settings/data
├── features/data/components/
│   └── data-export-import.tsx                # Client component
└── security/
    ├── permissions.ts                        # data:export + data:import
    └── rbac.ts                               # OWNER + ADMIN têm as permissões
```

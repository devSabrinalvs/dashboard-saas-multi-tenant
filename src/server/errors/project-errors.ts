/**
 * Erros de domínio para operações de projetos e tarefas.
 * Cada classe expõe `.status` para mapeamento direto em route handlers.
 */

export class ProjectNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Projeto não encontrado.");
    this.name = "ProjectNotFoundError";
    Object.setPrototypeOf(this, ProjectNotFoundError.prototype);
  }
}

export class TaskNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Tarefa não encontrada.");
    this.name = "TaskNotFoundError";
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}

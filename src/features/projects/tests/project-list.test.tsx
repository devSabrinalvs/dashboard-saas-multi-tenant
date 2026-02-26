/**
 * Test for project listing using MSW handlers.
 * This tests the client-side fetch logic that would render a list of projects.
 */
import { render, screen, waitFor } from "@testing-library/react";

// A simple client component that fetches and renders projects
function ProjectList({ orgSlug }: { orgSlug: string }) {
  const [projects, setProjects] = React.useState<
    Array<{
      id: string;
      name: string;
      status: string;
      _count: { tasks: number };
    }>
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/projects`)
      .then((response) => response.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      });
  }, [orgSlug]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>No projects found</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id} data-testid="project-item">
              <span>{project.name}</span>
              <span>{project.status}</span>
              <span>{project._count.tasks} tasks</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import React from "react";

describe("ProjectList (with MSW)", () => {
  it("renders projects from API", async () => {
    render(<ProjectList orgSlug="test-org" />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getAllByTestId("project-item")).toHaveLength(2);
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.getByText("3 tasks")).toBeInTheDocument();
  });
});

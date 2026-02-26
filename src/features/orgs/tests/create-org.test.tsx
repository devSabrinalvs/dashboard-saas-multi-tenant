import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateOrgDialog } from "../components/create-org-dialog";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
}));

// Mock server action
const mockCreateOrg = jest.fn();
jest.mock("../server/actions", () => ({
  createOrgAction: (...args: unknown[]) => mockCreateOrg(...args),
}));

// Mock shared utils
jest.mock("@/shared/utils", () => ({
  ...jest.requireActual("@/shared/utils"),
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
}));

describe("CreateOrgDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows create button initially", () => {
    render(<CreateOrgDialog />);
    expect(
      screen.getByText("Create New Organization")
    ).toBeInTheDocument();
  });

  it("shows form after clicking create button", async () => {
    const user = userEvent.setup();
    render(<CreateOrgDialog />);

    await user.click(screen.getByText("Create New Organization"));
    expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
  });

  it("auto-generates slug from name", async () => {
    const user = userEvent.setup();
    render(<CreateOrgDialog />);

    await user.click(screen.getByText("Create New Organization"));
    await user.type(screen.getByLabelText("Organization Name"), "My Company");

    expect(screen.getByLabelText("Slug")).toHaveValue("my-company");
  });

  it("submits form and redirects on success", async () => {
    mockCreateOrg.mockResolvedValue({
      data: { id: "org-1", slug: "test-org" },
    });

    const user = userEvent.setup();
    render(<CreateOrgDialog />);

    await user.click(screen.getByText("Create New Organization"));
    await user.type(screen.getByLabelText("Organization Name"), "Test Org");
    await user.click(screen.getByText("Create Organization"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/org/test-org/dashboard");
    });
  });

  it("shows error on validation failure", async () => {
    mockCreateOrg.mockResolvedValue({
      error: { slug: ["This slug is already taken"] },
    });

    const user = userEvent.setup();
    render(<CreateOrgDialog />);

    await user.click(screen.getByText("Create New Organization"));
    await user.type(screen.getByLabelText("Organization Name"), "Test");
    await user.click(screen.getByText("Create Organization"));

    await waitFor(() => {
      expect(
        screen.getByText("This slug is already taken")
      ).toBeInTheDocument();
    });
  });

  it("hides form when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<CreateOrgDialog />);

    await user.click(screen.getByText("Create New Organization"));
    expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(
      screen.queryByLabelText("Organization Name")
    ).not.toBeInTheDocument();
  });
});

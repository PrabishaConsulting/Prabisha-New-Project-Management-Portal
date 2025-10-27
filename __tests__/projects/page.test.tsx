import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock sonner toast - FIXED: Added success mock
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(), // Added this
    promise: jest.fn((promise, options) => {
      return promise.then(options.success).catch(options.error);
    }),
  },
}));

// Mock the nested AddInternalProductModal
jest.mock("@/components/modals/AddInternalProductModal", () => ({
  AddInternalProductModal: () => <button>Add Product</button>,
}));

// Mock fetch API
global.fetch = jest.fn();

const mockRouter = {
  refresh: jest.fn(),
};
(useRouter as jest.Mock).mockReturnValue(mockRouter);

// Mock data for all API calls
const mockDepartments = [{ id: "dept-1", name: "Engineering" }];
const mockClients = [{ id: "client-1", name: "Global Tech Inc." }];
const mockInternalProducts = [{ id: "prod-1", name: "Project Phoenix" }];
const mockWorkspaceMembers = [
  {
    id: "member-1",
    user: {
      id: "user-1",
      name: "Current User",
      email: "current@example.com",
      avatar: "",
    },
    role: "ADMIN",
  },
  {
    id: "member-2",
    user: {
      id: "user-2",
      name: "Workspace Owner",
      email: "owner@example.com",
      avatar: "",
    },
    role: "OWNER",
  },
];

// Helper function to generate unique project names
const generateUniqueProjectName = () => {
  return `Test Project ${Date.now()}`;
};

// Helper function to select an option from a dropdown
const selectFromDropdown = async (triggerText: string, optionText: string) => {
  fireEvent.click(screen.getByText(triggerText));
  const option = await screen.findByRole('option', { name: optionText });
  fireEvent.click(option);
};

// Wrapper component to provide session context
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const mockSession = {
    user: {
      id: "user-1",
      name: "Current User",
      email: "current@example.com",
      avatar : "deva"
    },
    expires: "2023-01-01",
  };

  return <SessionProvider session={mockSession}>{children}</SessionProvider>;
};

describe("CreateProjectModal", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockRouter.refresh.mockClear();
    (jest.requireMock("sonner").toast.error as jest.Mock).mockClear();
    (jest.requireMock("sonner").toast.success as jest.Mock).mockClear(); // Clear success mock

    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/project-form-data?workspaceId=ws-123") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            departments: mockDepartments,
            clients: mockClients,
            internalProducts: mockInternalProducts,
            workspaceMembers: mockWorkspaceMembers,
          }),
        });
      }
      if (url === "/api/projects") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ project: { id: "proj-123", name: "New Project" } }),
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });
  });

  it('should render the "New Project" button', () => {
    render(
      <TestWrapper>
        <CreateProjectModal workspaceId="ws-123" />
      </TestWrapper>
    );
    expect(
      screen.getByRole("button", { name: /new project/i })
    ).toBeInTheDocument();
  });

  it("should open the sheet and fetch all initial data when the button is clicked", async () => {
    render(
      <TestWrapper>
        <CreateProjectModal workspaceId="ws-123" />
      </TestWrapper>
    );
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByText("Select a product")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/project-form-data?workspaceId=ws-123");
    });
  });

  it("should submit the form for an INTERNAL project by default", async () => {
    const uniqueProjectName = generateUniqueProjectName();

    render(
      <TestWrapper>
        <CreateProjectModal workspaceId="ws-123" />
      </TestWrapper>
    );
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: uniqueProjectName },
    });

    await selectFromDropdown("Select a department", "Engineering");
    await selectFromDropdown("Select a product", "Project Phoenix");
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uniqueProjectName,
          workspaceId: "ws-123",
          departmentId: "dept-1",
          isClientProject: false,
          clientId: null,
          internalProductId: "prod-1",
          memberIds: ["user-1", "user-2"], // Current user and workspace owner
        }),
      });
    });

    // Check that toast.success was called
    await waitFor(() => {
      expect(jest.requireMock("sonner").toast.success).toHaveBeenCalledWith(
        `Project "New Project" created successfully!`
      );
    });

    // Now the sheet should be closed
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("should submit the form for a CLIENT project when toggled", async () => {
    const uniqueProjectName = generateUniqueProjectName();

    render(
      <TestWrapper>
        <CreateProjectModal workspaceId="ws-123" />
      </TestWrapper>
    );
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    await screen.findByRole("dialog");

    const clientSwitch = screen.getByLabelText(/External Client Project/i);
    fireEvent.click(clientSwitch);

    expect(await screen.findByText("Select a client")).toBeInTheDocument();
    expect(screen.queryByText("Select a product")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: uniqueProjectName },
    });

    await selectFromDropdown("Select a department", "Engineering");
    await selectFromDropdown("Select a client", "Global Tech Inc.");
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uniqueProjectName,
          workspaceId: "ws-123",
          departmentId: "dept-1",
          isClientProject: true,
          clientId: "client-1",
          internalProductId: null,
          memberIds: ["user-1", "user-2"], // Current user and workspace owner
        }),
      });
    });

    // Check that toast.success was called
    await waitFor(() => {
      expect(jest.requireMock("sonner").toast.success).toHaveBeenCalledWith(
        `Project "New Project" created successfully!`
      );
    });

    // Now the sheet should be closed
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("should show validation error if required fields are missing", async () => {
    render(
      <TestWrapper>
        <CreateProjectModal workspaceId="ws-123" />
      </TestWrapper>
    );
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    await screen.findByRole("dialog");

    const submitButton = screen.getByRole("button", { name: /create project/i });
    const clientSwitch = screen.getByLabelText(/External Client Project/i);

    // Add project name to test subsequent validations
    fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: "Test Validation Project" },
    });

    // Case 1: No department selected
    fireEvent.click(submitButton);
    await waitFor(() => {
       expect(jest.requireMock("sonner").toast.error).toHaveBeenCalledWith("Please select a department for this project.");
    });

    // Select a department to proceed
    await selectFromDropdown("Select a department", "Engineering");

    // Case 2: No internal product selected (default)
    fireEvent.click(submitButton);
     await waitFor(() => {
       expect(jest.requireMock("sonner").toast.error).toHaveBeenCalledWith("Please select an internal product.");
    });
   
    // Case 3: No client selected (after toggling switch)
    fireEvent.click(clientSwitch);
    await screen.findByText("Select a client"); // Wait for UI update
    fireEvent.click(submitButton);
     await waitFor(() => {
       expect(jest.requireMock("sonner").toast.error).toHaveBeenCalledWith("Please select an external client.");
    });
  }
);
});
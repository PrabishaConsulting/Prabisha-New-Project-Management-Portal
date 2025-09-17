import { getUserByEmail } from "@/utils/helper-server-function";

// Mock db
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));
const { db } = require("@/lib/db");


describe("getUserByEmail", () => {
  it("should return error for invalid email", async () => {
    const result = await getUserByEmail("not-an-email");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email format");
    expect(result.user).toBeNull();
  });

  it("should return error if user not found", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await getUserByEmail("test@example.com");
    expect(result.success).toBe(false);
    expect(result.error).toBe("User not found");
  });

  it("should return success if user found", async () => {
    const fakeUser = { id: "123", name: "John", email: "test@example.com" };
    db.user.findUnique.mockResolvedValue(fakeUser);

    const result = await getUserByEmail("test@example.com");
    expect(result.success).toBe(true);
    expect(result.user).toEqual(fakeUser);
    expect(result.error).toBeNull();
  });

  
  it("should handle database errors", async () => {
    db.user.findUnique.mockRejectedValue(new Error("DB fail"));

    const result = await getUserByEmail("test@example.com");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Internal server error");
  });
});
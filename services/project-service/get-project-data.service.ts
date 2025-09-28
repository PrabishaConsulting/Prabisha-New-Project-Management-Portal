import { db } from "@/lib/db";

// Type definitions for Project operations
interface ProjectFilters {
  id?: string;
  name?: string;
  status?: string;
  userId?: string;
  categoryId?: string;
  isActive?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  updatedAt?: {
    gte?: Date;
    lte?: Date;
  };
  search?: string; // For searching across multiple fields
}

interface ProjectPagination {
  page?: number;
  limit?: number;
  offset?: number;
}

interface ProjectSortOptions {
  field?: "id" | "name" | "createdAt" | "updatedAt" | "status";
  direction?: "asc" | "desc";
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

class ProjectService {
  /**
   * Get all projects with filtering, pagination, and sorting
   * @param filters - Filter conditions for projects
   * @param pagination - Pagination options
   * @param sort - Sorting options
   * @param includeRelations - Whether to include related data
   * @returns ServiceResponse with projects array and pagination meta
   */
  async getAllProjects(
    filters: ProjectFilters = {},
    pagination: ProjectPagination = {},
    sort: ProjectSortOptions = {},
    includeRelations: boolean = false
  ): Promise<ServiceResponse<any[]>> {
    try {
      // Set default pagination
      const { page = 1, limit = 10, offset } = pagination;
      const skip = offset !== undefined ? offset : (page - 1) * limit;
      const take = Math.min(limit, 100); // Max 100 records per request

      // Validate pagination
      if (page < 1 || limit < 1 || skip < 0) {
        return {
          success: false,
          error: "Invalid pagination parameters",
          message: "Page and limit must be positive numbers",
        };
      }

      // Build where clause
      const whereClause = this.buildWhereClause(filters);

      // Build orderBy clause
      const { field = "createdAt", direction = "desc" } = sort;
      const orderBy = { [field]: direction };

      // Build include clause for relations
      const includeClause = includeRelations
        ? {
            members: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
            // Add other relations as needed
          }
        : undefined;

      // Get total count for pagination
      const total = await db.project.count({
        where: whereClause,
      });

      // Get projects
      const projects = await db.project.findMany({
        where: whereClause,
        include: includeClause as any,
        orderBy,
        skip,
        take,
      });

      const totalPages = Math.ceil(total / take);

      return {
        success: true,
        data: projects,
        message: `${projects.length} projects retrieved successfully`,
        meta: {
          total,
          page,
          limit: take,
          totalPages,
        },
      };
    } catch (error) {
      return this.handleError(error, "getAllProjects");
    }
  }

  /**
   * Get a single project by ID
   * @param id - Project ID
   * @param includeRelations - Whether to include related data
   * @returns ServiceResponse with single project
   */
  async getProjectById(
    id: string,
    includeRelations: boolean = false
  ): Promise<ServiceResponse<any>> {
    try {
      if (!id || typeof id !== "string") {
        return {
          success: false,
          error: "Invalid project ID",
          message: "Project ID must be a valid string",
        };
      }

      const includeClause = includeRelations
        ? {
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
          }
        : undefined;

      const project = await db.project.findUnique({
        where: { id },
        include: includeClause,
      });

      if (!project) {
        return {
          success: false,
          error: "Project not found",
          message: `No project found with ID: ${id}`,
        };
      }

      return {
        success: true,
        data: project,
        message: "Project retrieved successfully",
      };
    } catch (error) {
      return this.handleError(error, "getProjectById");
    }
  }

  /**
   * Build where clause for filtering projects
   * @private
   */
  private buildWhereClause(filters: ProjectFilters): any {
    const where: any = {};

    if (filters.id) {
      where.id = filters.id;
    }

    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: "insensitive",
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.createdAt) {
      where.createdAt = filters.createdAt;
    }

    if (filters.updatedAt) {
      where.updatedAt = filters.updatedAt;
    }

    // Handle search across multiple fields
    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    return where;
  }

  /**
   * Handle errors consistently
   * @private
   */
  private handleError(error: any, operation: string): ServiceResponse<any> {
    console.error(`Error in ${operation}:`, error);

    // Handle specific db errors
    if (error.code === "P2002") {
      return {
        success: false,
        error: "Unique constraint violation",
        message: "A record with this data already exists",
      };
    }

    if (error.code === "P2025") {
      return {
        success: false,
        error: "Record not found",
        message: "The requested record does not exist",
      };
    }

    if (error.code === "P2003") {
      return {
        success: false,
        error: "Foreign key constraint violation",
        message: "Referenced record does not exist",
      };
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return {
        success: false,
        error: "Validation error",
        message: error.message || "Invalid data provided",
      };
    }

    // Handle connection errors
    if (error.code === "P1001") {
      return {
        success: false,
        error: "Database connection error",
        message: "Unable to connect to the database",
      };
    }

    // Generic error response
    return {
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while processing your request",
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();

// Export types for use in API routes
export type {
  ProjectFilters,
  ProjectPagination,
  ProjectSortOptions,
  ServiceResponse,
};

// scripts/migrate-db.ts
import { prisma } from '@/lib/prisma';
import * as mysql from 'mysql2/promise';

// Configuration
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'cloud.prabisha.com',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'prabisha_project_management',
  password: process.env.MYSQL_PASSWORD || 'hdsfgdgdcdbvvxvxcbce',
  database: process.env.MYSQL_DATABASE || 'prabisha_project_management',
};

// Helper function to parse comma-separated strings to JSON arrays
function parseToJSONArray(field: any): any[] | undefined {
  if (!field) return undefined;
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      const result = field.split(',').map((item: string) => item.trim()).filter((item: string) => item);
      return result.length > 0 ? result : undefined;
    }
  }
  return undefined;
}

// Helper function to parse social links
function parseSocialLinks(socialLinks: any): any {
  if (!socialLinks) return undefined;
  if (typeof socialLinks === 'object') return socialLinks;
  try {
    return JSON.parse(socialLinks);
  } catch {
    if (typeof socialLinks === 'string') {
      const links: Record<string, string> = {};
      socialLinks.split(',').forEach(link => {
        const [platform, url] = link.split(':');
        if (platform && url) {
          links[platform.trim()] = url.trim();
        }
      });
      return Object.keys(links).length > 0 ? links : undefined;
    }
    return undefined;
  }
}

// Function to migrate departments FIRST
async function migrateDepartments(mysqlConnection: mysql.Connection) {
  console.log('\n🏢 Migrating departments from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'departments' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL departments table: ${existingColumns.join(', ')}`);
    
    const selectQuery = `SELECT id, name FROM departments ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const departments = rows as any[];
    console.log(`✅ Found ${departments.length} departments to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const department of departments) {
      try {
        const existingDepartment = await prisma.department.findUnique({
          where: { name: department.name }
        });
        
        if (existingDepartment) {
          console.log(`⚠️  Department "${department.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        await prisma.department.create({
          data: {
            id: department.id,
            name: department.name,
          },
        });
        
        console.log(`✅ Created department: ${department.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating department ${department.name}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Departments Migration Summary:`);
    console.log(`✅ Created: ${createdCount} departments`);
    console.log(`⚠️  Skipped: ${skippedCount} departments`);
    
  } catch (error) {
    console.error('❌ Departments migration failed:', error);
    throw error;
  }
}

// Function to migrate users
async function migrateUsers(mysqlConnection: mysql.Connection) {
  console.log('\n👥 Migrating users from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL users table: ${existingColumns.join(', ')}`);
    
    let selectFields = ['id', 'email', 'name', 'password', 'avatar', 'role', 'createdAt', 'updatedAt', 
                        'resetToken', 'resetTokenExpiry', 'departmentId', 'userType', 'industry', 'location', 'userCode'];
    
    let isActiveExists = existingColumns.includes('isActive');
    if (isActiveExists) {
      selectFields.push('isActive');
      console.log('✅ Found isActive column');
    } else {
      console.log('⚠️  isActive column not found, defaulting to true');
    }
    
    const selectQuery = `SELECT ${selectFields.join(', ')} FROM users ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const users = rows as any[];
    console.log(`✅ Found ${users.length} users to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });
        
        if (existingUser) {
          console.log(`⚠️  User "${user.email}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let role = user.role?.toUpperCase() || 'MEMBER';
        if (!['ADMIN', 'MANAGER', 'MEMBER', 'INTERNAL'].includes(role)) {
          role = 'MEMBER';
        }
        
        let userType = user.userType?.toUpperCase() || 'INTERNAL';
        if (!['INTERNAL', 'CLIENT'].includes(userType)) {
          userType = 'INTERNAL';
        }
        
        let isActive = true;
        if (isActiveExists) {
          isActive = user.isActive === 1 || user.isActive === true;
        }
        
        let departmentId = user.departmentId || null;
        if (departmentId) {
          const department = await prisma.department.findUnique({
            where: { id: departmentId }
          });
          if (!department) {
            console.log(`⚠️  Department ${departmentId} not found for user ${user.email}, setting to null`);
            departmentId = null;
          }
        }
        
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name || '',
            password: user.password || null,
            avatar: user.avatar || null,
            isActive: isActive,
            role: role as any,
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
            resetToken: user.resetToken || null,
            resetTokenExpiry: user.resetTokenExpiry || null,
            departmentId: departmentId,
            userType: userType as any,
            industry: user.industry || null,
            location: user.location || null,
            userCode: user.userCode || null,
          },
        });
        
        console.log(`✅ Created user: ${user.email} (${user.id})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error);
      }
    }
    
    console.log(`\n📊 Users Migration Summary:`);
    console.log(`✅ Created: ${createdCount} users`);
    console.log(`⚠️  Skipped: ${skippedCount} users`);
    
  } catch (error) {
    console.error('❌ Users migration failed:', error);
    throw error;
  }
}

// Function to migrate workspaces
async function migrateWorkspaces(mysqlConnection: mysql.Connection) {
  console.log('\n🏢 Migrating workspaces from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'workspaces' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL workspaces table: ${existingColumns.join(', ')}`);
    
    let idField = existingColumns.includes('id') ? 'id' : 'id';
    let nameField = existingColumns.includes('name') ? 'name' : 'name';
    let ownerIdField = existingColumns.includes('ownerId') ? 'ownerId' : 'ownerId';
    let createdAtField = existingColumns.includes('createdAt') ? 'createdAt' : 'created_at';
    let updatedAtField = existingColumns.includes('updatedAt') ? 'updatedAt' : 'updated_at';
    
    const selectQuery = `SELECT ${idField}, ${nameField}, ${ownerIdField} as ownerId, ${createdAtField} as created_at, ${updatedAtField} as updated_at FROM workspaces ORDER BY ${idField}`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const workspaces = rows as any[];
    console.log(`✅ Found ${workspaces.length} workspaces to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const workspace of workspaces) {
      try {
        let ownerId = workspace.ownerId;
        if (ownerId) {
          const owner = await prisma.user.findUnique({
            where: { id: ownerId }
          });
          if (!owner) {
            console.log(`⚠️  Owner ${ownerId} not found, skipping workspace ${workspace.name}`);
            skippedCount++;
            continue;
          }
        } else {
          console.log(`⚠️  No owner for workspace ${workspace.name}, skipping`);
          skippedCount++;
          continue;
        }
        
        const existingWorkspace = await prisma.workspace.findFirst({
          where: { name: workspace.name, ownerId: ownerId }
        });
        
        if (existingWorkspace) {
          console.log(`⚠️  Workspace "${workspace.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        await prisma.workspace.create({
          data: {
            id: workspace.id,
            name: workspace.name,
            ownerId: ownerId,
            createdAt: workspace.created_at || new Date(),
            updatedAt: workspace.updated_at || new Date(),
          },
        });
        
        console.log(`✅ Created workspace: ${workspace.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating workspace ${workspace.name}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Workspaces Migration Summary:`);
    console.log(`✅ Created: ${createdCount} workspaces`);
    console.log(`⚠️  Skipped: ${skippedCount} workspaces`);
    
  } catch (error) {
    console.error('❌ Workspaces migration failed:', error);
    throw error;
  }
}

// Function to migrate workspace members
async function migrateWorkspaceMembers(mysqlConnection: mysql.Connection) {
  console.log('\n👥 Migrating workspace members from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('workspace_members', 'workspacemembers', 'WorkspaceMember')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found workspace members table: ${tableName}`);
    } else {
      console.log('⚠️  workspace_members table not found in MySQL, skipping...');
      return;
    }
    
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${tableName}' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL ${tableName} table: ${existingColumns.join(', ')}`);
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const members = rows as any[];
    console.log(`✅ Found ${members.length} workspace members to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const member of members) {
      try {
        const userId = member.userId || member.userId;
        const workspaceId = member.workspaceId || member.workspaceId;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping workspace member`);
          skippedCount++;
          continue;
        }
        
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace) {
          console.log(`⚠️  Workspace ${workspaceId} not found, skipping workspace member`);
          skippedCount++;
          continue;
        }
        
        const existing = await prisma.workspaceMember.findFirst({
          where: { workspaceId: workspaceId, userId: userId }
        });
        
        if (existing) {
          console.log(`⚠️  Workspace member already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let role = (member.role || 'MEMBER').toUpperCase();
        if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
          role = 'MEMBER';
        }
        
        await prisma.workspaceMember.create({
          data: {
            id: member.id,
            workspaceId: workspaceId,
            userId: userId,
            role: role as any,
            joinedAt: member.joinedAt || member.joined_at || new Date(),
          },
        });
        
        console.log(`✅ Created workspace member: ${user.email} in ${workspace.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating workspace member:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Workspace Members Migration Summary:`);
    console.log(`✅ Created: ${createdCount} members`);
    console.log(`⚠️  Skipped: ${skippedCount} members`);
    
  } catch (error) {
    console.error('❌ Workspace members migration failed:', error);
  }
}

// Function to migrate workspace invitations
async function migrateWorkspaceInvitations(mysqlConnection: mysql.Connection) {
  console.log('\n📧 Migrating workspace invitations from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('workspace_invitations', 'workspaceinvitations', 'WorkspaceInvitation')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found workspace invitations table: ${tableName}`);
    } else {
      console.log('⚠️  workspace_invitations table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const invitations = rows as any[];
    console.log(`✅ Found ${invitations.length} workspace invitations to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const invitation of invitations) {
      try {
        const workspaceId = invitation.workspaceId || invitation.workspaceId;
        const invitedById = invitation.invitedById || invitation.invited_byId;
        
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace) {
          console.log(`⚠️  Workspace ${workspaceId} not found, skipping invitation`);
          skippedCount++;
          continue;
        }
        
        const invitedBy = await prisma.user.findUnique({ where: { id: invitedById } });
        if (!invitedBy) {
          console.log(`⚠️  Invited by user ${invitedById} not found, skipping invitation`);
          skippedCount++;
          continue;
        }
        
        const existing = await prisma.workspaceInvitation.findFirst({
          where: { workspaceId: workspaceId, email: invitation.email }
        });
        
        if (existing) {
          console.log(`⚠️  Workspace invitation already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let role = (invitation.role || 'MEMBER').toUpperCase();
        if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
          role = 'MEMBER';
        }
        
        await prisma.workspaceInvitation.create({
          data: {
            id: invitation.id,
            workspaceId: workspaceId,
            email: invitation.email,
            invitedById: invitedById,
            role: role as any,
            token: invitation.token,
            accepted: invitation.accepted === 1 || invitation.accepted === true,
            expiresAt: invitation.expiresAt || invitation.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: invitation.createdAt || invitation.created_at || new Date(),
            temppassword: invitation.temppassword || null,
          },
        });
        
        console.log(`✅ Created invitation for: ${invitation.email}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating invitation:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Workspace Invitations Migration Summary:`);
    console.log(`✅ Created: ${createdCount} invitations`);
    console.log(`⚠️  Skipped: ${skippedCount} invitations`);
    
  } catch (error) {
    console.error('❌ Workspace invitations migration failed:', error);
  }
}

// Function to migrate projects
async function migrateProjects(mysqlConnection: mysql.Connection) {
  console.log('\n📁 Migrating projects from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'projects' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL projects table: ${existingColumns.join(', ')}`);
    
    let selectFields = ['id', 'name', 'description', 'workspaceId', 'projectCode', 'status', 'priority', 
                        'projectType', 'startDate', 'dueDate', 'createdBy', 'createdAt', 'updatedAt',
                        'departmentId', 'clientId', 'isClientProject', 'notes'];
    
    let fieldMapping: Record<string, string> = {};
    for (const field of selectFields) {
      if (!existingColumns.includes(field)) {
        const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (existingColumns.includes(snakeCase)) {
          fieldMapping[field] = snakeCase;
        }
      }
    }
    
    let selectClause = selectFields.map(field => {
      if (fieldMapping[field]) {
        return `${fieldMapping[field]} as ${field}`;
      }
      return field;
    }).join(', ');
    
    const selectQuery = `SELECT ${selectClause} FROM projects ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const projects = rows as any[];
    console.log(`✅ Found ${projects.length} projects to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const project of projects) {
      try {
        let createdBy = project.createdBy;
        if (createdBy) {
          const creator = await prisma.user.findUnique({
            where: { id: createdBy }
          });
          if (!creator) {
            console.log(`⚠️  Creator ${createdBy} not found, skipping project ${project.name}`);
            skippedCount++;
            continue;
          }
        } else {
          console.log(`⚠️  No creator for project ${project.name}, skipping`);
          skippedCount++;
          continue;
        }
        
        if (project.workspaceId) {
          const workspace = await prisma.workspace.findUnique({
            where: { id: project.workspaceId }
          });
          if (!workspace) {
            console.log(`⚠️  Workspace ${project.workspaceId} not found, skipping project ${project.name}`);
            skippedCount++;
            continue;
          }
        } else {
          console.log(`⚠️  No workspace for project ${project.name}, skipping`);
          skippedCount++;
          continue;
        }
        
        const existingProject = await prisma.project.findFirst({
          where: { name: project.name }
        });
        
        if (existingProject) {
          console.log(`⚠️  Project "${project.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let status = project.status?.toUpperCase() || 'ACTIVE';
        if (!['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].includes(status)) {
          status = 'ACTIVE';
        }
        
        let priority = project.priority?.toUpperCase() || 'MEDIUM';
        if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
          priority = 'MEDIUM';
        }
        
        let projectType = project.projectType?.toUpperCase() || 'FIXED_TERM';
        if (!['FIXED_TERM', 'ONGOING'].includes(projectType)) {
          projectType = 'FIXED_TERM';
        }
        
        await prisma.project.create({
          data: {
            id: project.id,
            name: project.name,
            description: project.description || null,
            workspaceId: project.workspaceId,
            projectCode: project.projectCode || null,
            status: status as any,
            priority: priority as any,
            projectType: projectType as any,
            startDate: project.startDate || null,
            dueDate: project.dueDate || null,
            createdBy: createdBy,
            createdAt: project.createdAt || new Date(),
            updatedAt: project.updatedAt || new Date(),
            departmentId: project.departmentId || null,
            clientId: project.clientId || null,
            isClientProject: project.isClientProject === 1 || project.isClientProject === true,
            notes: project.notes || null,
          },
        });
        
        console.log(`✅ Created project: ${project.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating project ${project.name}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Projects Migration Summary:`);
    console.log(`✅ Created: ${createdCount} projects`);
    console.log(`⚠️  Skipped: ${skippedCount} projects`);
    
  } catch (error) {
    console.error('❌ Projects migration failed:', error);
    throw error;
  }
}

// Function to migrate project members
async function migrateProjectMembers(mysqlConnection: mysql.Connection) {
  console.log('\n👥 Migrating project members from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('project_members', 'projectmembers', 'ProjectMember')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found project members table: ${tableName}`);
    } else {
      console.log('⚠️  project_members table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const members = rows as any[];
    console.log(`✅ Found ${members.length} project members to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const member of members) {
      try {
        const userId = member.userId || member.userId;
        const projectId = member.projectId || member.projectId;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping project member`);
          skippedCount++;
          continue;
        }
        
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          console.log(`⚠️  Project ${projectId} not found, skipping project member`);
          skippedCount++;
          continue;
        }
        
        const existing = await prisma.projectMember.findFirst({
          where: { projectId: projectId, userId: userId }
        });
        
        if (existing) {
          console.log(`⚠️  Project member already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let role = (member.role || 'MEMBER').toUpperCase();
        if (!['LEAD', 'MEMBER'].includes(role)) {
          role = 'MEMBER';
        }
        
        await prisma.projectMember.create({
          data: {
            id: member.id,
            projectId: projectId,
            userId: userId,
            role: role as any,
            assignedAt: member.assignedAt || member.assigned_at || new Date(),
          },
        });
        
        console.log(`✅ Created project member: ${user.email} in ${project.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating project member:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Project Members Migration Summary:`);
    console.log(`✅ Created: ${createdCount} members`);
    console.log(`⚠️  Skipped: ${skippedCount} members`);
    
  } catch (error) {
    console.error('❌ Project members migration failed:', error);
  }
}

// Function to migrate tasks
async function migrateTasks(mysqlConnection: mysql.Connection) {
  console.log('\n✅ Migrating tasks from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tasks' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL tasks table: ${existingColumns.join(', ')}`);
    
    let selectFields = ['id', 'title'];
    
    if (existingColumns.includes('task_code')) selectFields.push('task_code');
    if (existingColumns.includes('description')) selectFields.push('description');
    if (existingColumns.includes('projectId')) selectFields.push('projectId');
    if (existingColumns.includes('assigneeId')) selectFields.push('assigneeId');
    if (existingColumns.includes('reporterId')) selectFields.push('reporterId');
    if (existingColumns.includes('position')) selectFields.push('position');
    if (existingColumns.includes('task_type')) selectFields.push('task_type');
    if (existingColumns.includes('priority')) selectFields.push('priority');
    if (existingColumns.includes('status')) selectFields.push('status');
    if (existingColumns.includes('estimated_minutes')) selectFields.push('estimated_minutes');
    if (existingColumns.includes('actual_minutes')) selectFields.push('actual_minutes');
    if (existingColumns.includes('start_date')) selectFields.push('start_date');
    if (existingColumns.includes('due_date')) selectFields.push('due_date');
    if (existingColumns.includes('completed_at')) selectFields.push('completed_at');
    if (existingColumns.includes('created_at')) selectFields.push('created_at');
    if (existingColumns.includes('updated_at')) selectFields.push('updated_at');
    if (existingColumns.includes('departmentId')) selectFields.push('departmentId');
    if (existingColumns.includes('estimated_hours')) selectFields.push('estimated_hours as estimated_minutes');
    if (existingColumns.includes('actual_hours')) selectFields.push('actual_hours as actual_minutes');
    
    const selectQuery = `SELECT ${selectFields.join(', ')} FROM tasks ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const tasks = rows as any[];
    console.log(`✅ Found ${tasks.length} tasks to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const task of tasks) {
      console.log(`\n🔄 Processing task: ${task.title} (ID: ${task.id}) (ProjectId: ${task.projectId})`);
      try {
        if (task.projectId) {
          const project = await prisma.project.findUnique({
            where: { id: task.projectId }
          });
          if (!project) {
            console.log(`⚠️  Project ${task.projectId} not found, skipping task ${task.title}`);
            skippedCount++;
            continue;
          }
        } else {
          console.log(`⚠️  No project for task ${task.title}, skipping`);
          skippedCount++;
          continue;
        }
        
        let reporterId = task.reporterId;
        if (reporterId) {
          const reporter = await prisma.user.findUnique({
            where: { id: reporterId }
          });
          if (!reporter) {
            console.log(`⚠️  Reporter ${reporterId} not found, skipping task ${task.title}`);
            skippedCount++;
            continue;
          }
        } else {
          console.log(`⚠️  No reporter for task ${task.title}, skipping`);
          skippedCount++;
          continue;
        }
        
        let assigneeId = task.assigneeId || null;
        if (assigneeId) {
          const assignee = await prisma.user.findUnique({
            where: { id: assigneeId }
          });
          if (!assignee) assigneeId = null;
        }
        
        const existingTask = await prisma.task.findFirst({
          where: { title: task.title, projectId: task.projectId }
        });
        
        if (existingTask) {
          console.log(`⚠️  Task "${task.title}" already exists in project, skipping...`);
          skippedCount++;
          continue;
        }
        
        let taskType = task.task_type?.toUpperCase() || 'TASK';
        if (!['TASK', 'BUG', 'FEATURE', 'IMPROVEMENT', 'EPIC'].includes(taskType)) {
          taskType = 'TASK';
        }
        
        let priority = task.priority?.toUpperCase() || 'MEDIUM';
        if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
          priority = 'MEDIUM';
        }
        
        let status = task.status?.toUpperCase() || 'TO_DO';
        if (!['TO_DO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
          status = 'TO_DO';
        }
        
        let departmentId = task.departmentId || null;
        if (departmentId) {
          const department = await prisma.department.findUnique({
            where: { id: departmentId }
          });
          if (!department) {
            console.log(`⚠️  Department ${departmentId} not found for task ${task.title}, setting to null`);
            departmentId = null;
          }
        }
        
        let estimatedMinutes = task.estimated_minutes || null;
        let actualMinutes = task.actual_minutes || 0;
        
        await prisma.task.create({
          data: {
            id: task.id,
            title: task.title,
            taskCode: task.task_code || null,
            description: task.description || null,
            projectId: task.projectId,
            assigneeId: assigneeId,
            reporterId: reporterId,
            position: task.position || 0,
            taskType: taskType as any,
            priority: priority as any,
            status: status as any,
            estimatedMinutes: estimatedMinutes,
            actualMinutes: actualMinutes,
            startDate: task.start_date || null,
            dueDate: task.due_date || null,
            completedAt: task.completed_at || null,
            createdAt: task.created_at || new Date(),
            updatedAt: task.updated_at || new Date(),
            departmentId: departmentId,
          },
        });
        
        console.log(`✅ Created task: ${task.title}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating task ${task.title}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Tasks Migration Summary:`);
    console.log(`✅ Created: ${createdCount} tasks`);
    console.log(`⚠️  Skipped: ${skippedCount} tasks`);
    
  } catch (error) {
    console.error('❌ Tasks migration failed:', error);
    throw error;
  }
}

// Function to migrate task comments
async function migrateTaskComments(mysqlConnection: mysql.Connection) {
  console.log('\n💬 Migrating task comments from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('task_comments', 'taskcomments', 'TaskComment')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found task comments table: ${tableName}`);
    } else {
      console.log('⚠️  task_comments table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const comments = rows as any[];
    console.log(`✅ Found ${comments.length} task comments to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const comment of comments) {
      try {
        const userId = comment.userId || comment.userId;
        const taskId = comment.taskId || comment.taskId;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping comment`);
          skippedCount++;
          continue;
        }
        
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
          console.log(`⚠️  Task ${taskId} not found, skipping comment`);
          skippedCount++;
          continue;
        }
        
        await prisma.taskComment.create({
          data: {
            id: comment.id,
            taskId: taskId,
            userId: userId,
            content: comment.content,
            createdAt: comment.createdAt || comment.created_at || new Date(),
            updatedAt: comment.updatedAt || comment.updated_at || new Date(),
          },
        });
        
        console.log(`✅ Created comment for task: ${task.title}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating comment:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Task Comments Migration Summary:`);
    console.log(`✅ Created: ${createdCount} comments`);
    console.log(`⚠️  Skipped: ${skippedCount} comments`);
    
  } catch (error) {
    console.error('❌ Task comments migration failed:', error);
  }
}

// Function to migrate task attachments
async function migrateTaskAttachments(mysqlConnection: mysql.Connection) {
  console.log('\n📎 Migrating task attachments from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('task_attachments', 'taskattachments', 'TaskAttachment')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found task attachments table: ${tableName}`);
    } else {
      console.log('⚠️  task_attachments table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const attachments = rows as any[];
    console.log(`✅ Found ${attachments.length} task attachments to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const attachment of attachments) {
      try {
        const userId = attachment.userId || attachment.userId;
        const taskId = attachment.taskId || attachment.taskId;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping attachment`);
          skippedCount++;
          continue;
        }
        
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
          console.log(`⚠️  Task ${taskId} not found, skipping attachment`);
          skippedCount++;
          continue;
        }
        
        await prisma.taskAttachment.create({
          data: {
            id: attachment.id,
            taskId: taskId,
            userId: userId,
            filename: attachment.filename,
            url: attachment.url,
            fileSize: attachment.fileSize || attachment.file_size || null,
            mimeType: attachment.mimeType || attachment.mime_type || null,
            uploadedAt: attachment.uploadedAt || attachment.uploaded_at || new Date(),
          },
        });
        
        console.log(`✅ Created attachment for task: ${task.title}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating attachment:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Task Attachments Migration Summary:`);
    console.log(`✅ Created: ${createdCount} attachments`);
    console.log(`⚠️  Skipped: ${skippedCount} attachments`);
    
  } catch (error) {
    console.error('❌ Task attachments migration failed:', error);
  }
}

// Function to migrate time entries
async function migrateTimeEntries(mysqlConnection: mysql.Connection) {
  console.log('\n⏱️  Migrating time entries from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('time_entries', 'timeentries', 'TimeEntry')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found time entries table: ${tableName}`);
    } else {
      console.log('⚠️  time_entries table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const entries = rows as any[];
    console.log(`✅ Found ${entries.length} time entries to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const entry of entries) {
      try {
        const userId = entry.userId || entry.userId;
        const taskId = entry.taskId || entry.taskId;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping time entry`);
          skippedCount++;
          continue;
        }
        
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
          console.log(`⚠️  Task ${taskId} not found, skipping time entry`);
          skippedCount++;
          continue;
        }
        
        await prisma.timeEntry.create({
          data: {
            id: entry.id,
            taskId: taskId,
            userId: userId,
            description: entry.description || null,
            minutes: entry.minutes || 0,
            startedAt: entry.startedAt || entry.started_at || null,
            stoppedAt: entry.stoppedAt || entry.stopped_at || null,
            isRunning: entry.isRunning || entry.is_running || false,
            date: entry.date || new Date(),
            createdAt: entry.createdAt || entry.created_at || new Date(),
            updatedAt: entry.updatedAt || entry.updated_at || new Date(),
          },
        });
        
        console.log(`✅ Created time entry for task: ${task.title}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating time entry:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Time Entries Migration Summary:`);
    console.log(`✅ Created: ${createdCount} entries`);
    console.log(`⚠️  Skipped: ${skippedCount} entries`);
    
  } catch (error) {
    console.error('❌ Time entries migration failed:', error);
  }
}

// Function to migrate activity logs
async function migrateActivityLogs(mysqlConnection: mysql.Connection) {
  console.log('\n📝 Migrating activity logs from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('activity_logs', 'activitylogs', 'ActivityLog')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found activity logs table: ${tableName}`);
    } else {
      console.log('⚠️  activity_logs table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const logs = rows as any[];
    console.log(`✅ Found ${logs.length} activity logs to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const log of logs) {
      try {
        const userId = log.userId || log.userId;
        const projectId = log.projectId || log.projectId;
        const taskId = log.taskId || log.taskId;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping activity log`);
          skippedCount++;
          continue;
        }
        
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          console.log(`⚠️  Project ${projectId} not found, skipping activity log`);
          skippedCount++;
          continue;
        }
        
        let task = null;
        if (taskId) {
          task = await prisma.task.findUnique({ where: { id: taskId } });
        }
        
        await prisma.activityLog.create({
          data: {
            id: log.id,
            userId: userId,
            projectId: projectId,
            taskId: taskId || null,
            action: log.action,
            description: log.description || null,
            metadata: log.metadata || null,
            createdAt: log.createdAt || log.created_at || new Date(),
          },
        });
        
        console.log(`✅ Created activity log for project: ${project.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating activity log:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Activity Logs Migration Summary:`);
    console.log(`✅ Created: ${createdCount} logs`);
    console.log(`⚠️  Skipped: ${skippedCount} logs`);
    
  } catch (error) {
    console.error('❌ Activity logs migration failed:', error);
  }
}

// Function to migrate internal products
async function migrateInternalProducts(mysqlConnection: mysql.Connection) {
  console.log('\n🏭 Migrating internal products from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('internal_products', 'internalproducts', 'InternalProduct')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found internal products table: ${tableName}`);
    } else {
      console.log('⚠️  internal_products table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const products = rows as any[];
    console.log(`✅ Found ${products.length} internal products to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      try {
        const existing = await prisma.internalProduct.findUnique({
          where: { name: product.name }
        });
        
        if (existing) {
          console.log(`⚠️  Internal product "${product.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        await prisma.internalProduct.create({
          data: {
            id: product.id,
            name: product.name,
            email: product.email || null,
            internalCode: product.internalCode || product.internal_code || null,
            industry: product.industry || null,
            location: product.location || null,
            createdAt: product.createdAt || product.created_at || new Date(),
            updatedAt: product.updatedAt || product.updated_at || new Date(),
          },
        });
        
        console.log(`✅ Created internal product: ${product.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating internal product:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Internal Products Migration Summary:`);
    console.log(`✅ Created: ${createdCount} products`);
    console.log(`⚠️  Skipped: ${skippedCount} products`);
    
  } catch (error) {
    console.error('❌ Internal products migration failed:', error);
  }
}

// Function to migrate categories (for products)
async function migrateProductCategories(mysqlConnection: mysql.Connection) {
  console.log('\n📂 Migrating product categories from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'categories' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL categories table: ${existingColumns.join(', ')}`);
    
    let selectFields = ['id', 'name'];
    if (existingColumns.includes('description')) selectFields.push('description');
    
    const selectQuery = `SELECT ${selectFields.join(', ')} FROM categories ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const categories = rows as any[];
    console.log(`✅ Found ${categories.length} product categories to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const category of categories) {
      try {
        const existingCategory = await prisma.categories.findUnique({
          where: { name: category.name }
        });
        
        if (existingCategory) {
          console.log(`⚠️  Category "${category.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        await prisma.categories.create({
          data: {
            id: category.id,
            name: category.name,
            description: category.description || null,
          },
        });
        
        console.log(`✅ Created category: ${category.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating category ${category.name}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Product Categories Migration Summary:`);
    console.log(`✅ Created: ${createdCount} categories`);
    console.log(`⚠️  Skipped: ${skippedCount} categories`);
    
  } catch (error) {
    console.error('❌ Product categories migration failed:', error);
    throw error;
  }
}

// Function to migrate products
async function migrateProducts(mysqlConnection: mysql.Connection) {
  console.log('\n📦 Migrating products from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'products' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL products table: ${existingColumns.join(', ')}`);
    
    let selectFields = ['id', 'title'];
    
    if (existingColumns.includes('status')) selectFields.push('status');
    if (existingColumns.includes('url')) selectFields.push('url');
    if (existingColumns.includes('icon')) selectFields.push('icon');
    if (existingColumns.includes('image')) selectFields.push('image');
    if (existingColumns.includes('createdAt')) selectFields.push('createdAt');
    if (existingColumns.includes('updatedAt')) selectFields.push('updatedAt');
    if (existingColumns.includes('created_at')) selectFields.push('created_at as createdAt');
    if (existingColumns.includes('updated_at')) selectFields.push('updated_at as updatedAt');
    
    const selectQuery = `SELECT ${selectFields.join(', ')} FROM products ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const products = rows as any[];
    console.log(`✅ Found ${products.length} products to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      try {
        const existingProduct = await prisma.products.findFirst({
          where: { title: product.title }
        });
        
        if (existingProduct) {
          console.log(`⚠️  Product "${product.title}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let status = product.status?.toUpperCase() || 'PENDING';
        if (!['PENDING', 'ACTIVE', 'INACTIVE'].includes(status)) {
          status = 'PENDING';
        }
        
        await prisma.products.create({
          data: {
            id: product.id,
            title: product.title,
            status: status as any,
            url: product.url || null,
            icon: product.icon || null,
            image: product.image || null,
            createdAt: product.createdAt || new Date(),
            updatedAt: product.updatedAt || new Date(),
          },
        });
        
        console.log(`✅ Created product: ${product.title}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating product ${product.title}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Products Migration Summary:`);
    console.log(`✅ Created: ${createdCount} products`);
    console.log(`⚠️  Skipped: ${skippedCount} products`);
    
  } catch (error) {
    console.error('❌ Products migration failed:', error);
    throw error;
  }
}

// Function to migrate assets
async function migrateAssets(mysqlConnection: mysql.Connection) {
  console.log('\n💼 Migrating assets from MySQL to PostgreSQL...');
  
  try {
    const [columns] = await mysqlConnection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'assets' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns in MySQL assets table: ${existingColumns.join(', ')}`);
    
    let selectFields = ['id'];
    
    if (existingColumns.includes('asset_type')) selectFields.push('asset_type');
    if (existingColumns.includes('provider')) selectFields.push('provider');
    if (existingColumns.includes('name')) selectFields.push('name');
    if (existingColumns.includes('domain_name')) selectFields.push('domain_name');
    if (existingColumns.includes('ip_address')) selectFields.push('ip_address');
    if (existingColumns.includes('hosting_plan')) selectFields.push('hosting_plan');
    if (existingColumns.includes('server_location')) selectFields.push('server_location');
    if (existingColumns.includes('purchase_date')) selectFields.push('purchase_date');
    if (existingColumns.includes('expiry_date')) selectFields.push('expiry_date');
    if (existingColumns.includes('auto_renew')) selectFields.push('auto_renew');
    if (existingColumns.includes('renewal_period')) selectFields.push('renewal_period');
    if (existingColumns.includes('status')) selectFields.push('status');
    if (existingColumns.includes('live_status')) selectFields.push('live_status');
    if (existingColumns.includes('last_checked')) selectFields.push('last_checked');
    if (existingColumns.includes('control_panel_url')) selectFields.push('control_panel_url');
    if (existingColumns.includes('username')) selectFields.push('username');
    if (existingColumns.includes('password')) selectFields.push('password');
    if (existingColumns.includes('notes')) selectFields.push('notes');
    if (existingColumns.includes('created_at')) selectFields.push('created_at');
    if (existingColumns.includes('updated_at')) selectFields.push('updated_at');
    if (existingColumns.includes('createdAt')) selectFields.push('createdAt');
    if (existingColumns.includes('updatedAt')) selectFields.push('updatedAt');
    
    const selectQuery = `SELECT ${selectFields.join(', ')} FROM assets ORDER BY id`;
    console.log(`📝 Executing query: ${selectQuery}`);
    
    const [rows] = await mysqlConnection.execute(selectQuery);
    const assets = rows as any[];
    console.log(`✅ Found ${assets.length} assets to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const asset of assets) {
      try {
        const existingAsset = await prisma.asset.findFirst({
          where: { name: asset.name }
        });
        
        if (existingAsset) {
          console.log(`⚠️  Asset "${asset.name}" already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        let assetType = asset.asset_type?.toUpperCase() || 'OTHER';
        if (!['DOMAIN', 'HOSTING', 'VPS', 'SSL', 'OTHER'].includes(assetType)) {
          assetType = 'OTHER';
        }
        
        let renewalPeriod = asset.renewal_period?.toUpperCase() || 'YEARLY';
        if (!['MONTHLY', 'QUARTERLY', 'YEARLY', 'BIENNIAL', 'TRIENNIAL', 'CUSTOM'].includes(renewalPeriod)) {
          renewalPeriod = 'YEARLY';
        }
        
        let assetStatus = asset.status?.toUpperCase() || 'ACTIVE';
        if (!['ACTIVE', 'EXPIRED', 'PENDING_RENEWAL'].includes(assetStatus)) {
          assetStatus = 'ACTIVE';
        }
        
        let liveStatus = asset.live_status?.toUpperCase() || 'UNKNOWN';
        if (!['ONLINE', 'OFFLINE', 'UNKNOWN', 'SSL_ERROR', 'INVALID_DOMAIN'].includes(liveStatus)) {
          liveStatus = 'UNKNOWN';
        }
        
        let createdAt = asset.created_at || asset.createdAt || new Date();
        let updatedAt = asset.updated_at || asset.updatedAt || new Date();
        
        await prisma.asset.create({
          data: {
            id: asset.id,
            assetType: assetType as any,
            provider: asset.provider || 'TVMServer',
            name: asset.name,
            domainName: asset.domain_name || null,
            ipAddress: asset.ip_address || null,
            hostingPlan: asset.hosting_plan || null,
            serverLocation: asset.server_location || null,
            purchaseDate: asset.purchase_date || new Date(),
            expiryDate: asset.expiry_date || new Date(),
            autoRenew: asset.auto_renew === 1 || asset.auto_renew === true,
            renewalPeriod: renewalPeriod as any,
            status: assetStatus as any,
            liveStatus: liveStatus as any,
            lastChecked: asset.last_checked || null,
            controlPanelUrl: asset.control_panel_url || null,
            username: asset.username || null,
            password: asset.password || null,
            notes: asset.notes || null,
            createdAt: createdAt,
            updatedAt: updatedAt,
          },
        });
        
        console.log(`✅ Created asset: ${asset.name}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating asset ${asset.name}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Assets Migration Summary:`);
    console.log(`✅ Created: ${createdCount} assets`);
    console.log(`⚠️  Skipped: ${skippedCount} assets`);
    
  } catch (error) {
    console.error('❌ Assets migration failed:', error);
    throw error;
  }
}

// Function to migrate mistake logs
async function migrateMistakeLogs(mysqlConnection: mysql.Connection) {
  console.log('\n⚠️  Migrating mistake logs from MySQL to PostgreSQL...');
  
  try {
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('mistake_logs', 'mistakelogs', 'MistakeLog')
    `);
    
    let tableName = null;
    if ((tables as any[]).length > 0) {
      tableName = (tables as any[])[0].TABLE_NAME;
      console.log(`📋 Found mistake logs table: ${tableName}`);
    } else {
      console.log('⚠️  mistake_logs table not found in MySQL, skipping...');
      return;
    }
    
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY id`;
    const [rows] = await mysqlConnection.execute(selectQuery);
    const logs = rows as any[];
    console.log(`✅ Found ${logs.length} mistake logs to migrate`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const log of logs) {
      try {
        const authorId = log.authorId || log.authorId;
        const reviewerId = log.reviewerId || log.reviewerId;
        
        let impact = log.impact?.toUpperCase() || 'MEDIUM';
        if (!['LOW', 'MEDIUM', 'HIGH'].includes(impact)) {
          impact = 'MEDIUM';
        }
        
        let category = log.category?.toUpperCase() || 'PROCESS';
        if (!['PROCESS', 'TECHNICAL', 'HUMAN_ERROR'].includes(category)) {
          category = 'PROCESS';
        }
        
        let status = log.status?.toUpperCase() || 'PENDING';
        if (!['PENDING', 'REVIEWED', 'ARCHIVED'].includes(status)) {
          status = 'PENDING';
        }
        
        await prisma.mistakeLog.create({
          data: {
            id: log.id,
            mistakeIdentified: log.mistakeIdentified || log.mistakeIdentified,
            impact: impact as any,
            rootCause: log.rootCause || log.root_cause,
            resolution: log.resolution,
            learnings: log.learnings,
            category: category as any,
            mistakeDate: log.mistakeDate || log.mistake_date || new Date(),
            status: status as any,
            attachments: log.attachments || null,
            authorId: authorId || null,
            reviewerId: reviewerId || null,
            reviewNotes: log.reviewNotes || log.review_notes || null,
            closedAt: log.closedAt || log.closed_at || null,
            createdAt: log.createdAt || log.created_at || new Date(),
            updatedAt: log.updatedAt || log.updated_at || new Date(),
          },
        });
        
        console.log(`✅ Created mistake log: ${log.mistakeIdentified?.substring(0, 50)}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating mistake log:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Mistake Logs Migration Summary:`);
    console.log(`✅ Created: ${createdCount} logs`);
    console.log(`⚠️  Skipped: ${skippedCount} logs`);
    
  } catch (error) {
    console.error('❌ Mistake logs migration failed:', error);
  }
}

// Function to verify migration
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const userCount = await prisma.user.count();
  const departmentCount = await prisma.department.count();
  const workspaceCount = await prisma.workspace.count();
  const workspaceMemberCount = await prisma.workspaceMember.count();
  const workspaceInvitationCount = await prisma.workspaceInvitation.count();
  const projectCount = await prisma.project.count();
  const projectMemberCount = await prisma.projectMember.count();
  const taskCount = await prisma.task.count();
  const taskCommentCount = await prisma.taskComment.count();
  const taskAttachmentCount = await prisma.taskAttachment.count();
  const timeEntryCount = await prisma.timeEntry.count();
  const activityLogCount = await prisma.activityLog.count();
  const categoryCount = await prisma.categories.count();
  const productCount = await prisma.products.count();
  const assetCount = await prisma.asset.count();
  const internalProductCount = await prisma.internalProduct.count();
  const mistakeLogCount = await prisma.mistakeLog.count();
  
  console.log(`\n📊 Migration Statistics:`);
  console.log(`👥 Total users: ${userCount}`);
  console.log(`🏢 Total departments: ${departmentCount}`);
  console.log(`🏢 Total workspaces: ${workspaceCount}`);
  console.log(`👥 Total workspace members: ${workspaceMemberCount}`);
  console.log(`📧 Total workspace invitations: ${workspaceInvitationCount}`);
  console.log(`📁 Total projects: ${projectCount}`);
  console.log(`👥 Total project members: ${projectMemberCount}`);
  console.log(`✅ Total tasks: ${taskCount}`);
  console.log(`💬 Total task comments: ${taskCommentCount}`);
  console.log(`📎 Total task attachments: ${taskAttachmentCount}`);
  console.log(`⏱️  Total time entries: ${timeEntryCount}`);
  console.log(`📝 Total activity logs: ${activityLogCount}`);
  console.log(`📂 Total product categories: ${categoryCount}`);
  console.log(`📦 Total products: ${productCount}`);
  console.log(`💼 Total assets: ${assetCount}`);
  console.log(`🏭 Total internal products: ${internalProductCount}`);
  console.log(`⚠️  Total mistake logs: ${mistakeLogCount}`);
  
  // Display sample data
  const sampleProjects = await prisma.project.findMany({
    take: 3,
    select: { 
      id: true, 
      name: true, 
      status: true,
      createdAt: true 
    }
  });
  
  console.log('\n📋 Sample projects:');
  sampleProjects.forEach(project => {
    console.log(`  - ${project.name} (${project.status})`);
  });
  
  const sampleTasks = await prisma.task.findMany({
    take: 3,
    select: { title: true, status: true, priority: true }
  });
  
  console.log('\n✅ Sample tasks:');
  sampleTasks.forEach(task => {
    console.log(`  - ${task.title} (${task.status}, ${task.priority})`);
  });
  
  const sampleWorkspaceMembers = await prisma.workspaceMember.findMany({
    take: 3,
    include: { user: true, workspace: true }
  });
  
  console.log('\n👥 Sample workspace members:');
  sampleWorkspaceMembers.forEach(member => {
    console.log(`  - ${member.user.email} in ${member.workspace.name} (${member.role})`);
  });
}

// Main migration orchestrator
async function migrateAll() {
  let mysqlConnection: mysql.Connection | null = null;
  
  try {
    console.log('🚀 Starting full migration from MySQL to PostgreSQL...');
    console.log('===================================================');
    
    // 1. Connect to MySQL
    console.log('\n📡 Connecting to MySQL database...');
    mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL');
    
    // 2. Test PostgreSQL connection
    console.log('\n🐘 Testing PostgreSQL connection...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');
    
    // 3. Migrate base tables (no dependencies)
    //await migrateDepartments(mysqlConnection);
    //await migrateUsers(mysqlConnection);
    
    // 4. Migrate workspace related tables
    //await migrateWorkspaces(mysqlConnection);
    //await migrateWorkspaceMembers(mysqlConnection);
    //await migrateWorkspaceInvitations(mysqlConnection);
    
    // 5. Migrate project related tables
    //await migrateProjects(mysqlConnection);
    //await migrateProjectMembers(mysqlConnection);
    //await migrateInternalProducts(mysqlConnection);
    
    // 6. Migrate task related tables
    //await migrateTasks(mysqlConnection);
    //await migrateTaskComments(mysqlConnection);
    //await migrateTaskAttachments(mysqlConnection);
    //await migrateTimeEntries(mysqlConnection);
    
    // 7. Migrate activity logs
    //await migrateActivityLogs(mysqlConnection);
    
    // 8. Migrate product related tables
    await migrateProductCategories(mysqlConnection);
    await migrateProducts(mysqlConnection);
    
    // 9. Migrate assets
    await migrateAssets(mysqlConnection);
    
    // 10. Migrate mistake logs
    await migrateMistakeLogs(mysqlConnection);
    
    // 11. Verify migration
    await verifyMigration();
    
    console.log('\n🎉 Full migration completed successfully!');
    console.log('====================================');
    
  } catch (error) {
    console.error('\n💥 Migration failed with error:', error);
    throw error;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('\n📡 MySQL connection closed');
    }
    await prisma.$disconnect();
    console.log('🐘 PostgreSQL connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateAll()
    .then(() => {
      console.log('\n✨ Script execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script execution failed:', error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
export { 
  migrateAll, 
  migrateUsers, 
  migrateDepartments,
  migrateWorkspaces,
  migrateWorkspaceMembers,
  migrateWorkspaceInvitations,
  migrateProjects,
  migrateProjectMembers,
  migrateTasks,
  migrateTaskComments,
  migrateTaskAttachments,
  migrateTimeEntries,
  migrateActivityLogs,
  migrateProductCategories,
  migrateProducts,
  migrateAssets,
  migrateInternalProducts,
  migrateMistakeLogs,
  verifyMigration 
};
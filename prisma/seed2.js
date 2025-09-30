const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create roles
  const adminRole = await prisma.role2.create({
    data: {
      name: 'ADMIN',
    }
  });

  const userRole = await prisma.role2.create({
    data: {
      name: 'USER',
    }
  });

  // Create sidebar groups
  const generalGroup = await prisma.sidebarGroup.create({
    data: {
      title: 'General',
      position: 1,
      isActive: true,
      items: {
        create: [
          {
            label: 'Dashboard',
            href: '/dashboard',
            icon: 'dashboard',
            position: 1,
            isActive: true
          },
          {
            label: 'Profile',
            href: '/profile',
            icon: 'user',
            position: 2,
            isActive: true
          }
        ]
      }
    }
  });

  const settingsGroup = await prisma.sidebarGroup.create({
    data: {
      title: 'Settings',
      position: 2,
      isActive: true,
      items: {
        create: [
          {
            label: 'Account',
            href: '/settings/account',
            icon: 'settings',
            position: 1,
            isActive: true
          },
          {
            label: 'Preferences',
            href: '/settings/preferences',
            icon: 'tune',
            position: 2,
            isActive: true
          }
        ]
      }
    }
  });

  const adminGroup = await prisma.sidebarGroup.create({
    data: {
      title: 'Admin',
      position: 3,
      isActive: true,
      items: {
        create: [
          {
            label: 'User Management',
            href: '/admin/users',
            icon: 'group',
            position: 1,
            isActive: true
          },
          {
            label: 'System Logs',
            href: '/admin/logs',
            icon: 'description',
            position: 2,
            isActive: true
          }
        ]
      }
    }
  });

  // Create role access for groups
  await prisma.sidebarGroupAccess.createMany({
    data: [
      // Admin access to all groups
      { roleId: adminRole.id, sidebarGroupId: generalGroup.id, hasAccess: true },
      { roleId: adminRole.id, sidebarGroupId: settingsGroup.id, hasAccess: true },
      { roleId: adminRole.id, sidebarGroupId: adminGroup.id, hasAccess: true },
      
      // User access to limited groups
      { roleId: userRole.id, sidebarGroupId: generalGroup.id, hasAccess: true },
      { roleId: userRole.id, sidebarGroupId: settingsGroup.id, hasAccess: true },
      { roleId: userRole.id, sidebarGroupId: adminGroup.id, hasAccess: false }
    ]
  });

  // Create role access for items
  await prisma.sidebarItemAccess.createMany({
    data: [
      // Admin access to all items
      { roleId: adminRole.id, sidebarItemId: generalGroup.items[0].id, hasAccess: true }, // Dashboard
      { roleId: adminRole.id, sidebarItemId: generalGroup.items[1].id, hasAccess: true }, // Profile
      { roleId: adminRole.id, sidebarItemId: settingsGroup.items[0].id, hasAccess: true }, // Account
      { roleId: adminRole.id, sidebarItemId: settingsGroup.items[1].id, hasAccess: true }, // Preferences
      { roleId: adminRole.id, sidebarItemId: adminGroup.items[0].id, hasAccess: true }, // User Management
      { roleId: adminRole.id, sidebarItemId: adminGroup.items[1].id, hasAccess: true }, // System Logs
      
      // User access to limited items
      { roleId: userRole.id, sidebarItemId: generalGroup.items[0].id, hasAccess: true }, // Dashboard
      { roleId: userRole.id, sidebarItemId: generalGroup.items[1].id, hasAccess: true }, // Profile
      { roleId: userRole.id, sidebarItemId: settingsGroup.items[0].id, hasAccess: true }, // Account
      { roleId: userRole.id, sidebarItemId: settingsGroup.items[1].id, hasAccess: true }, // Preferences
      { roleId: userRole.id, sidebarItemId: adminGroup.items[0].id, hasAccess: false }, // User Management
      { roleId: userRole.id, sidebarItemId: adminGroup.items[1].id, hasAccess: false } // System Logs
    ]
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
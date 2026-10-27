import type { Role } from '@prisma/client';

export type Permission =
  | 'customers.read' | 'customers.write' | 'accounts.create'
  | 'staff.manage' | 'services.manage' | 'whatsapp.manage' | 'email.manage'
  | 'packages.manage' | 'finance.read' | 'finance.write' | 'tickets.handle'
  | 'audit.read' | 'settings.manage';

const MAP: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'customers.read', 'customers.write', 'accounts.create', 'staff.manage', 'services.manage',
    'whatsapp.manage', 'email.manage', 'packages.manage', 'finance.read', 'finance.write',
    'tickets.handle', 'audit.read', 'settings.manage',
  ],
  ADMIN: [
    'customers.read', 'customers.write', 'accounts.create', 'services.manage', 'whatsapp.manage',
    'email.manage', 'packages.manage', 'finance.read', 'tickets.handle', 'audit.read',
  ],
  FINANCE: ['customers.read', 'finance.read', 'finance.write'],
  SUPPORT: ['customers.read', 'tickets.handle'],
  CLIENT: [],
};

export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT'];
export const isStaff = (r: Role) => STAFF_ROLES.includes(r);
export const mfaRequired = (r: Role) => r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'FINANCE';

export function can(user: { role: Role; extraPerms?: string[] }, perm: Permission): boolean {
  return MAP[user.role].includes(perm) || (user.extraPerms ?? []).includes(perm);
}

/** Roles a given role is allowed to create. SUPER_ADMIN can create everything. */
export function creatableRoles(role: Role): Role[] {
  if (role === 'SUPER_ADMIN') return ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'CLIENT'];
  if (role === 'ADMIN') return ['SUPPORT', 'CLIENT'];
  return [];
}

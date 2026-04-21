import { db } from '../db';
import * as schema from '../db/schema';
import { eq, like, or } from 'drizzle-orm';

export type Role = 'VIEWER' | 'EDITOR' | 'MANAGER';

export const ROLE_WEIGHT: Record<Role, number> = {
	VIEWER: 1,
	EDITOR: 2,
	MANAGER: 3
};

export interface EffectiveAccess {
	groupId: string;
	role: Role;
}

/**
 * Resolves a user's full set of effective group memberships and roles
 * by traversing the 3-level hierarchy and applying inheritance rules.
 * 
 * Rule: effectiveRole = max(inheritedRoleFromAncestor, explicitRoleInThisGroup)
 * Returns a mapping of groupId -> Role
 */
export async function resolveEffectiveAccess(userId: string): Promise<Record<string, Role>> {
	// 1. Fetch all explicit memberships for the user
	const explicitMemberships = await db.query.usersToGroups.findMany({
		where: eq(schema.usersToGroups.userId, userId),
		with: {
			group: true
		}
	});

	if (explicitMemberships.length === 0) {
		return {};
	}

	const effective = new Map<string, Role>();

	const updateMaxRole = (groupId: string, role: Role) => {
		const current = effective.get(groupId);
		if (!current || ROLE_WEIGHT[role] > ROLE_WEIGHT[current]) {
			effective.set(groupId, role);
		}
	};

	// 2. For each explicit membership, resolve descendants
	for (const membership of explicitMemberships) {
		// Apply explicit role to the group itself
		updateMaxRole(membership.groupId, membership.role as Role);

		// Materialized Path Inheritance
		const descendants = await db.query.groups.findMany({
			where: like(schema.groups.path, `${membership.group.path}/%`)
		});

		for (const desc of descendants) {
			updateMaxRole(desc.id, membership.role as Role);
		}
	}

	return Object.fromEntries(effective);
}

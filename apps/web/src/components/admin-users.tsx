"use client";

import { type FormEvent, useState, useTransition } from "react";
import type { ManagedUser, ManagedUserSnapshot, UserRole } from "@soji/types";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  editor: "Editor",
  member: "Member"
};

function roleList(accessRole: UserRole): UserRole[] {
  return accessRole === "member" ? ["member"] : ["member", accessRole];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function roleErrorMessage(reason: unknown) {
  if (reason === "last_admin_required") {
    return "Keep at least one admin account before changing this role.";
  }

  if (reason === "user_not_found") {
    return "This user no longer exists. Refresh the page.";
  }

  if (reason === "forbidden") {
    return "Admin access is required to change roles.";
  }

  return "Role update failed. Try again.";
}

function snapshotDrafts(snapshot: ManagedUserSnapshot) {
  return Object.fromEntries(
    snapshot.items.map((user) => [user.id, user.accessRole])
  );
}

export function AdminUsers({
  currentUserId,
  enabled,
  snapshot: initialSnapshot
}: {
  currentUserId?: string;
  enabled: boolean;
  snapshot: ManagedUserSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [drafts, setDrafts] = useState<Record<string, UserRole>>(() =>
    snapshotDrafts(initialSnapshot)
  );
  const [query, setQuery] = useState(initialSnapshot.query);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [message, setMessage] = useState<string | null>(
    initialSnapshot.error ? "Users could not be loaded. Try again." : null
  );
  const [isPending, startTransition] = useTransition();
  const canUseLiveUsers = enabled && snapshot.source === "supabase";
  const users = snapshot.items;
  const firstResult =
    snapshot.totalItems === 0
      ? 0
      : (snapshot.page - 1) * snapshot.pageSize + 1;
  const lastResult = Math.min(
    snapshot.page * snapshot.pageSize,
    snapshot.totalItems
  );

  async function loadUsers(page: number, searchQuery: string) {
    if (!canUseLiveUsers || loadingUsers) {
      return;
    }

    setLoadingUsers(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        query: searchQuery.trim()
      });
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            snapshot?: ManagedUserSnapshot;
          }
        | null;

      if (!response.ok || !result?.ok || !result.snapshot) {
        throw new Error("User search failed. Try again.");
      }

      setSnapshot(result.snapshot);
      setDrafts(snapshotDrafts(result.snapshot));
      setQuery(result.snapshot.query);
      setMessage(
        result.snapshot.totalItems === 0
          ? "No users match this search."
          : `Showing ${result.snapshot.totalItems} matching user${result.snapshot.totalItems === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "User search failed. Try again."
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadUsers(1, query);
  }

  function clearSearch() {
    setQuery("");
    void loadUsers(1, "");
  }

  function saveRole(user: ManagedUser) {
    const accessRole = drafts[user.id] ?? user.accessRole;
    if (!canUseLiveUsers || accessRole === user.accessRole) {
      return;
    }

    const confirmed = window.confirm(
      `Change ${user.email} from ${roleLabels[user.accessRole]} to ${roleLabels[accessRole]}?`
    );
    if (!confirmed) {
      return;
    }

    setSavingUserId(user.id);
    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/users/roles", {
          body: JSON.stringify({ accessRole, userId: user.id }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH"
        });
        const result = (await response.json().catch(() => null)) as
          | {
              item?: { accessRole?: UserRole; userId?: string };
              ok?: boolean;
              reason?: unknown;
            }
          | null;

        if (!response.ok || !result?.ok || result.item?.accessRole !== accessRole) {
          throw new Error(roleErrorMessage(result?.reason));
        }

        setSnapshot((current) => ({
          ...current,
          items: current.items.map((item) =>
            item.id === user.id
              ? { ...item, accessRole, roles: roleList(accessRole) }
              : item
          )
        }));
        setMessage(`${user.email} is now ${roleLabels[accessRole]}.`);
      } catch (error) {
        setDrafts((current) => ({ ...current, [user.id]: user.accessRole }));
        setMessage(error instanceof Error ? error.message : "Role update failed.");
      } finally {
        setSavingUserId(null);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-dune bg-shell">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dune p-5">
        <div>
          <h3 className="font-display text-3xl text-cocoa">Users &amp; roles</h3>
          <p className="mt-1 text-sm text-cocoa/70">
            Search every account, review membership tiers, and manage access.
          </p>
        </div>
        <span className="rounded-full bg-sand px-3 py-1 text-sm text-cocoa/70">
          {snapshot.source === "supabase"
            ? `${firstResult}-${lastResult} of ${snapshot.totalItems}`
            : "Demo"}
        </span>
      </div>

      <form
        onSubmit={submitSearch}
        className="flex flex-col gap-3 border-b border-dune p-4 sm:flex-row sm:items-end"
      >
        <label className="grid min-w-0 flex-1 gap-2 text-sm text-cocoa/75">
          Search users
          <input
            type="search"
            value={query}
            disabled={!canUseLiveUsers || loadingUsers}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Email or full name"
            className="w-full rounded-md border border-dune bg-white px-3 py-2.5 text-cocoa outline-none disabled:opacity-60"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canUseLiveUsers || loadingUsers}
            className="rounded-md bg-cocoa px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingUsers ? "Searching..." : "Search"}
          </button>
          {snapshot.query ? (
            <button
              type="button"
              onClick={clearSearch}
              disabled={loadingUsers}
              className="rounded-md border border-dune bg-white px-4 py-2.5 text-sm font-semibold text-cocoa disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="divide-y divide-dune md:hidden">
        {users.map((user) => {
          const draftRole = drafts[user.id] ?? user.accessRole;
          const isSaving = isPending && savingUserId === user.id;
          return (
            <div key={user.id} className="p-4">
              <div className="font-semibold text-cocoa">
                {user.fullName || user.email}
                {user.id === currentUserId ? (
                  <span className="ml-2 rounded bg-sand px-1.5 py-0.5 text-xs font-medium text-cocoa/70">
                    You
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 break-all text-xs text-cocoa/70">{user.email}</div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase text-cocoa/60">Tier</dt>
                  <dd className="mt-0.5 text-cocoa/80">{user.tier}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-cocoa/60">Joined</dt>
                  <dd className="mt-0.5 text-cocoa/80">{formatDate(user.createdAt)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-end gap-2">
                <label className="grid min-w-0 flex-1 gap-1 text-xs uppercase text-cocoa/60">
                  Access role
                  <select
                    value={draftRole}
                    disabled={!canUseLiveUsers || isPending || loadingUsers}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [user.id]: event.target.value as UserRole
                      }))
                    }
                    className="w-full rounded-md border border-dune bg-white px-3 py-2 text-sm normal-case text-cocoa outline-none disabled:opacity-60"
                  >
                    <option value="member">Member</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => saveRole(user)}
                  disabled={
                    !canUseLiveUsers ||
                    isPending ||
                    loadingUsers ||
                    draftRole === user.accessRole
                  }
                  className="shrink-0 rounded-md bg-cocoa px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? "Saving..." : "Save role"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-sand/70 text-xs uppercase text-cocoa/70">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Tier</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Access role</th>
              <th className="px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dune">
            {users.map((user) => {
              const draftRole = drafts[user.id] ?? user.accessRole;
              const isSaving = isPending && savingUserId === user.id;
              return (
                <tr key={user.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-cocoa">
                      {user.fullName || user.email}
                      {user.id === currentUserId ? (
                        <span className="ml-2 rounded bg-sand px-1.5 py-0.5 text-xs font-medium text-cocoa/70">
                          You
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-cocoa/70">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-cocoa/75">{user.tier}</td>
                  <td className="px-4 py-3 text-cocoa/75">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Access role for ${user.email}`}
                      value={draftRole}
                      disabled={!canUseLiveUsers || isPending || loadingUsers}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [user.id]: event.target.value as UserRole
                        }))
                      }
                      className="w-32 rounded-md border border-dune bg-white px-3 py-2 text-cocoa outline-none disabled:opacity-60"
                    >
                      <option value="member">Member</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => saveRole(user)}
                      disabled={
                        !canUseLiveUsers ||
                        isPending ||
                        loadingUsers ||
                        draftRole === user.accessRole
                      }
                      className="rounded-md bg-cocoa px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? "Saving..." : "Save role"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 ? (
        <p className="border-t border-dune px-5 py-8 text-center text-sm text-cocoa/70">
          {snapshot.query ? "No users match this search." : "No users available."}
        </p>
      ) : null}

      {snapshot.source === "supabase" ? (
        <div className="flex items-center justify-between gap-3 border-t border-dune px-5 py-3">
          <span className="text-sm text-cocoa/70">
            Page {snapshot.totalPages === 0 ? 0 : snapshot.page} of {snapshot.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous user page"
              title="Previous page"
              onClick={() => void loadUsers(snapshot.page - 1, snapshot.query)}
              disabled={loadingUsers || snapshot.page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-dune bg-white text-lg text-cocoa disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              aria-label="Next user page"
              title="Next page"
              onClick={() => void loadUsers(snapshot.page + 1, snapshot.query)}
              disabled={
                loadingUsers ||
                snapshot.totalPages === 0 ||
                snapshot.page >= snapshot.totalPages
              }
              className="flex h-9 w-9 items-center justify-center rounded-md border border-dune bg-white text-lg text-cocoa disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      ) : null}

      <p className="border-t border-dune px-5 py-3 text-sm text-cocoa/75" aria-live="polite">
        {message ??
          (canUseLiveUsers
            ? "Role changes are recorded in the database audit log."
            : "Live admin access is required to change roles.")}
      </p>
    </div>
  );
}

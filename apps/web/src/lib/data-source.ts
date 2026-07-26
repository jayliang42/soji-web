export interface LiveDataSnapshot<T> {
  error?: string;
  items: T[];
  source: "supabase";
}

export function resolveDataSnapshot<T>({
  demoEnabled,
  demoItems,
  liveSnapshot,
  missingConfigurationError
}: {
  demoEnabled: boolean;
  demoItems: T[];
  liveSnapshot: LiveDataSnapshot<T> | null;
  missingConfigurationError: string;
}): LiveDataSnapshot<T> | { items: T[]; source: "demo" } {
  if (liveSnapshot) {
    return liveSnapshot;
  }

  if (demoEnabled) {
    return { items: demoItems, source: "demo" };
  }

  return {
    error: missingConfigurationError,
    items: [],
    source: "supabase"
  };
}

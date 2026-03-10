export interface ManifestFileEntry {
  required: boolean;
}

export interface DataManifest {
  channel: "stable" | "dev";
  version: string;
  generatedAt: string;
  dataRevision: string;
  files: Record<string, ManifestFileEntry>;
}
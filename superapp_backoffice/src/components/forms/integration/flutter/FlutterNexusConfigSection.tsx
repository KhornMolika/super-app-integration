"use client";

import React from "react";
import { Input, Label, Select } from "@/components/ui/inputs";

export interface FlutterNexusConfigSectionProps {
  flutterConfig: any;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
  isNexusValidating: boolean;
  nexusValidationResult: any;
  archiveUploadSuccess?: any;
  handleFlutterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

/** Package name and version, filled from the uploaded file and checked against Nexus. */
export default function FlutterNexusConfigSection({
  flutterConfig = {},
  allErrors = {},
  isEditable = true,
  isNexusValidating,
  nexusValidationResult,
  archiveUploadSuccess,
  handleFlutterChange,
}: FlutterNexusConfigSectionProps) {
  const isArchiveUploaded = Boolean(
    archiveUploadSuccess ||
      flutterConfig?.packageStoragePath ||
      flutterConfig?.archiveChecksum ||
      flutterConfig?.isArchiveSubmission,
  );
  const versionError = allErrors["integrationConfigFlutter.versionConstraint"];
  const versions: string[] = nexusValidationResult?.versions || [];

  const nameHint = isNexusValidating
    ? "Checking the registry..."
    : nexusValidationResult?.exists
      ? `Already in the registry. Latest ${nexusValidationResult.latestVersion || "1.0.0"}.`
      : nexusValidationResult
        ? isArchiveUploaded
          ? "New package. It is published to the registry during review."
          : "Not in the registry yet. Upload the package file."
        : "Filled in from the package file.";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      <div>
        <Label htmlFor="flutter-pkg">
          Package name <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="flutter-pkg"
          required
          name="packageName"
          value={flutterConfig?.packageName || ""}
          onChange={handleFlutterChange}
          disabled={!isEditable}
          placeholder="my_mini_app"
          className="font-mono"
        />
        <p
          className={`mt-1.5 text-xs ${
            nexusValidationResult && !nexusValidationResult.exists && !isArchiveUploaded
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {nameHint}
        </p>
      </div>

      <div>
        <Label htmlFor="flutter-version">
          Version <span className="text-rose-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="flutter-version"
            name="versionConstraint"
            value={flutterConfig?.versionConstraint || ""}
            onChange={handleFlutterChange}
            disabled={!isEditable}
            placeholder="^1.0.0"
            className={`font-mono ${versionError ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
          />
          {versions.length > 0 && (
            <Select
              aria-label="Pick a published version"
              value=""
              onChange={(e: any) => {
                const v = String(e.target.value || "").trim();
                if (!v) return;
                handleFlutterChange({
                  target: { name: "versionConstraint", value: v.startsWith("^") ? v : `^${v}` },
                } as any);
              }}
              disabled={!isEditable}
              className="w-32 text-sm"
            >
              <option value="">Published</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </div>
        {versionError ? (
          <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{versionError}</p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">A pub version range, e.g. ^1.2.0.</p>
        )}
      </div>
    </div>
  );
}

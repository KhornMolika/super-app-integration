"use client";

import React from "react";
import { Input, Label, Select } from "@/components/ui/inputs";
import {
  PackageIcon,
  TagIcon,
  CheckIcon,
  AlertTriangleIcon,
} from "@/components/ui/Icons";

export interface FlutterNexusConfigSectionProps {
  flutterConfig: any;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
  isNexusValidating: boolean;
  nexusValidationResult: any;
  archiveUploadSuccess?: any;
  handleFlutterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function FlutterNexusConfigSection({
  flutterConfig = {},
  allErrors = {},
  isEditable = true,
  isNexusValidating,
  nexusValidationResult,
  archiveUploadSuccess,
  handleFlutterChange,
}: FlutterNexusConfigSectionProps) {
  const isArchiveUploaded =
    archiveUploadSuccess ||
    flutterConfig?.packageStoragePath ||
    flutterConfig?.archiveChecksum ||
    (flutterConfig as any)?.isArchiveSubmission;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Package Name Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>
            Package Name <span className="text-rose-500">*</span>
          </Label>
          {isNexusValidating && (
            <span className="text-sm text-blue-500 animate-pulse font-medium">
              Checking Nexus...
            </span>
          )}
        </div>
        <Input
          required
          name="packageName"
          value={flutterConfig?.packageName || ""}
          onChange={handleFlutterChange}
          disabled={!isEditable}
          placeholder="e.g. ma_flutter_trust_regulator"
          className={
            nexusValidationResult?.exists === false &&
            !archiveUploadSuccess &&
            !flutterConfig?.packageStoragePath &&
            !flutterConfig?.archiveChecksum
              ? "border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
              : nexusValidationResult?.exists === true
                ? "border-emerald-500 ring-1 ring-emerald-500 focus:ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                : isArchiveUploaded
                  ? "border-indigo-500 ring-1 ring-indigo-500 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                  : ""
          }
        />
        {nexusValidationResult && !isNexusValidating && (
          <div className="mt-1.5 text-sm font-medium">
            {nexusValidationResult.exists ? (
              <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4" />
                <span>
                  Found on Nexus (Latest:{" "}
                  {nexusValidationResult.latestVersion || "1.0.0"})
                </span>
              </p>
            ) : isArchiveUploaded ? (
              <p className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <PackageIcon className="w-4 h-4" />
                <span>
                  Package archive uploaded. &quot;
                  {flutterConfig?.packageName}&quot; will be validated and
                  published to Nexus during review.
                </span>
              </p>
            ) : (
              <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4" />
                <span>
                  Package &quot;{flutterConfig?.packageName}&quot; not found in
                  Nexus pub-group. It will be validated and published to Nexus
                  during review.
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Version Constraint Input & Dropdown */}
      <div>
        <Label>
          Version Constraint <span className="text-rose-500">*</span>
        </Label>
        {nexusValidationResult?.versions &&
        nexusValidationResult.versions.length > 0 ? (
          <div className="flex gap-2">
            <Input
              name="versionConstraint"
              value={flutterConfig?.versionConstraint || ""}
              onChange={handleFlutterChange}
              disabled={!isEditable}
              placeholder="e.g. ^1.0.0"
              className={
                allErrors["integrationConfigFlutter.versionConstraint"]
                  ? "border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50"
                  : ""
              }
            />
            <Select
              value={flutterConfig?.versionConstraint || ""}
              onChange={(e: any) => {
                const selected = String(e.target.value || "").trim();
                handleFlutterChange({
                  target: {
                    name: "versionConstraint",
                    value: selected.startsWith("^") ? selected : `^${selected}`,
                  },
                } as any);
              }}
              disabled={!isEditable}
              className="w-36 text-sm"
            >
              <option value="">Versions ▼</option>
              {nexusValidationResult.versions.map((v: string) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <Input
            name="versionConstraint"
            value={flutterConfig?.versionConstraint || ""}
            onChange={handleFlutterChange}
            disabled={!isEditable}
            placeholder="e.g. ^1.0.0"
            className={
              allErrors["integrationConfigFlutter.versionConstraint"]
                ? "border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50"
                : ""
            }
          />
        )}
        {allErrors["integrationConfigFlutter.versionConstraint"] && (
          <p className="mt-1.5 text-sm text-rose-600 font-medium">
            {allErrors["integrationConfigFlutter.versionConstraint"]}
          </p>
        )}
      </div>
    </div>
  );
}

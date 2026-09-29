import { Injectable, Logger } from '@nestjs/common';
import type { Multer } from 'multer';

export interface SanitizedArchiveResult {
  cleanBuffer: Buffer;
  originalSize: number;
  cleanSize: number;
  isSanitized: boolean;
  strippedFilesCount: number;
  parsedPubspec: any;
}

export interface InspectedArchiveResult {
  success: boolean;
  sha256: string;
  filename: string;
  size: number;
  originalSize: number;
  isSanitized: boolean;
  strippedFilesCount: number;
  pubspec: {
    name?: string;
    version?: string;
    description?: string;
    dependencies?: Record<string, any>;
    environment?: Record<string, any>;
  };
}

@Injectable()
export class ArchiveSanitizerHelper {
  private readonly logger = new Logger(ArchiveSanitizerHelper.name);

  private readonly junkPrefixes = [
    'build/',
    '.dart_tool/',
    '.git/',
    '.gradle/',
    'android/.gradle/',
    'android/app/build/',
    'ios/Pods/',
    '.idea/',
    '.vscode/',
    'node_modules/',
    '__MACOSX/',
  ];

  private readonly junkSuffixes = [
    '.apk',
    '.aar',
    '.ipa',
    '.tmp',
    '.log',
    '.DS_Store',
    'Thumbs.db',
  ];

  /**
   * Sanitizes a Flutter package zip archive by stripping out local build caches,
   * Gradle daemon files, Pods, Git history, IDE settings, and unneeded binaries
   * before storing in MinIO or triggering security scans.
   */
  sanitizePackageArchive(rawBuffer: Buffer): SanitizedArchiveResult {
    const originalSize = rawBuffer.length;
    let parsedPubspec: any = {};

    try {
      const AdmZip = require('adm-zip');
      const yaml = require('yaml');
      const sourceZip = new AdmZip(rawBuffer);
      const cleanZip = new AdmZip();

      let strippedFilesCount = 0;
      const entries = sourceZip.getEntries();

      for (const entry of entries) {
        const normName = entry.entryName.replace(/\\/g, '/');
        const lowerName = normName.toLowerCase();

        // Check if pubspec.yaml
        if (
          lowerName === 'pubspec.yaml' ||
          lowerName.endsWith('/pubspec.yaml')
        ) {
          try {
            const yamlText = entry.getData().toString('utf8');
            parsedPubspec = yaml.parse(yamlText) || {};
          } catch (e: any) {
            this.logger.warn(`Failed to parse pubspec.yaml: ${e.message}`);
          }
        }

        // Check for junk directories or files
        const isJunk =
          this.junkPrefixes.some(
            (p) => lowerName.startsWith(p) || lowerName.includes('/' + p),
          ) ||
          this.junkSuffixes.some((s) => lowerName.endsWith(s)) ||
          lowerName.includes('/.dart_tool/') ||
          lowerName.includes('/build/') ||
          lowerName.includes('/.git/') ||
          lowerName.includes('/.gradle/');

        if (isJunk) {
          strippedFilesCount++;
          continue;
        }

        if (!entry.isDirectory) {
          cleanZip.addFile(normName, entry.getData(), entry.comment);
        }
      }

      const cleanBuffer = cleanZip.toBuffer();
      const isSanitized = strippedFilesCount > 0;

      if (isSanitized) {
        const origMb = (originalSize / (1024 * 1024)).toFixed(2);
        const cleanKb = (cleanBuffer.length / 1024).toFixed(1);
        const reduction = (
          (1 - cleanBuffer.length / originalSize) *
          100
        ).toFixed(1);
        this.logger.log(
          `[Sanitize] Package archive: ${origMb} MB -> ${cleanKb} KB (${reduction}% reduction, stripped ${strippedFilesCount} cache/build entries)`,
        );
      }

      // Safe fallback if pubspec was not parsed via entries
      if (!parsedPubspec?.name) {
        try {
          const sampleText = rawBuffer.toString('utf8', 0, Math.min(rawBuffer.length, 500000));
          const nameMatch = sampleText.match(/(?:^|\n)\s*name:\s*([a-zA-Z0-9_-]+)/);
          const verMatch = sampleText.match(/(?:^|\n)\s*version:\s*([^\s#]+)/);
          if (nameMatch) {
            parsedPubspec.name = nameMatch[1].trim();
          }
          if (verMatch) {
            parsedPubspec.version = verMatch[1].trim();
          }
        } catch (_) {}
      }

      if (parsedPubspec?.name) {
        parsedPubspec.name = String(parsedPubspec.name).trim();
      }
      if (parsedPubspec?.version) {
        parsedPubspec.version = String(parsedPubspec.version).trim();
      }

      return {
        cleanBuffer: cleanBuffer.length > 0 ? cleanBuffer : rawBuffer,
        originalSize,
        cleanSize: cleanBuffer.length > 0 ? cleanBuffer.length : originalSize,
        isSanitized,
        strippedFilesCount,
        parsedPubspec,
      };
    } catch (err: any) {
      this.logger.warn(
        `Package archive sanitization warning: ${err.message}. Preserving original archive.`,
      );
      return {
        cleanBuffer: rawBuffer,
        originalSize,
        cleanSize: originalSize,
        isSanitized: false,
        strippedFilesCount: 0,
        parsedPubspec,
      };
    }
  }

  /**
   * Inspects a Flutter package archive (.zip / .tar.gz) in-memory without saving to MinIO.
   * Strips build caches, parses pubspec.yaml, computes clean SHA-256 and size metrics.
   */
  inspectPackageArchive(file: Express.Multer.File): InspectedArchiveResult {
    const {
      cleanBuffer,
      originalSize,
      cleanSize,
      isSanitized,
      strippedFilesCount,
      parsedPubspec,
    } = this.sanitizePackageArchive(file.buffer);

    const sha256 = require('crypto')
      .createHash('sha256')
      .update(cleanBuffer)
      .digest('hex');

    const cleanOrigName = (file.originalname || 'package.zip').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );

    const name = parsedPubspec?.name ? String(parsedPubspec.name).trim() : undefined;
    const version = parsedPubspec?.version ? String(parsedPubspec.version).trim() : undefined;

    return {
      success: true,
      sha256,
      filename: cleanOrigName,
      size: cleanSize,
      originalSize,
      isSanitized,
      strippedFilesCount,
      pubspec: {
        name,
        version,
        description: parsedPubspec?.description,
        dependencies: parsedPubspec?.dependencies,
        environment: parsedPubspec?.environment,
      },
    };
  }
}

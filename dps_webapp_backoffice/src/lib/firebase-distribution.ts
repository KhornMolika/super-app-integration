import { GoogleAuth } from "google-auth-library";
import fs from "node:fs";

export interface FirebaseRelease {
  id: string;
  displayVersion: string;
  buildVersion: string;
  releaseNotes: string;
  createTime: string;
  testingUri: string;
  firebaseConsoleUri: string;
}

export class FirebaseDistributionConfigError extends Error {}

export class FirebaseDistributionApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new FirebaseDistributionConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getAccessToken(serviceAccountPath: string): Promise<string> {
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Firebase service account file not found at path: ${serviceAccountPath}`);
    throw new FirebaseDistributionConfigError(
      "Firebase service account file not found. Check FIREBASE_SERVICE_ACCOUNT_PATH."
    );
  }

  const auth = new GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  let token: string | null | undefined;
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    token = tokenResponse.token;
  } catch (err) {
    console.error("Failed to authenticate with Google:", err);
    throw new FirebaseDistributionApiError("Failed to authenticate with Google", 502);
  }

  if (!token) {
    throw new FirebaseDistributionApiError("Google returned an empty access token", 502);
  }
  return token;
}

interface RawFirebaseRelease {
  name: string;
  displayVersion?: string;
  buildVersion?: string;
  releaseNotes?: { text?: string };
  createTime?: string;
  testingUri?: string;
  firebaseConsoleUri?: string;
}

function mapRelease(raw: RawFirebaseRelease): FirebaseRelease {
  return {
    id: raw.name,
    displayVersion: raw.displayVersion ?? "",
    buildVersion: raw.buildVersion ?? "",
    releaseNotes: raw.releaseNotes?.text ?? "",
    createTime: raw.createTime ?? "",
    testingUri: raw.testingUri ?? "",
    firebaseConsoleUri: raw.firebaseConsoleUri ?? "",
  };
}

export async function getFirebaseReleases(): Promise<FirebaseRelease[]> {
  const projectNumber = readRequiredEnv("FIREBASE_PROJECT_NUMBER");
  const appId = readRequiredEnv("FIREBASE_ANDROID_APP_ID");
  const serviceAccountPath = readRequiredEnv("FIREBASE_SERVICE_ACCOUNT_PATH");

  const token = await getAccessToken(serviceAccountPath);

  const url = `https://firebaseappdistribution.googleapis.com/v1/projects/${projectNumber}/apps/${appId}/releases?pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Firebase App Distribution API returned ${res.status}: ${body}`);
    throw new FirebaseDistributionApiError(
      `Firebase App Distribution API returned ${res.status}`,
      res.status
    );
  }

  const data = (await res.json()) as { releases?: RawFirebaseRelease[] };
  const releases = (data.releases ?? []).map(mapRelease);

  releases.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());

  return releases;
}

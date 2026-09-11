import { NextResponse } from "next/server";
import {
  FirebaseDistributionApiError,
  FirebaseDistributionConfigError,
  getFirebaseReleases,
} from "@/lib/firebase-distribution";

export async function GET() {
  try {
    const releases = await getFirebaseReleases();
    return NextResponse.json({ releases });
  } catch (err) {
    if (err instanceof FirebaseDistributionConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof FirebaseDistributionApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

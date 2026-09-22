/**
 * Replaces the lines between a `GENERATED NATIVE SDK <region>` marker pair.
 * Comment syntax is irrelevant — the marker text itself is what is matched —
 * so the same helper serves Swift, Kotlin, Ruby and Gradle files.
 */
export function replaceMarkedRegion(
  content: string,
  region: string,
  body: string,
): string {
  const beginText = `GENERATED NATIVE SDK ${region} —`;
  const endText = `END GENERATED NATIVE SDK ${region} `;

  const lines = content.split('\n');
  const beginIdxs: number[] = [];
  const endIdxs: number[] = [];

  lines.forEach((line, i) => {
    if (line.includes(endText.trim())) {
      endIdxs.push(i);
    } else if (line.includes(beginText)) {
      beginIdxs.push(i);
    }
  });

  if (beginIdxs.length === 0) {
    throw new Error(`Missing begin marker for region "${region}"`);
  }
  if (endIdxs.length === 0) {
    throw new Error(`Missing end marker for region "${region}"`);
  }
  if (beginIdxs.length > 1 || endIdxs.length > 1) {
    throw new Error(`Markers for region "${region}" appear more than once`);
  }

  const begin = beginIdxs[0];
  const end = endIdxs[0];
  if (end < begin) {
    throw new Error(`End marker precedes begin marker for region "${region}"`);
  }

  const replacement = body === '' ? [] : body.split('\n');
  return [
    ...lines.slice(0, begin + 1),
    ...replacement,
    ...lines.slice(end),
  ].join('\n');
}

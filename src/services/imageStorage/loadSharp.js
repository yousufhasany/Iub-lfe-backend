export async function getSharp() {
  const mod = await import('sharp');
  return mod.default;
}

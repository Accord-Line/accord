import { validateProject } from './validation';
import type { ProductSpec, Validation } from './types';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export function parseProject(text: string): Validation<ProductSpec> {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) return { valid: false, issues: [{ path: '/', message: '规范文件上限为 2 MiB。' }] };
  try { return validateProject(JSON.parse(text) as unknown); }
  catch { return { valid: false, issues: [{ path: '/', message: 'JSON 格式错误，请检查括号、逗号和引号。' }] }; }
}
export function serializeProject(spec: ProductSpec): string {
  const result = validateProject(spec);
  if (!result.valid) throw new Error('规范未通过校验，不能导出。');
  return `${JSON.stringify(spec, null, 2)}\n`;
}

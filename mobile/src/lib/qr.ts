import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import QRCodeLib from 'qrcode';

import type { QRSettings } from '@/lib/types';

/** Prefix with https:// when no scheme is present. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidUrl(input: string): boolean {
  const u = normalizeUrl(input);
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function libOptions(settings: QRSettings) {
  return {
    errorCorrectionLevel: settings.ecl,
    margin: Math.max(0, Math.round(settings.quietZone / 4)),
    color: { dark: settings.fgColor, light: settings.bgColor },
  };
}

/** Generate an SVG string (works on native + web, no logo/gradient). */
export async function svgString(value: string, settings: QRSettings): Promise<string> {
  return QRCodeLib.toString(value, { type: 'svg', ...libOptions(settings) });
}

/** Generate a PNG data URI using the browser canvas (web only). */
export async function pngDataUrlWeb(value: string, settings: QRSettings, width = 1024): Promise<string> {
  return QRCodeLib.toDataURL(value, { ...libOptions(settings), width, margin: 0 });
}

/**
 * Native: capture the rendered QR view (react-native-view-shot).
 * This is the only path that preserves the logo and gradient.
 */
export async function captureQrPng(viewRef: unknown): Promise<string> {
  return captureRef(viewRef as never, { format: 'png', quality: 1, result: 'tmpfile' });
}

function isFileUri(uri: string): boolean {
  return uri.startsWith('file://');
}

function isDataUri(uri: string): boolean {
  return uri.startsWith('data:');
}

/** Write a PNG (file or data URI) to a cache file and return its file:// URI. */
async function ensureFileUri(uri: string): Promise<string> {
  if (isFileUri(uri)) return uri;
  if (isDataUri(uri)) {
    const file = new FileSystem.File(FileSystem.Paths.cache, `openqr-${Date.now()}.png`);
    const base64 = uri.split(',')[1] ?? '';
    file.write(base64, { encoding: 'base64' });
    return file.uri;
  }
  return uri;
}

export async function savePngToLibrary(uri: string): Promise<void> {
  const localUri = await ensureFileUri(uri);
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) {
    throw new Error('Photo library permission was denied.');
  }
  await MediaLibrary.saveToLibraryAsync(localUri);
}

export async function sharePng(uri: string): Promise<void> {
  const localUri = await ensureFileUri(uri);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(localUri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'OpenQR' });
}

/** Web: trigger a download of a data URI. */
export function downloadDataUri(dataUri: string, filename: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Web: trigger a download of a text payload (e.g. SVG) via a blob URL. */
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // React Native has no direct clipboard API in this stack; delegate to the caller.
  throw new Error('Clipboard is only supported on web for now.');
}

/** Native: write an SVG string to a cache file and open the share sheet. */
export async function shareSvgString(content: string, filename: string): Promise<void> {
  const file = new FileSystem.File(FileSystem.Paths.cache, `${filename}.svg`);
  file.write(content, { encoding: 'utf8' });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'image/svg+xml', UTI: 'public.svg-image', dialogTitle: 'OpenQR' });
}

export function fileSuffix(): string {
  return `${Date.now()}`;
}

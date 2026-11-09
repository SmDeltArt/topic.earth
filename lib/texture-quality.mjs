import { Settings } from './settings.js';

// Preserve sources so a later manual quality change can restore model textures.
const originalImages = new WeakMap();

export function applyTextureQuality(texture) {
  if (!texture?.isTexture || !texture.image || texture.isDataTexture || texture.isCompressedTexture) return;
  const preference = Settings.get().baseTextureQuality;
  const limit = ({ '4k': 4096, '8k': 8192 })[preference] || 1024;
  const original = originalImages.get(texture) || texture.image;
  const width = original.naturalWidth || original.width;
  const height = original.naturalHeight || original.height;
  if (!width || !height) return;
  const scale = Math.min(1, limit / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  if (texture.image.width === targetWidth && texture.image.height === targetHeight) return;
  if (scale === 1) {
    texture.image = original;
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot resize model texture to the selected resolution');
    context.drawImage(original, 0, 0, targetWidth, targetHeight);
    originalImages.set(texture, original);
    texture.image = canvas;
  }
  texture.needsUpdate = true;
}

export function applyModelTextureQuality(model) {
  const textures = new Set();
  model?.traverse(node => {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material || {})) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  textures.forEach(applyTextureQuality);
}

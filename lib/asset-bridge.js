const CLOUDINARY_BASE = 'https://res.cloudinary.com/dsbfcgtdv/image/upload';

const cloudinaryAsset = (version, publicIdWithExtension) =>
  `${CLOUDINARY_BASE}/${version}/${publicIdWithExtension}`;

export const ASSET_URL_OVERRIDES = {
  'assets/models/solar-system.glb': cloudinaryAsset(
    'v1777924349',
    'solar-system_q79g8o.glb'
  ),
  'assets/models/amoc_circular_overlay.glb': cloudinaryAsset(
    'v1777894948',
    'amoc_circular_overlay_dj3ren.glb'
  ),
  'assets/models/tipping_point_circular.glb': cloudinaryAsset(
    'v1777894958',
    'tipping_point_circular_xkmh0k.glb'
  ),

  'assets/textures/fever/earth_1950_1k.png': cloudinaryAsset(
    'v1777894948',
    'earth_1950_1k_yfkp3e.png'
  ),
  'assets/textures/fever/earth_1950_4k.png': cloudinaryAsset(
    'v1777894991',
    'earth_1950_4k_gtkq0j.png'
  ),
  'assets/textures/fever/earth_1975_1k.png': cloudinaryAsset(
    'v1777894954',
    'earth_1975_1k_mpybwn.png'
  ),
  'assets/textures/fever/earth_1975_4k.png': cloudinaryAsset(
    'v1777895010',
    'earth_1975_4k_jvaa0b.png'
  ),
  'assets/textures/fever/earth_2000_1k.png': cloudinaryAsset(
    'v1777894950',
    'earth_2000_1k_dzwkxg.png'
  ),
  'assets/textures/fever/earth_2000_4k.png': cloudinaryAsset(
    'v1777895041',
    'earth_2000_4k_z66uvj.png'
  ),
  'assets/textures/fever/earth_2025_1k.png': cloudinaryAsset(
    'v1777894956',
    'earth_2025_1k_zvfscv.png'
  ),
  'assets/textures/fever/earth_2025_4k.png': cloudinaryAsset(
    'v1777895045',
    'earth_2025_4k_gkgvrd.png'
  ),
  'assets/textures/fever/earth_2050_1k.png': cloudinaryAsset(
    'v1777894951',
    'earth_2050_1k_y9ikiw.png'
  ),
  'assets/textures/fever/earth_2050_4k.png': cloudinaryAsset(
    'v1777895046',
    'earth_2050_4k_twpqtx.png'
  ),
  'assets/textures/fever/earth_2075_1k.png': cloudinaryAsset(
    'v1777894954',
    'earth_2075_1k_pp1xs8.png'
  ),
  'assets/textures/fever/earth_2075_4k.png': cloudinaryAsset(
    'v1777895049',
    'earth_2075_4k_sugtll.png'
  ),
  'assets/textures/fever/earth_2100_1k.png': cloudinaryAsset(
    'v1777894959',
    'earth_2100_1k_udjr6m.png'
  ),
  'assets/textures/fever/earth_2100_4k.png': cloudinaryAsset(
    'v1777895042',
    'earth_2100_4k_uclis5.png'
  ),
  'assets/textures/fever/earth_2125_1k.png': cloudinaryAsset(
    'v1777894954',
    'earth_2125_1k_moqovw.png'
  ),
  'assets/textures/fever/earth_2125_4k.png': cloudinaryAsset(
    'v1777895001',
    'earth_2125_4k_kq01ys.png'
  ),

  'assets/textures/main/Material.001_baseColor.jpeg': cloudinaryAsset(
    'v1777894991',
    'Material.001_baseColor_nnlizs.jpg'
  ),
  'assets/textures/main/Material.001_baseColor_1k.jpeg': cloudinaryAsset(
    'v1777894954',
    'Material.001_baseColor_1k_yeouuy.jpg'
  ),
  'assets/textures/main/Material.001_baseColor_1k.jpg': cloudinaryAsset(
    'v1777894958',
    'Material.001_baseColor_1k_qoyewl.png'
  ),
  'assets/textures/main/Material.001_baseColor_4k.jpeg': cloudinaryAsset(
    'v1777894960',
    'Material.001_baseColor_4k_xxhtch.jpg'
  ),
  'assets/textures/main/Material.001_baseColor_4k.jpg': cloudinaryAsset(
    'v1777894995',
    'Material.001_baseColor_4k_cr5h1q.png'
  ),
  'assets/textures/main/Material.001_baseColor_8k.jpeg': cloudinaryAsset(
    'v1777894994',
    'Material.001_baseColor_8k_doecrr.jpg'
  ),
  'assets/textures/main/Material.001_metallicRoughness.png': cloudinaryAsset(
    'v1777895049',
    'Material.001_metallicRoughness_subqlp.png'
  ),
  'assets/textures/main/Material.001_metallicRoughness_1k.png': cloudinaryAsset(
    'v1777894958',
    'Material.001_metallicRoughness_1k_w5l5sl.png'
  ),
  'assets/textures/main/Material.001_metallicRoughness_4k.png': cloudinaryAsset(
    'v1777895057',
    'Material.001_metallicRoughness_4k_djpkn7.png'
  ),
  'assets/textures/main/Material.001_normal.jpeg': cloudinaryAsset(
    'v1777894967',
    'Material.001_normal_e3xigt.jpg'
  ),
  'assets/textures/main/Material.001_normal_1k.jpeg': cloudinaryAsset(
    'v1777894959',
    'Material.001_normal_1k_xhofmc.jpg'
  ),
  'assets/textures/main/Material.001_normal_4k.jpeg': cloudinaryAsset(
    'v1777894965',
    'Material.001_normal_4k_b88xf7.jpg'
  )
};

export const ASSET_BRIDGE_NOTES = {
  cloudName: 'dsbfcgtdv',
  transform: null,
  policy: 'Direct Cloudinary URLs from CSV exports are used for mapped assets. Unmapped assets stay local.'
};

export function normalizeAssetKey(path = '') {
  return String(path || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '');
}

export function resolveAssetUrl(path = '') {
  const rawPath = String(path || '').trim();
  if (!rawPath) return rawPath;
  if (/^(?:https?:)?\/\//.test(rawPath)) return rawPath;

  const normalized = normalizeAssetKey(rawPath);
  return ASSET_URL_OVERRIDES[normalized] || rawPath;
}

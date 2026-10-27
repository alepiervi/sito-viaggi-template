import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadImage(file, folder = 'trips') {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `tribu-in-viaggio/${folder}`,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

export async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

/**
 * Caricamento sul Cloudinary dell'ADMIN del sito (configurato dal backend,
 * Impostazioni -> Foto e Cloudinary) con un "upload preset" non firmato:
 * non serve nessuna chiave segreta e l'admin non deve entrare in Emergent.
 */
export function validCloudinarySettings(s) {
  return !!(s && /^[a-z0-9_-]{2,}$/i.test(s.cloudName || '') && /^[a-z0-9_-]{2,}$/i.test(s.uploadPreset || ''));
}

export async function uploadToSiteCloudinary(settings, dataUri, folder = 'sito') {
  const fd = new FormData();
  fd.append('file', dataUri);
  fd.append('upload_preset', settings.uploadPreset);
  if (folder) fd.append('folder', folder);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(settings.cloudName)}/image/upload`, {
    method: 'POST',
    body: fd,
    signal: AbortSignal.timeout(60000),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || !out.secure_url) {
    const msg = out?.error?.message || `Errore Cloudinary (${r.status})`;
    const err = new Error(/preset/i.test(msg)
      ? 'Upload preset non valido: in Cloudinary deve esistere ed essere di tipo "Unsigned"'
      : /cloud name|unknown/i.test(msg) ? 'Cloud name non valido' : msg);
    err.status = 400;
    throw err;
  }
  return { url: out.secure_url, publicId: out.public_id, width: out.width, height: out.height };
}

import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';

let cache: string | null = null;
let logoCache: string | null = null;

/**
 * Retorna uma versão REDIMENSIONADA/COMPRIMIDA da splash-icon.png, pronta
 * para uso como MARCA D'ÁGUA de fundo (background-image).
 * Não aplicamos `filter: grayscale()` via CSS pois essa propriedade,
 * combinada com `position: fixed`, trava a geração de PDF no Android
 * (erro "writing the PDF data"). Para compensar a ausência do tom de cinza,
 * usamos opacidade bem baixa no CSS (ver pdfReport.ts).
 */
export async function getWatermarkSrc(): Promise<string | null> {
  if (cache) return cache;

  try {
    const moduleId = require('../../assets/splash-icon.png');
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();

    if (Platform.OS === 'web') {
      cache = asset.uri;
      return cache;
    }

    if (!asset.localUri) return null;

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.localUri,
      [{ resize: { width: 220 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (!manipulated.base64) return null;
    cache = `data:image/jpeg;base64,${manipulated.base64}`;
    return cache;
  } catch (e) {
    console.log('Erro ao carregar marca d\'água:', e);
    return null;
  }
}

/**
 * Retorna uma versão PEQUENA e COMPRIMIDA da splash-icon.png, pensada para
 * ser usada como LOGO do cabeçalho (fallback quando não há logo configurada).
 */
export async function getWatermarkLogoSrc(): Promise<string | null> {
  if (logoCache) return logoCache;

  try {
    const moduleId = require('../../assets/splash-icon.png');
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();

    if (Platform.OS === 'web') {
      logoCache = asset.uri;
      return logoCache;
    }

    if (!asset.localUri) return null;

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.localUri,
      [{ resize: { width: 90 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!manipulated.base64) return null;
    logoCache = `data:image/png;base64,${manipulated.base64}`;
    return logoCache;
  } catch (e) {
    console.log('Erro ao gerar logo a partir da marca d\'água:', e);
    return null;
  }
}

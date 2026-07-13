import { logger } from "@/lib/logger";

const log = logger("translation");

/**
 * Translation-assist provider interface for the support panel.
 *
 * Production: implement this interface against DeepL
 * (https://developers.deepl.com) or Google Cloud Translation and select it
 * via TRANSLATION/CONTENT provider env config. The stub makes the seam
 * obvious in dev without an external dependency or API key.
 */
export interface TranslationProvider {
  name: string;
  translate(input: {
    text: string;
    targetLanguage: string; // ISO 639-1
  }): Promise<{ translatedText: string; provider: string }>;
}

export class StubTranslationProvider implements TranslationProvider {
  name = "stub";

  async translate(input: { text: string; targetLanguage: string }) {
    log.debug({ targetLanguage: input.targetLanguage }, "stub translation");
    return {
      // Clearly marked as a stub so nobody mistakes dev output for a translation.
      translatedText: `[${input.targetLanguage} translation unavailable in dev] ${input.text}`,
      provider: this.name,
    };
  }
}

export function translationProvider(): TranslationProvider {
  // Only "stub" exists today; production providers (DeepL, Google) register
  // here behind a TRANSLATION_PROVIDER env switch when integrated.
  return new StubTranslationProvider();
}

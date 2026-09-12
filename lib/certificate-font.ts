import fs from "fs";
import path from "path";
import * as opentypeModule from "opentype.js";
import type { Font, PathCommand } from "opentype.js";

// Interop between ESM, CJS, Turbopack, and Node runtime
const opentypeLib: any = (opentypeModule as any).default || opentypeModule;
const parseFont: (buffer: any) => Font =
  opentypeLib.parse || (opentypeModule as any).parse;

export interface CertificateFontSet {
  regular: Font;
  bold: Font;
  italic: Font;
  fontFamily: string;
  sourcePath: string;
}

let cachedFontSet: CertificateFontSet | null = null;

/**
 * Load an OpenType font from a buffer safely.
 */
function parseFontFile(filePath: string): Font {
  const fileBuffer = fs.readFileSync(filePath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );
  return parseFont(arrayBuffer);
}

/**
 * Loads the bundled certificate font set with fallback support.
 * Primary: Libre Baskerville (bundled in public/fonts/)
 * Fallback: Cormorant Garamond (bundled in public/fonts/)
 */
export function getCertificateFonts(): CertificateFontSet {
  if (cachedFontSet) {
    return cachedFontSet;
  }

  // Statically scoped directory for Next.js / Turbopack NFT tracing
  const fontsBaseDir = path.join(process.cwd(), "public", "fonts");

  // Primary: Libre Baskerville
  const libreRegular = path.join(fontsBaseDir, "LibreBaskerville-Regular.ttf");
  const libreBold = path.join(fontsBaseDir, "LibreBaskerville-Bold.ttf");
  const libreItalic = path.join(fontsBaseDir, "LibreBaskerville-Italic.ttf");

  if (
    fs.existsSync(libreRegular) &&
    fs.existsSync(libreBold) &&
    fs.existsSync(libreItalic)
  ) {
    try {
      const regular = parseFontFile(libreRegular);
      const bold = parseFontFile(libreBold);
      const italic = parseFontFile(libreItalic);

      // Required logging for production debugging
      console.log(`Certificate font: ${libreRegular}`);

      cachedFontSet = {
        regular,
        bold,
        italic,
        fontFamily: "Libre Baskerville",
        sourcePath: libreRegular,
      };
      return cachedFontSet;
    } catch (err) {
      console.warn("Failed to parse Libre Baskerville fonts, attempting fallback:", err);
    }
  }

  // Fallback: Cormorant Garamond
  const cormorantRegular = path.join(fontsBaseDir, "CormorantGaramond-Regular.ttf");
  const cormorantBold = path.join(fontsBaseDir, "CormorantGaramond-Bold.ttf");
  const cormorantItalic = path.join(fontsBaseDir, "CormorantGaramond-Italic.ttf");

  if (
    fs.existsSync(cormorantRegular) &&
    fs.existsSync(cormorantBold) &&
    fs.existsSync(cormorantItalic)
  ) {
    try {
      const regular = parseFontFile(cormorantRegular);
      const bold = parseFontFile(cormorantBold);
      const italic = parseFontFile(cormorantItalic);

      // Required logging for production debugging
      console.log(`Certificate font: ${cormorantRegular}`);

      cachedFontSet = {
        regular,
        bold,
        italic,
        fontFamily: "Cormorant Garamond",
        sourcePath: cormorantRegular,
      };
      return cachedFontSet;
    } catch (err) {
      console.error("Failed to parse fallback Cormorant Garamond fonts:", err);
    }
  }

  throw new Error(
    `No usable bundled font found in ${fontsBaseDir}. Expected LibreBaskerville or CormorantGaramond TTF files.`
  );
}

/**
 * Converts opentype.js Path commands into a valid SVG path 'd' string.
 * Uses exact floating-point rounding to avoid opentype.js scientific-notation NaN bug.
 */
export function commandsToSvgD(
  commands: PathCommand[],
  precision = 2
): string {
  const round = (val: number | undefined): string => {
    if (typeof val !== "number" || !Number.isFinite(val)) return "0";
    return Number(val.toFixed(precision)).toString();
  };

  let d = "";
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === "M") {
      d += ` M ${round(cmd.x)} ${round(cmd.y)}`;
    } else if (cmd.type === "L") {
      d += ` L ${round(cmd.x)} ${round(cmd.y)}`;
    } else if (cmd.type === "C") {
      d += ` C ${round(cmd.x1)} ${round(cmd.y1)} ${round(cmd.x2)} ${round(
        cmd.y2
      )} ${round(cmd.x)} ${round(cmd.y)}`;
    } else if (cmd.type === "Q") {
      d += ` Q ${round(cmd.x1)} ${round(cmd.y1)} ${round(cmd.x)} ${round(
        cmd.y
      )}`;
    } else if (cmd.type === "Z") {
      d += " Z";
    }
  }
  return d.trim();
}

/**
 * Sanitizes input text against the font's available glyphs.
 * Normalizes unicode and replaces any missing characters with safe substitutes.
 */
export function sanitizeTextForFont(text: string, font: Font): string {
  if (!text) return "";

  // Normalize common unicode variations
  const normalized = text
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // en/em dashes
    .trim();

  let sanitized = "";
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const code = char.charCodeAt(0);

    // Skip unprintable control characters
    if (code < 32 && code !== 10 && code !== 13) {
      continue;
    }

    // Check if font has a glyph for this char
    const glyph = font.charToGlyph(char);
    if (glyph && glyph.index > 0) {
      sanitized += char;
    } else {
      // Fallback: try ASCII transliteration or omit unsupported character
      const ascii = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const asciiGlyph = ascii ? font.charToGlyph(ascii[0]) : null;
      if (asciiGlyph && asciiGlyph.index > 0) {
        sanitized += ascii[0];
      } else {
        // Space or skip rather than producing a tofu box
        sanitized += " ";
      }
    }
  }

  // Collapse multiple spaces
  return sanitized.replace(/\s+/g, " ").trim();
}

/**
 * Generates an SVG path string for a text element with dynamic sizing and alignment.
 */
export function renderTextToSvgPath(params: {
  font: Font;
  text: string;
  x: number;
  y: number;
  initialFontSize: number;
  alignment: "center" | "left" | "right";
  maxWidth?: number;
  minFontSize?: number;
}): {
  d: string;
  fontSize: number;
  renderX: number;
  renderY: number;
  width: number;
} {
  const {
    font,
    text,
    x,
    y,
    initialFontSize,
    alignment,
    maxWidth,
    minFontSize = 14,
  } = params;

  const sanitized = sanitizeTextForFont(text, font);
  if (!sanitized) {
    return { d: "", fontSize: initialFontSize, renderX: x, renderY: y, width: 0 };
  }

  let fontSize = initialFontSize;
  let textWidth = font.getAdvanceWidth(sanitized, fontSize);

  // Dynamic fitting: if wider than maxWidth, reduce font size proportionally
  if (maxWidth && textWidth > maxWidth) {
    const ratio = maxWidth / textWidth;
    fontSize = Math.max(minFontSize, Math.floor(fontSize * ratio));
    textWidth = font.getAdvanceWidth(sanitized, fontSize);
  }

  let renderX = x;
  if (alignment === "center") {
    renderX = x - textWidth / 2;
  } else if (alignment === "right") {
    renderX = x - textWidth;
  }

  const pathObj = font.getPath(sanitized, renderX, y, fontSize);
  const d = commandsToSvgD(pathObj.commands);

  return {
    d,
    fontSize,
    renderX,
    renderY: y,
    width: textWidth,
  };
}

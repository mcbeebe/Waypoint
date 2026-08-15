/**
 * RichText — minimal rich-text renderer for AI Navigator messages.
 *
 * Supports exactly the subset the system prompt allows the model to emit:
 *   • bullet lines starting with "• " or "- "
 *   • inline **bold** spans
 *
 * Deliberately not a markdown renderer: no headers, links, tables, or
 * nesting. Streaming-safe — an unclosed ** renders literally until the
 * closing marker arrives.
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

/** Remove the inline markers for plain-text consumers (actions, emails). */
export function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/** Render a line's text with **bold** spans as nested Text elements. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*\n]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Text key={`${keyPrefix}-b${i++}`} style={styles.bold}>
        {m[1]}
      </Text>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

interface RichTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

export default function RichText({ text, style }: RichTextProps) {
  // Group consecutive non-bullet lines into paragraphs; bullets get rows
  const lines = text.split('\n');

  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const para = paragraph.join('\n');
    blocks.push(
      <Text key={`p${key++}`} style={style}>
        {renderInline(para, `p${key}`)}
      </Text>
    );
    paragraph = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*(?:•|-)\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push(
        <View key={`b${key++}`} style={styles.bulletRow}>
          <Text style={[style, styles.bulletDot]}>{'•'}</Text>
          <Text style={[style, styles.bulletText]}>
            {renderInline(bullet[1], `b${key}`)}
          </Text>
        </View>
      );
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  bold: {
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 4,
  },
  bulletDot: {
    marginRight: 6,
  },
  bulletText: {
    flex: 1,
  },
});

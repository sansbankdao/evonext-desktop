// src-tauri/src/social/content.rs

//! Yappr Phase A rich-text parser — 1:1 port of upstream
//! `components/post/post-content.tsx` (via evonext-mobile
//! `src/helpers/postContent.ts`): **bold**, *italic*, `code`, @mentions,
//! #hashtags, $cashtags, URLs.
//!
//! Overlap resolution mirrors Yappr exactly: sort by position, longer match
//! wins on ties (bold beats italic), first match wins; formatting segments
//! recurse into inline parsing for their children.
//!
//! NOTE: the `regex` crate has no lookaround, so JS's
//! `/(?<!\*)\*([^*]+)\*(?!\*)/g` italic pattern is matched with
//! `\*([^*]+)\*` and filtered by inspecting the adjacent bytes — identical
//! semantics (`*` is ASCII, so byte indexing is char-boundary safe here).

use super::{ContentPart, ContentPartType};
use regex::Regex;
use std::sync::OnceLock;

struct Patterns {
    url: Regex,
    hashtag: Regex,
    cashtag: Regex,
    mention: Regex,
    bold: Regex,
    italic: Regex,
    code: Regex,
}

fn patterns() -> &'static Patterns {
    static P: OnceLock<Patterns> = OnceLock::new();
    P.get_or_init(|| Patterns {
        // Exact ports of Yappr's inlinePatterns.
        url: Regex::new(r#"(https?://[^\s<>"']+|ipfs://[^\s<>"']+|www\.[^\s<>"']+)"#).unwrap(),
        hashtag: Regex::new(r"#([a-zA-Z0-9_]{1,63})").unwrap(),
        cashtag: Regex::new(r"\$([a-zA-Z][a-zA-Z0-9_]{0,62})").unwrap(),
        mention: Regex::new(r"(?i)@([a-zA-Z0-9_]{1,100}(?:\.dash)?)").unwrap(),
        // Exact ports of Yappr's allPatterns (formatting checked first).
        bold: Regex::new(r"\*\*([^*]+)\*\*").unwrap(),
        italic: Regex::new(r"\*([^*]+)\*").unwrap(), // adjacency filter applied below
        code: Regex::new(r"`([^`]+)`").unwrap(),
    })
}

#[derive(Debug, Clone)]
struct Match {
    part_type: ContentPartType,
    start: usize,
    end: usize,
    full: String,
    inner: String,
}

fn collect(matches: &mut Vec<Match>, re: &Regex, part_type: ContentPartType, text: &str) {
    let italic = part_type == ContentPartType::Italic;
    // Manual scan (NOT captures_iter): JS's lookaround is zero-width, so a
    // candidate rejected by the adjacency filter must NOT consume its span
    // — scanning resumes one byte after its start, exactly like the JS
    // regex engine advancing past a failed lookbehind.
    let mut pos = 0usize;
    while pos < text.len() {
        let Some(caps) = re.captures_at(text, pos) else {
            break;
        };
        let whole = caps.get(0).unwrap();
        if italic {
            // Replicates (?<!\*)…(?!\*): reject when a '*' directly
            // precedes the match or directly follows it.
            let before = whole.start() > 0 && text.as_bytes()[whole.start() - 1] == b'*';
            let after = text.as_bytes().get(whole.end()) == Some(&b'*');
            if before || after {
                pos = whole.start() + 1;
                continue;
            }
        }
        let inner = caps.get(1).map(|m| m.as_str()).unwrap_or(whole.as_str());
        matches.push(Match {
            part_type,
            start: whole.start(),
            end: whole.end(),
            full: whole.as_str().to_string(),
            inner: inner.to_string(),
        });
        pos = whole.end();
    }
}

fn collect_inline(text: &str) -> Vec<Match> {
    let p = patterns();
    let mut out = Vec::new();
    collect(&mut out, &p.url, ContentPartType::Url, text);
    collect(&mut out, &p.hashtag, ContentPartType::Hashtag, text);
    collect(&mut out, &p.cashtag, ContentPartType::Cashtag, text);
    collect(&mut out, &p.mention, ContentPartType::Mention, text);
    out
}

fn collect_all(text: &str) -> Vec<Match> {
    let p = patterns();
    let mut out = Vec::new();
    collect(&mut out, &p.bold, ContentPartType::Bold, text);
    collect(&mut out, &p.italic, ContentPartType::Italic, text);
    collect(&mut out, &p.code, ContentPartType::Code, text);
    out.extend(collect_inline(text));
    out
}

/// Sort by position; on ties the longer match wins (bold over italic).
/// Then drop overlaps — the first (longest) match at each position wins.
fn filter_overlaps(mut matches: Vec<Match>) -> Vec<Match> {
    matches.sort_by(|a, b| {
        a.start
            .cmp(&b.start)
            .then((b.end - b.start).cmp(&(a.end - a.start)))
    });
    let mut filtered = Vec::new();
    let mut last_end = 0usize;
    for m in matches {
        if m.start >= last_end {
            last_end = m.end;
            filtered.push(m);
        }
    }
    filtered
}

fn build_parts(text: &str, filtered: &[Match], recurse_formatting: bool) -> Vec<ContentPart> {
    let mut parts = Vec::new();
    let mut cursor = 0usize;
    for m in filtered {
        if m.start > cursor {
            parts.push(ContentPart {
                part_type: ContentPartType::Text,
                value: text[cursor..m.start].to_string(),
                children: None,
            });
        }
        let formatting = matches!(
            m.part_type,
            ContentPartType::Bold | ContentPartType::Italic | ContentPartType::Code
        );
        if formatting && recurse_formatting {
            parts.push(ContentPart {
                part_type: m.part_type,
                value: m.inner.clone(),
                children: Some(parse_inline_content(&m.inner)),
            });
        } else {
            parts.push(ContentPart {
                part_type: m.part_type,
                value: if formatting {
                    m.inner.clone()
                } else {
                    m.full.clone()
                },
                children: None,
            });
        }
        cursor = m.end;
    }
    if cursor < text.len() {
        parts.push(ContentPart {
            part_type: ContentPartType::Text,
            value: text[cursor..].to_string(),
            children: None,
        });
    }
    parts
}

/// Inline elements only — used for the inner content of bold/italic/code.
fn parse_inline_content(text: &str) -> Vec<ContentPart> {
    let filtered = filter_overlaps(collect_inline(text));
    build_parts(text, &filtered, false)
}

/// Parse post content into styled segments. Formatting segments
/// (bold/italic/code) carry parsed inline children.
pub fn parse_post_content(content: &str) -> Vec<ContentPart> {
    if content.is_empty() {
        return Vec::new();
    }
    let filtered = filter_overlaps(collect_all(content));
    build_parts(content, &filtered, true)
}
